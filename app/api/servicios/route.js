import { NextResponse } from 'next/server';
import db from '@/lib/turso';
import { extractUserFromRequest } from '@/lib/auth';
import { registrarAuditoria } from '@/lib/audit';
import { normalizarCedula } from '@/lib/territory';

export const dynamic = 'force-dynamic';

// Asegurar que las tablas de Servicios y Jornadas existan
export async function asegurarTablasServicios() {
  const now = new Date().toISOString();

  // 1. Catálogo de Servicios Comunitarios
  await db.execute(`
    CREATE TABLE IF NOT EXISTS servicios_catalogo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE NOT NULL,
      categoria TEXT NOT NULL DEFAULT 'GAS',
      nombre TEXT NOT NULL,
      descripcion TEXT,
      precio_usd REAL NOT NULL DEFAULT 1.0,
      alicuota_autogestion_usd REAL NOT NULL DEFAULT 0.0,
      activo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 2. Jornadas de Servicios Comunitarios (Gas, CLAP, etc.)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS jornadas_servicios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE NOT NULL,
      titulo TEXT NOT NULL,
      categoria TEXT NOT NULL DEFAULT 'GAS',
      descripcion TEXT,
      fecha_inicio TEXT NOT NULL,
      fecha_cierre TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'ABIERTA',
      max_unidades_por_familia INTEGER NOT NULL DEFAULT 2,
      items_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 3. Declaraciones de Aportes de los Vecinos para la Jornada
  await db.execute(`
    CREATE TABLE IF NOT EXISTS jornadas_solicitudes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo_recibo TEXT UNIQUE NOT NULL,
      jornada_id INTEGER NOT NULL,
      vecino_id INTEGER,
      cedula TEXT NOT NULL,
      nombres_apellidos TEXT NOT NULL,
      vereda TEXT NOT NULL,
      casa TEXT NOT NULL,
      telefono TEXT,
      items_json TEXT NOT NULL,
      total_unidades INTEGER NOT NULL,
      total_usd REAL NOT NULL,
      total_bs REAL NOT NULL,
      alicuota_total_usd REAL NOT NULL DEFAULT 0,
      alicuota_total_bs REAL NOT NULL DEFAULT 0,
      tasa_bcv REAL NOT NULL,
      banco_origen_id INTEGER,
      banco_nombre TEXT,
      numero_transferencia TEXT NOT NULL,
      fecha_pago TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'DECLARADO',
      notas TEXT,
      verificado_por TEXT,
      verificado_en TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Semilla inicial del catálogo de Gas si está vacío
  const checkCat = await db.execute('SELECT COUNT(*) as total FROM servicios_catalogo');
  const totalCat = Number(checkCat.rows[0]?.total || 0);
  if (totalCat === 0) {
    const defaultServices = [
      ['GAS_10KG', 'GAS', 'GAS BOMBONA DE 10 KG', 'Cilindro doméstico GLP de 10 Kilogramos', 1.50, 0.50],
      ['GAS_18KG', 'GAS', 'GAS BOMBONA 18 KG', 'Cilindro doméstico GLP de 18 Kilogramos', 2.50, 0.75],
      ['GAS_43KG', 'GAS', 'GAS BOMBONA 43 KG', 'Cilindro doméstico GLP de 43 Kilogramos', 6.00, 1.50],
    ];

    for (const [cod, cat, nom, desc, pre, ali] of defaultServices) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO servicios_catalogo (codigo, categoria, nombre, descripcion, precio_usd, alicuota_autogestion_usd, activo, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        args: [cod, cat, nom, desc, pre, ali, now, now]
      });
    }

    // Crear primera jornada de Gas abierta por defecto
    const itemsJornada = [
      { id: 1, codigo: 'GAS_10KG', nombre: 'GAS BOMBONA DE 10 KG', precio_usd: 1.50, alicuota_autogestion_usd: 0.50 },
      { id: 2, codigo: 'GAS_18KG', nombre: 'GAS BOMBONA 18 KG', precio_usd: 2.50, alicuota_autogestion_usd: 0.75 },
      { id: 3, codigo: 'GAS_43KG', nombre: 'GAS BOMBONA 43 KG', precio_usd: 6.00, alicuota_autogestion_usd: 1.50 },
    ];

    const hoy = now.split('T')[0];
    const en15Dias = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];

    await db.execute({
      sql: `INSERT OR IGNORE INTO jornadas_servicios (codigo, titulo, categoria, descripcion, fecha_inicio, fecha_cierre, estado, max_unidades_por_familia, items_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 'ABIERTA', 2, ?, ?, ?)`,
      args: [
        'JORNADA-GAS-OFICIAL',
        'Jornada Comunitaria de Gas Doméstico GLP',
        'GAS',
        'Recarga y distribución comunitaria de gas doméstico en articulación con GasDrácula / PDVSA Gas Comunal. Incluye alícuota de autogestión para logística y transporte local.',
        hoy,
        en15Dias,
        JSON.stringify(itemsJornada),
        now,
        now
      ]
    });
  }
}

function generarCodigoRecibo(categoria = 'GAS') {
  const prefijo = categoria === 'GAS' ? 'REC-GAS' : 'REC-SRV';
  const aleatorio = Math.floor(10000 + Math.random() * 90000);
  const ano = new Date().getFullYear();
  return `${prefijo}-${ano}-${aleatorio}`;
}

export async function GET(request) {
  try {
    await asegurarTablasServicios();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'resumen';

    // 1. Catálogo completo de servicios
    if (action === 'catalogo') {
      const res = await db.execute('SELECT *, precio_usd as costo_base_usd FROM servicios_catalogo ORDER BY categoria ASC, id ASC');
      const rows = res.rows.map(r => ({
        ...r,
        precio_usd: Number(r.precio_usd || 0),
        costo_base_usd: Number(r.precio_usd || 0),
        alicuota_autogestion_usd: Number(r.alicuota_autogestion_usd || 0),
        activo: Number(r.activo)
      }));
      return NextResponse.json({ catalogo: rows, servicios: rows });
    }

    // 2. Lista de Jornadas de Servicios
    if (action === 'jornadas') {
      const res = await db.execute(`
        SELECT j.*, j.fecha_cierre as fecha_fin,
               (SELECT COUNT(*) FROM jornadas_solicitudes s WHERE s.jornada_id = j.id) as total_solicitudes
        FROM jornadas_servicios j
        ORDER BY j.id DESC
      `);
      return NextResponse.json({ jornadas: res.rows });
    }

    // 3. Jornada Activa para que los vecinos soliciten
    if (action === 'jornada_activa') {
      const cat = searchParams.get('categoria') || '';
      let sql = "SELECT *, fecha_cierre as fecha_fin FROM jornadas_servicios WHERE UPPER(estado) IN ('ABIERTA', 'ACTIVA', 'EN_ESPERA')";
      const args = [];
      if (cat) {
        sql += " AND UPPER(categoria) = ?";
        args.push(cat.toUpperCase());
      }
      sql += " ORDER BY id DESC LIMIT 1";
      const res = await db.execute({ sql, args });
      const jornada = res.rows[0] || null;

      if (jornada) {
        // Enlazar EXCLUSIVAMENTE con los modelos activos vigentes del catálogo (activo = 1)
        const catRes = await db.execute('SELECT * FROM servicios_catalogo WHERE activo = 1 ORDER BY id ASC');
        const catByCodigo = new Map();
        const catById = new Map();
        catRes.rows.forEach(c => {
          if (c.codigo) catByCodigo.set(String(c.codigo).toUpperCase().trim(), c);
          catById.set(String(c.id), c);
        });

        let rawItems = [];
        try {
          rawItems = typeof jornada.items_json === 'string' ? JSON.parse(jornada.items_json) : (jornada.items_json || []);
        } catch (e) {
          rawItems = [];
        }

        const seenKeys = new Set();
        const items = [];

        // 1. Filtrar los items de la jornada:
        // OBLIGATORIO: Solo incluir items que existan y estén ACTIVOS en servicios_catalogo (activo = 1)
        // OBLIGATORIO: Si el item tiene código, buscar ÚNICAMENTE por código en el catálogo.
        // NUNCA usar id como fallback si tiene código para evitar que un ID desactualizado coincida con otro cilindro.
        if (Array.isArray(rawItems) && rawItems.length > 0) {
          for (const it of rawItems) {
            let match = null;
            if (it.codigo) {
              match = catByCodigo.get(String(it.codigo).toUpperCase().trim());
            } else if (it.id) {
              match = catById.get(String(it.id));
            }

            // Si el item fue desactivado (activo = 0) o no existe en catálogo activo, SE DESCARTA
            if (!match || (match.activo !== 1 && match.activo !== true && match.activo !== '1')) {
              continue;
            }

            // Deduplicación estricta por código (o id si no tiene código)
            const dedupeKey = String(match.codigo || match.id).toUpperCase().trim();
            if (seenKeys.has(dedupeKey)) continue;
            seenKeys.add(dedupeKey);

            items.push({
              id: match.id,
              codigo: match.codigo,
              categoria: match.categoria,
              nombre: match.nombre,
              descripcion: match.descripcion || '',
              precio_usd: Number(match.precio_usd || 0),
              costo_base_usd: Number(match.precio_usd || 0),
              alicuota_autogestion_usd: Number(match.alicuota_autogestion_usd || 0),
              activo: 1,
            });
          }
        }

        // 2. Si la jornada es de una categoría particular (ej. GAS) y en el catálogo hay servicios activos adicionales de esa categoría
        // o si items_json quedó vacío, incorporamos los cilindros activos del catálogo
        const categoriaTarget = (jornada.categoria || cat || 'GAS').toUpperCase();
        catRes.rows
          .filter(c => !categoriaTarget || c.categoria?.toUpperCase() === categoriaTarget)
          .forEach(c => {
            const dedupeKey = String(c.codigo || c.id).toUpperCase().trim();
            if (!seenKeys.has(dedupeKey)) {
              seenKeys.add(dedupeKey);
              items.push({
                id: c.id,
                codigo: c.codigo,
                categoria: c.categoria,
                nombre: c.nombre,
                descripcion: c.descripcion || '',
                precio_usd: Number(c.precio_usd || 0),
                costo_base_usd: Number(c.precio_usd || 0),
                alicuota_autogestion_usd: Number(c.alicuota_autogestion_usd || 0),
                activo: 1,
              });
            }
          });

        jornada.items_json = JSON.stringify(items);
        return NextResponse.json({ activa: true, jornada });
      }

      return NextResponse.json({ activa: false, jornada: null });
    }

    // 4. Solicitudes de una Jornada (para administración)
    if (action === 'solicitudes') {
      const jornadaId = searchParams.get('jornada_id');
      let sql = 'SELECT * FROM jornadas_solicitudes';
      const args = [];
      if (jornadaId) {
        sql += ' WHERE jornada_id = ?';
        args.push(Number(jornadaId));
      }
      sql += ' ORDER BY id DESC';
      const res = await db.execute({ sql, args });
      return NextResponse.json({ solicitudes: res.rows });
    }

    // 5. Historial de Aportes de un Vecino (Tanto constancias como jornadas de servicios)
    if (action === 'historial_vecino') {
      const cedulaRaw = searchParams.get('cedula');
      if (!cedulaRaw) {
        return NextResponse.json({ error: 'Cédula es requerida' }, { status: 400 });
      }
      const cedula = normalizarCedula(cedulaRaw);

      // Aportes de Jornadas de Servicios
      const srvRes = await db.execute({
        sql: `SELECT s.*, j.titulo as jornada_titulo, j.categoria as jornada_categoria
              FROM jornadas_solicitudes s
              LEFT JOIN jornadas_servicios j ON j.id = s.jornada_id
              WHERE s.cedula = ?
              ORDER BY s.id DESC`,
        args: [cedula]
      });

      // Aportes de Documentos y Constancias
      const docRes = await db.execute({
        sql: `SELECT id, codigo_qr, tipo_documento, nombres_apellidos, vereda, casa,
                     fecha_emision, fecha_pago, banco_nombre, numero_transferencia,
                     monto_bs, monto_usd, tasa_bcv, es_exonerado, motivo_exoneracion, estado
              FROM documentos_solicitudes
              WHERE cedula = ?
              ORDER BY id DESC`,
        args: [cedula]
      });

      return NextResponse.json({
        cedula,
        servicios: srvRes.rows,
        documentos: docRes.rows,
      });
    }

    // Por defecto: catálogo y jornadas
    const [catRes, jorRes] = await Promise.all([
      db.execute('SELECT * FROM servicios_catalogo WHERE activo = 1 ORDER BY categoria ASC, id ASC'),
      db.execute('SELECT * FROM jornadas_servicios ORDER BY id DESC'),
    ]);

    return NextResponse.json({
      catalogo: catRes.rows,
      jornadas: jorRes.rows,
    });
  } catch (err) {
    console.error('Error en /api/servicios GET:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await asegurarTablasServicios();
    const body = await request.json();
    const { action } = body;
    const now = new Date().toISOString();

    // ==============================================================
    // A. VECINO: DECLARACIÓN DE APORTE PARA JORNADA DE SERVICIOS
    // ==============================================================
    if (action === 'declarar_pago') {
      const {
        jornada_id,
        cedula,
        items, // Array de { id, codigo, nombre, cantidad, precio_usd, alicuota_autogestion_usd }
        banco_origen_id,
        banco_nombre,
        numero_transferencia,
        fecha_pago,
        tasa_bcv,
        telefono,
      } = body;

      if (!jornada_id || !cedula || !items || !Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: 'Faltan datos obligatorios para la declaración' }, { status: 400 });
      }

      if (!numero_transferencia || !fecha_pago) {
        return NextResponse.json({ error: 'N° de Referencia y Fecha de Pago son requeridos' }, { status: 400 });
      }

      const normCedula = normalizarCedula(cedula);

      // 1. Verificar si el vecino existe en el censo / padrón
      const vecRes = await db.execute({
        sql: 'SELECT * FROM vecinos WHERE cedula = ? LIMIT 1',
        args: [normCedula]
      });

      if (vecRes.rows.length === 0) {
        return NextResponse.json({
          error: 'No se encuentra registrado en el censo comunal. Debe estar censado para solicitar servicios.'
        }, { status: 404 });
      }

      const vecino = vecRes.rows[0];

      // 2. Obtener la jornada y verificar que esté ABIERTA
      const jorRes = await db.execute({
        sql: 'SELECT * FROM jornadas_servicios WHERE id = ? LIMIT 1',
        args: [Number(jornada_id)]
      });

      if (jorRes.rows.length === 0) {
        return NextResponse.json({ error: 'Jornada de servicios no encontrada' }, { status: 404 });
      }

      const jornada = jorRes.rows[0];
      const estJornada = (jornada.estado || '').toUpperCase();
      if (estJornada !== 'ABIERTA' && estJornada !== 'ACTIVA') {
        return NextResponse.json({ error: 'Esta jornada de servicios no se encuentra abierta para recepción de pagos' }, { status: 400 });
      }

      // 3. Validar límite máximo de unidades por familia del censo
      const maxPermitido = Number(jornada.max_unidades_por_familia) || 2;
      const totalUnidadesSolicitadas = items.reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0);

      if (totalUnidadesSolicitadas <= 0) {
        return NextResponse.json({ error: 'Debe seleccionar al menos 1 unidad de servicio' }, { status: 400 });
      }

      // Validar si ya declaró previamente en esta jornada para su familia (misma vereda y casa o misma cédula)
      const prevDeclaraciones = await db.execute({
        sql: `SELECT SUM(total_unidades) as total_previo
              FROM jornadas_solicitudes
              WHERE jornada_id = ? AND (cedula = ? OR (vereda = ? AND casa = ?)) AND estado != 'RECHAZADO'`,
        args: [jornada.id, normCedula, vecino.vereda, vecino.casa]
      });

      const totalPrevio = Number(prevDeclaraciones.rows[0]?.total_previo || 0);
      if (totalPrevio + totalUnidadesSolicitadas > maxPermitido) {
        const disponibles = Math.max(0, maxPermitido - totalPrevio);
        return NextResponse.json({
          error: `Límite por familia superado. En esta jornada cada vivienda puede solicitar máximo ${maxPermitido} unidades en total (Ya tiene ${totalPrevio} registradas. Cupo restante disponible: ${disponibles}).`
        }, { status: 400 });
      }

      // 4. Calcular importes financieros con tasa BCV
      const tasa = Number(tasa_bcv) > 0 ? Number(tasa_bcv) : 875.65;
      let totalUsd = 0;
      let totalAlicuotaUsd = 0;

      const itemsDetallados = items.map(it => {
        const cant = Number(it.cantidad) || 0;
        const pu = Number(it.precio_usd) || 0;
        const ali = Number(it.alicuota_autogestion_usd) || 0;
        const subUsd = cant * pu;
        const subAliUsd = cant * ali;
        const subBs = subUsd * tasa;
        totalUsd += subUsd;
        totalAlicuotaUsd += subAliUsd;
        return {
          id: it.id,
          codigo: it.codigo,
          nombre: it.nombre,
          cantidad: cant,
          precio_unitario_usd: pu,
          alicuota_unitario_usd: ali,
          subtotal_usd: Number(subUsd.toFixed(2)),
          subtotal_bs: Number(subBs.toFixed(2)),
        };
      });

      const totalBs = Number((totalUsd * tasa).toFixed(2));
      const totalAlicuotaBs = Number((totalAlicuotaUsd * tasa).toFixed(2));
      const codigoRecibo = generarCodigoRecibo(jornada.categoria);

      // 5. Insertar declaración de aporte
      const insertRes = await db.execute({
        sql: `INSERT INTO jornadas_solicitudes (
          codigo_recibo, jornada_id, vecino_id, cedula, nombres_apellidos,
          vereda, casa, telefono, items_json, total_unidades,
          total_usd, total_bs, alicuota_total_usd, alicuota_total_bs,
          tasa_bcv, banco_origen_id, banco_nombre, numero_transferencia,
          fecha_pago, estado, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DECLARADO', ?, ?)`,
        args: [
          codigoRecibo,
          jornada.id,
          vecino.id,
          normCedula,
          `${vecino.nombres} ${vecino.apellidos}`.trim(),
          vecino.vereda,
          vecino.casa,
          telefono || vecino.telefono || '',
          JSON.stringify(itemsDetallados),
          totalUnidadesSolicitadas,
          Number(totalUsd.toFixed(2)),
          totalBs,
          Number(totalAlicuotaUsd.toFixed(2)),
          totalAlicuotaBs,
          tasa,
          banco_origen_id || null,
          banco_nombre || 'N/A',
          numero_transferencia,
          fecha_pago,
          now,
          now,
        ]
      });

      await registrarAuditoria({
        tipo_evento: 'DECLARACION_APORTE_SERVICIO',
        usuario_id: null,
        usuario_nombre: `${vecino.nombres} ${vecino.apellidos}`.trim(),
        vecino_id: vecino.id,
        cedula: normCedula,
        codigo_documento: codigoRecibo,
        request,
        detalles: {
          jornada: jornada.titulo,
          codigo_recibo: codigoRecibo,
          unidades: totalUnidadesSolicitadas,
          total_usd: totalUsd,
          total_bs: totalBs,
          alicuota_autogestion_bs: totalAlicuotaBs,
          referencia: numero_transferencia,
          accion: `Declaró aporte para ${jornada.titulo} (${totalUnidadesSolicitadas} unidades) por Bs. ${totalBs.toFixed(2)}`
        }
      });

      return NextResponse.json({
        success: true,
        mensaje: 'Aporte de servicio declarado exitosamente',
        recibo: {
          codigo_recibo: codigoRecibo,
          jornada_titulo: jornada.titulo,
          solicitante: `${vecino.nombres} ${vecino.apellidos}`.trim(),
          cedula: normCedula,
          vereda: vecino.vereda,
          casa: vecino.casa,
          unidades: totalUnidadesSolicitadas,
          total_usd: totalUsd,
          total_bs: totalBs,
          alicuota_autogestion_bs: totalAlicuotaBs,
          referencia: numero_transferencia,
          fecha_pago,
        }
      });
    }

    // ==============================================================
    // B. ADMINISTRACIÓN: GESTIÓN DE CATÁLOGO Y JORNADAS
    // ==============================================================
    const currentUser = extractUserFromRequest(request);
    if (!currentUser || (currentUser.rol !== 'SUPER_ADMIN' && currentUser.rol !== 'ADMIN')) {
      return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
    }

    // 1. Crear nuevo Servicio en el Catálogo
    if (action === 'crear_servicio') {
      const { codigo, categoria, nombre, descripcion, precio_usd, costo_base_usd, alicuota_autogestion_usd } = body;
      const precioFinal = precio_usd !== undefined ? precio_usd : costo_base_usd;
      if (!nombre || precioFinal === undefined || precioFinal === null) {
        return NextResponse.json({ error: 'Nombre y Precio en USD son obligatorios' }, { status: 400 });
      }

      const codFinal = (codigo || nombre.replace(/\s+/g, '_')).toUpperCase();

      await db.execute({
        sql: `INSERT INTO servicios_catalogo (codigo, categoria, nombre, descripcion, precio_usd, alicuota_autogestion_usd, activo, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        args: [
          codFinal,
          (categoria || 'GAS').toUpperCase(),
          nombre,
          descripcion || '',
          Number(precioFinal),
          Number(alicuota_autogestion_usd || 0),
          now,
          now
        ]
      });

      await registrarAuditoria({
        tipo_evento: 'CONFIGURACION_SERVICIO_CREADO',
        usuario_id: currentUser.id,
        usuario_nombre: currentUser.nombre,
        request,
        detalles: { accion: `Creó servicio "${nombre}" en catálogo con costo $${precioFinal} y alícuota $${alicuota_autogestion_usd || 0}` }
      });

      return NextResponse.json({ success: true, message: 'Servicio creado exitosamente en el catálogo' });
    }

    // 2. Editar Servicio del Catálogo
    if (action === 'editar_servicio') {
      const { id, nombre, categoria, descripcion, precio_usd, costo_base_usd, alicuota_autogestion_usd, activo } = body;
      const precioFinal = precio_usd !== undefined ? precio_usd : costo_base_usd;
      if (!id || !nombre) {
        return NextResponse.json({ error: 'ID y Nombre son obligatorios' }, { status: 400 });
      }

      await db.execute({
        sql: `UPDATE servicios_catalogo
              SET nombre = ?, categoria = ?, descripcion = ?, precio_usd = ?, alicuota_autogestion_usd = ?, activo = ?, updated_at = ?
              WHERE id = ?`,
        args: [
          nombre,
          (categoria || 'GAS').toUpperCase(),
          descripcion || '',
          Number(precioFinal !== undefined ? precioFinal : 1.0),
          Number(alicuota_autogestion_usd || 0),
          activo !== undefined ? (activo ? 1 : 0) : 1,
          now,
          Number(id)
        ]
      });

      return NextResponse.json({ success: true, message: 'Servicio actualizado correctamente' });
    }

    // 3. Crear Nueva Jornada de Servicios
    if (action === 'crear_jornada') {
      const { titulo, categoria, descripcion, fecha_inicio, fecha_cierre, max_unidades_por_familia, items } = body;
      if (!titulo || !titulo.trim()) {
        return NextResponse.json({ error: 'Título de la jornada es obligatorio' }, { status: 400 });
      }

      let itemsList = items;
      if (!itemsList || !Array.isArray(itemsList) || itemsList.length === 0) {
        const catItemsRes = await db.execute({
          sql: 'SELECT * FROM servicios_catalogo WHERE activo = 1 AND UPPER(categoria) = ?',
          args: [(categoria || 'GAS').toUpperCase()]
        });
        itemsList = catItemsRes.rows.map(c => ({
          id: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          precio_usd: Number(c.precio_usd || 0),
          alicuota_autogestion_usd: Number(c.alicuota_autogestion_usd || 0)
        }));
      }

      const codJornada = `JOR-${(categoria || 'GAS').toUpperCase()}-${Date.now().toString().slice(-6)}`;

      await db.execute({
        sql: `INSERT INTO jornadas_servicios (
          codigo, titulo, categoria, descripcion, fecha_inicio, fecha_cierre,
          estado, max_unidades_por_familia, items_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVA', ?, ?, ?, ?)`,
        args: [
          codJornada,
          titulo,
          (categoria || 'GAS').toUpperCase(),
          descripcion || 'Distribución y recarga comunitaria.',
          fecha_inicio || now.split('T')[0],
          fecha_cierre || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
          Number(max_unidades_por_familia) || 2,
          JSON.stringify(itemsList),
          now,
          now
        ]
      });

      await registrarAuditoria({
        tipo_evento: 'JORNADA_SERVICIO_CREADA',
        usuario_id: currentUser.id,
        usuario_nombre: currentUser.nombre,
        request,
        detalles: {
          titulo,
          codigo: codJornada,
          categoria,
          max_unidades_por_familia,
          accion: `Creó nueva Jornada Comunitaria: "${titulo}" con límite de ${max_unidades_por_familia} unidades por familia.`
        }
      });

      return NextResponse.json({ success: true, message: 'Jornada creada y abierta exitosamente' });
    }

    // 4. Editar Jornada de Servicios Existente
    if (action === 'editar_jornada') {
      const { id, titulo, categoria, descripcion, fecha_inicio, fecha_cierre, fecha_fin, max_unidades_por_familia, estado, items } = body;
      if (!id || !titulo || !titulo.trim()) {
        return NextResponse.json({ error: 'ID y Título de la jornada son obligatorios' }, { status: 400 });
      }

      const fInicio = (fecha_inicio || '').trim() || 'A la espera de asignación de fecha';
      const fCierre = fecha_cierre || fecha_fin || '';
      let estFinal = (estado || 'ACTIVA').toUpperCase();
      if (estFinal === 'ABIERTA') estFinal = 'ACTIVA';

      let updateSql = `UPDATE jornadas_servicios
                       SET titulo = ?, categoria = ?, descripcion = ?, fecha_inicio = ?, fecha_cierre = ?,
                           max_unidades_por_familia = ?, estado = ?, updated_at = ?`;
      const updateArgs = [
        titulo.trim(),
        (categoria || 'GAS').toUpperCase(),
        descripcion || '',
        fInicio,
        fCierre,
        Number(max_unidades_por_familia) || 2,
        estFinal,
        now,
      ];

      if (items && Array.isArray(items) && items.length > 0) {
        updateSql += `, items_json = ?`;
        updateArgs.push(JSON.stringify(items));
      }

      updateSql += ` WHERE id = ?`;
      updateArgs.push(Number(id));

      await db.execute({ sql: updateSql, args: updateArgs });

      await registrarAuditoria({
        tipo_evento: 'JORNADA_SERVICIO_EDITADA',
        usuario_id: currentUser.id,
        usuario_nombre: currentUser.nombre,
        request,
        detalles: {
          jornada_id: id,
          titulo,
          fecha_inicio: fInicio,
          fecha_cierre: fCierre,
          estado: estFinal,
          max_unidades_por_familia,
          accion: `Modificó jornada #${id} ("${titulo}"): Fechas [${fInicio} a ${fCierre || 'N/A'}], Estado [${estFinal}]`
        }
      });

      return NextResponse.json({ success: true, message: 'Jornada actualizada exitosamente' });
    }

    // 5. Eliminar Jornada de Servicios (Solo SUPER_ADMIN)
    if (action === 'eliminar_jornada') {
      if (!currentUser || currentUser.rol !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Acceso restringido: Solo el SUPER_ADMIN puede eliminar jornadas comunales' }, { status: 403 });
      }
      const { id, forzar } = body;
      if (!id) {
        return NextResponse.json({ error: 'ID de la jornada es obligatorio' }, { status: 400 });
      }

      // Verificar si tiene solicitudes declaradas por vecinos
      const checkSol = await db.execute({
        sql: 'SELECT COUNT(*) as total FROM jornadas_solicitudes WHERE jornada_id = ?',
        args: [Number(id)]
      });
      const totalSol = Number(checkSol.rows[0]?.total || 0);

      if (totalSol > 0 && !forzar) {
        return NextResponse.json({
          error: `Esta jornada cuenta con ${totalSol} aporte(s) o solicitud(es) registrada(s) por vecinos. Para no comprometer la contraloría comunal, se recomienda Desactivarla/Cerrarla en lugar de eliminarla. Si realmente desea borrarla con todo su historial, active la confirmación forzada.`,
          requiere_confirmacion: true,
          total_solicitudes: totalSol
        }, { status: 400 });
      }

      const infoJor = await db.execute({
        sql: 'SELECT titulo FROM jornadas_servicios WHERE id = ?',
        args: [Number(id)]
      });
      const tituloJor = infoJor.rows[0]?.titulo || `Jornada #${id}`;

      if (totalSol > 0 && forzar) {
        await db.execute({
          sql: 'DELETE FROM jornadas_solicitudes WHERE jornada_id = ?',
          args: [Number(id)]
        });
      }

      await db.execute({
        sql: 'DELETE FROM jornadas_servicios WHERE id = ?',
        args: [Number(id)]
      });

      await registrarAuditoria({
        tipo_evento: 'JORNADA_SERVICIO_ELIMINADA',
        usuario_id: currentUser.id,
        usuario_nombre: currentUser.nombre,
        request,
        detalles: {
          jornada_id: id,
          titulo: tituloJor,
          solicitudes_afectadas: totalSol,
          accion: `Eliminó la jornada comunitaria #${id} ("${tituloJor}") con ${totalSol} solicitudes asociadas`
        }
      });

      return NextResponse.json({ success: true, message: 'Jornada eliminada exitosamente' });
    }

    // 6. Cambiar Estado de la Jornada (ACTIVA, EN_ESPERA, CERRADA)
    if (action === 'cambiar_estado_jornada') {
      const { id, estado } = body;
      if (!id || !estado) {
        return NextResponse.json({ error: 'ID y Estado son obligatorios' }, { status: 400 });
      }

      let nuevoEstado = estado.toUpperCase();
      if (nuevoEstado === 'ABIERTA') nuevoEstado = 'ACTIVA';
      if (nuevoEstado !== 'ACTIVA' && nuevoEstado !== 'EN_ESPERA' && nuevoEstado !== 'CERRADA') {
        nuevoEstado = 'CERRADA';
      }

      await db.execute({
        sql: 'UPDATE jornadas_servicios SET estado = ?, updated_at = ? WHERE id = ?',
        args: [nuevoEstado, now, Number(id)]
      });

      await registrarAuditoria({
        tipo_evento: 'ESTADO_JORNADA_SERVICIO_ACTUALIZADO',
        usuario_id: currentUser.id,
        usuario_nombre: currentUser.nombre,
        request,
        detalles: {
          jornada_id: id,
          nuevo_estado: nuevoEstado,
          accion: `Cambió estado de jornada #${id} a ${nuevoEstado}`
        }
      });

      return NextResponse.json({ success: true, message: `Jornada cambiada a estado ${nuevoEstado}`, nuevo_estado: nuevoEstado });
    }

    // 5. Cambiar Estado de una Declaración de Aporte de Vecino (VERIFICADO, ENTREGADO, RECHAZADO)
    if (action === 'cambiar_estado_solicitud') {
      const { id, estado, notas } = body;
      if (!id || !estado) {
        return NextResponse.json({ error: 'ID y Estado son obligatorios' }, { status: 400 });
      }

      await db.execute({
        sql: `UPDATE jornadas_solicitudes
              SET estado = ?, notas = COALESCE(?, notas), verificado_por = ?, verificado_en = ?, updated_at = ?
              WHERE id = ?`,
        args: [
          estado.toUpperCase(),
          notas || null,
          currentUser.nombre || currentUser.username,
          now,
          now,
          Number(id)
        ]
      });

      await registrarAuditoria({
        tipo_evento: 'ESTADO_APORTE_SERVICIO_ACTUALIZADO',
        usuario_id: currentUser.id,
        usuario_nombre: currentUser.nombre,
        request,
        detalles: {
          solicitud_id: id,
          nuevo_estado: estado,
          accion: `Actualizó declaración de aporte #${id} a estado ${estado}`
        }
      });

      return NextResponse.json({ success: true, message: `Declaración actualizada a ${estado}` });
    }

    return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
  } catch (err) {
    console.error('Error en /api/servicios POST:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import db from '@/lib/turso';
import {
  normalizarCedula, esCasaValida, getCasasPorVereda, normalizarCasaVereda,
  decodificarParentesco, decodificarInstruccion, decodificarSalud
} from '@/lib/territory';
import { extractUserFromRequest, hasPermission } from '@/lib/auth';
import { registrarAuditoria } from '@/lib/audit';
import { asegurarTablaCatalogos } from '@/app/api/catalogos/route';
import { cargarTerritorio } from '@/lib/territoryServer';

export const dynamic = 'force-dynamic';

async function obtenerMapasCatalogos() {
  const mapas = { parentesco: {}, instruccion: {}, salud: {} };
  try {
    await asegurarTablaCatalogos();
    const res = await db.execute('SELECT tipo, codigo, descripcion FROM catalogos_sistema WHERE activo = 1');
    res.rows.forEach(r => {
      const t = String(r.tipo).toLowerCase();
      const c = String(r.codigo).toLowerCase();
      if (mapas[t]) {
        mapas[t][c] = String(r.descripcion);
      }
    });
  } catch (e) {
    console.warn('Error cargando catalogos dinámicos en vecinos/route.js:', e);
  }
  return mapas;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cedula = searchParams.get('cedula');

    // 1. Consulta pública por cédula (desde la página principal o validador)
    if (cedula) {
      const norm = normalizarCedula(cedula);
      const res = await db.execute({
        sql: `SELECT id, cedula, nombres, apellidos, vereda, casa, tiempo_residencia,
          calidad_tenencia, telefono, email, sexo, fecha_nacimiento,
          estado_aprobacion, aprobado_por_nombre, aprobado_en
          FROM vecinos WHERE cedula = ? LIMIT 1`,
        args: [norm]
      });

      if (res.rows.length === 0) {
        return NextResponse.json({ encontrado: false, cedula: norm });
      }

      const v = res.rows[0];
      return NextResponse.json({
        encontrado: true,
        vecino: v,
        aprobado: v.estado_aprobacion === 'APROBADO',
        pendiente: v.estado_aprobacion === 'PENDIENTE',
      });
    }

    // 2. Consulta para Dashboard (Listado de vecinos con filtros)
    const currentUser = extractUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const vereda = searchParams.get('vereda') || '';
    const casa = searchParams.get('casa') || '';
    const estado = searchParams.get('estado') || '';
    const q = searchParams.get('q') || '';

    let sql = `SELECT * FROM vecinos WHERE 1=1`;
    const args = [];

    if (vereda) {
      sql += ` AND vereda = ?`;
      args.push(vereda.toUpperCase());
    }
    if (casa) {
      sql += ` AND casa = ?`;
      args.push(casa.toUpperCase());
    }
    if (estado) {
      sql += ` AND estado_aprobacion = ?`;
      args.push(estado.toUpperCase());
    }
    if (q) {
      sql += ` AND (cedula LIKE ? OR nombres LIKE ? OR apellidos LIKE ?)`;
      const queryLike = `%${q}%`;
      args.push(queryLike, queryLike, queryLike);
    }

    sql += ` ORDER BY id DESC LIMIT 200`;

    const res = await db.execute({ sql, args });
    return NextResponse.json({ vecinos: res.rows });
  } catch (err) {
    console.error('Error en /api/vecinos GET:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;
    const now = new Date().toISOString();
    await cargarTerritorio();

    // A. REGISTRO PÚBLICO O DESDE DASHBOARD DE UN VECINO
    if (!action || action === 'register' || action === 'create') {
      const {
        cedula,
        nombres,
        apellidos,
        vereda,
        casa,
        tiempo_residencia,
        calidad_tenencia,
        telefono,
        email,
        sexo,
        fecha_nacimiento,
        parentesco,
        nivel_instruccion,
        instruccion,
        profesion_ocupacion,
        condicion_salud,
        salud,
        observaciones: obsCustom,
      } = body;

      if (!cedula || !nombres || !vereda || !casa) {
        return NextResponse.json({ error: 'Cédula, Nombres, Vereda y Casa son campos obligatorios' }, { status: 400 });
      }

      const normCedula = normalizarCedula(cedula);
      const vUpper = vereda.trim().toUpperCase();
      const cUpper = normalizarCasaVereda(vUpper, casa);

      // Validar que la casa sea estrictamente de las permitidas para esa vereda
      if (!esCasaValida(vUpper, cUpper)) {
        return NextResponse.json({
          error: `La casa ${cUpper} no pertenece a las casas válidas de la Vereda ${vUpper}.`
        }, { status: 400 });
      }

      // Decodificar campos demográficos si vienen con códigos o abreviaturas
      const mapasCatalogos = await obtenerMapasCatalogos();
      const finalParentesco = decodificarParentesco(parentesco || 'a', mapasCatalogos.parentesco);
      const finalInstruccion = decodificarInstruccion(nivel_instruccion || instruccion || 'c', mapasCatalogos.instruccion);
      const finalSalud = decodificarSalud(condicion_salud || salud || 'e', mapasCatalogos.salud);
      const finalOcupacion = (profesion_ocupacion || '').trim();

      const demographicData = {
        parentesco: finalParentesco,
        nivel_instruccion: finalInstruccion,
        profesion_ocupacion: finalOcupacion,
        condicion_salud: finalSalud,
      };

      const finalObservaciones = obsCustom 
        ? `${obsCustom} | ${JSON.stringify(demographicData)}`
        : JSON.stringify(demographicData);

      // Verificar si ya existe
      const existing = await db.execute({
        sql: 'SELECT id, estado_aprobacion FROM vecinos WHERE cedula = ?',
        args: [normCedula]
      });

      if (existing.rows.length > 0) {
        return NextResponse.json({
          error: `El vecino con cédula ${normCedula} ya se encuentra registrado con estatus ${existing.rows[0].estado_aprobacion}.`
        }, { status: 409 });
      }

      // Si quien crea es un usuario logueado con permiso de censo
      const currentUser = extractUserFromRequest(request);
      if (currentUser && currentUser.rol === 'CONTRALORIA' && action === 'create') {
        return NextResponse.json({
          error: 'El perfil de Contraloría solo tiene autorización para supervisar, ver y aprobar registros de vecinos, no para creación directa'
        }, { status: 403 });
      }
      let estadoInicial = 'PENDIENTE';
      let aprobadoPorId = null;
      let aprobadoPorNombre = null;
      let aprobadoEn = null;

      if (currentUser && hasPermission(currentUser, 'vecinos_crear')) {
        const canApprove = hasPermission(currentUser, 'vecinos_aprobar');
        // Si el usuario tiene permiso para aprobar directamente, o si envía estado_aprobacion
        estadoInicial = canApprove ? (body.estado_aprobacion || 'APROBADO') : (body.estado_aprobacion || 'PENDIENTE');
        if (estadoInicial === 'APROBADO') {
          aprobadoPorId = currentUser.id;
          aprobadoPorNombre = (currentUser.nombre || '').trim().toUpperCase();
          aprobadoEn = now;
        }
      }

      const res = await db.execute({
        sql: `INSERT INTO vecinos (
          cedula, nombres, apellidos, vereda, casa, tiempo_residencia,
          calidad_tenencia, telefono, email, sexo, fecha_nacimiento,
          estado_aprobacion, aprobado_por_usuario_id, aprobado_por_nombre,
          aprobado_en, observaciones, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          normCedula,
          nombres.trim().toUpperCase(),
          (apellidos || '').trim().toUpperCase(),
          vUpper,
          cUpper,
          tiempo_residencia || '',
          calidad_tenencia || 'Propia',
          telefono || '',
          email || '',
          sexo || 'M',
          fecha_nacimiento || '',
          estadoInicial,
          aprobadoPorId,
          aprobadoPorNombre,
          aprobadoEn,
          finalObservaciones,
          now,
          now,
        ]
      });

      const nuevoVecinoId = Number(res.lastInsertRowid);

      // Registrar en bitácora el alta/solicitud de registro del vecino
      await registrarAuditoria({
        tipo_evento: aprobadoPorId ? 'APROBACION_VECINO' : 'REGISTRO_VECINO',
        usuario_id: currentUser?.id || null,
        usuario_nombre: currentUser?.nombre || `${nombres.trim().toUpperCase()} ${(apellidos || '').trim().toUpperCase()}`.trim() || 'Ciudadano (Portal Público)',
        vecino_id: nuevoVecinoId,
        cedula: normCedula,
        request,
        detalles: {
          motivo: aprobadoPorId ? 'Registro directo y aprobación en Padrón Comunal' : 'Solicitud de inscripción desde Portal Público',
          nombres: `${nombres.trim().toUpperCase()} ${(apellidos || '').trim().toUpperCase()}`.trim(),
          vereda: vUpper,
          casa: cUpper,
          estado_inicial: estadoInicial,
        }
      });

      return NextResponse.json({
        success: true,
        message: estadoInicial === 'APROBADO'
          ? 'Vecino registrado y aprobado satisfactoriamente'
          : 'Vecino registrado en espera de aprobación por la vocería comunal',
        vecinoId: nuevoVecinoId,
        estado: estadoInicial,
      });
    }

    // B. APROBACIÓN DE VECINO POR ADMIN O SUPER_ADMIN (AUDITABLE)
    if (action === 'approve') {
      const currentUser = extractUserFromRequest(request);
      if (!currentUser || !hasPermission(currentUser, 'vecinos_aprobar')) {
        return NextResponse.json({ error: 'No tienes permisos para autorizar vecinos' }, { status: 403 });
      }

      const { vecinoId, cedula } = body;
      let targetId = vecinoId;

      if (!targetId && cedula) {
        const f = await db.execute({
          sql: 'SELECT id FROM vecinos WHERE cedula = ?',
          args: [normalizarCedula(cedula)]
        });
        if (f.rows.length > 0) targetId = f.rows[0].id;
      }

      if (!targetId) return NextResponse.json({ error: 'ID o cédula de vecino requerida' }, { status: 400 });

      // Obtener datos del vecino para el registro de auditoría
      const currentVecinoRes = await db.execute({
        sql: 'SELECT * FROM vecinos WHERE id = ?',
        args: [targetId]
      });

      if (currentVecinoRes.rows.length === 0) {
        return NextResponse.json({ error: 'Vecino no encontrado' }, { status: 404 });
      }

      const vec = currentVecinoRes.rows[0];

      await db.execute({
        sql: `UPDATE vecinos SET
          estado_aprobacion = 'APROBADO',
          aprobado_por_usuario_id = ?,
          aprobado_por_nombre = ?,
          aprobado_en = ?,
          updated_at = ?
          WHERE id = ?`,
        args: [currentUser.id, (currentUser.nombre || '').trim().toUpperCase(), now, now, targetId]
      });

      // Registro estricto en bitácora auditable con IP pública
      await registrarAuditoria({
        tipo_evento: 'APROBACION_VECINO',
        usuario_id: currentUser.id,
        usuario_nombre: currentUser.nombre,
        vecino_id: vec.id,
        cedula: vec.cedula,
        request,
        detalles: {
          nombres: `${vec.nombres} ${vec.apellidos}`,
          vereda: vec.vereda,
          casa: vec.casa,
          tiempo_residencia: vec.tiempo_residencia,
          autorizado_por: currentUser.nombre,
          autorizado_el: now,
        }
      });

      return NextResponse.json({
        success: true,
        message: `Vecino ${vec.nombres} ${vec.apellidos} (${vec.cedula}) aprobado exitosamente por ${currentUser.nombre}.`
      });
    }

    // C. RECHAZAR / REVOCAR VECINO
    if (action === 'reject') {
      const currentUser = extractUserFromRequest(request);
      if (!currentUser || !hasPermission(currentUser, 'vecinos_aprobar')) {
        return NextResponse.json({ error: 'No tienes permisos para rechazar vecinos' }, { status: 403 });
      }

      const { vecinoId, motivo } = body;
      const vecRes = await db.execute({ sql: 'SELECT id, cedula, nombres, apellidos, vereda, casa FROM vecinos WHERE id = ?', args: [vecinoId] });
      const vecInfo = vecRes.rows[0] || {};

      await db.execute({
        sql: `UPDATE vecinos SET estado_aprobacion = 'RECHAZADO', observaciones = ?, updated_at = ? WHERE id = ?`,
        args: [motivo || 'Rechazado por administración', now, vecinoId]
      });

      await registrarAuditoria({
        tipo_evento: 'RECHAZO_VECINO',
        usuario_id: currentUser.id,
        usuario_nombre: currentUser.nombre,
        vecino_id: vecinoId,
        cedula: vecInfo.cedula || null,
        request,
        detalles: {
          nombres: vecInfo.nombres ? `${vecInfo.nombres} ${vecInfo.apellidos || ''}`.trim() : 'Vecino',
          vereda: vecInfo.vereda,
          casa: vecInfo.casa,
          motivo: motivo || 'Rechazado por administración',
        }
      });

      return NextResponse.json({ success: true, message: 'Vecino marcado como rechazado' });
    }

    // D. IMPORTACIÓN MASIVA CSV (CENSO MASIVO)
    if (action === 'import_csv') {
      const currentUser = extractUserFromRequest(request);
      if (!currentUser || !hasPermission(currentUser, 'censo_masivo')) {
        return NextResponse.json({ error: 'No tienes permisos para importar vecinos de forma masiva' }, { status: 403 });
      }

      const { rows, previewOnly, autoApprove } = body;
      if (!rows || !Array.isArray(rows)) {
        return NextResponse.json({ error: 'Filas de datos requeridas' }, { status: 400 });
      }

      await cargarTerritorio();
      const mapasCatalogos = await obtenerMapasCatalogos();
      const parsedRows = [];
      const errors = [];

      rows.forEach((row, index) => {
        if (!row) return;

        // Estructura Estándar Unificada de 15 Columnas:
        // 0: CEDULA
        // 1: NOMBRES
        // 2: APELLIDOS
        // 3: NUMERO_FAMILIA
        // 4: VEREDA
        // 5: CASA
        // 6: TIEMPO_RESIDENCIA_ANOS
        // 7: CALIDAD_TENENCIA
        // 8: SEXO
        // 9: PARENTESCO
        // 10: NIVEL_INSTRUCCION
        // 11: PROFESION_OCUPACION
        // 12: CONDICION_SALUD
        // 13: TELEFONO
        // 14: EMAIL

        let cedulaRaw = row.cedula;
        let nombresRaw = row.nombres;
        let apellidosRaw = row.apellidos || '';
        let numFamRaw = Number(row.numero_familia || row.num_familia || 1);
        let veredaRaw = (row.vereda || '').toString().trim().toUpperCase();
        let casaRaw = (row.casa || '').toString().trim().toUpperCase();
        let tiempoRaw = (row.tiempo_residencia_anos || row.tiempo_residencia || '').toString().trim();
        let tenenciaRaw = (row.calidad_tenencia || 'Propia').toString().trim();
        let sexoRaw = (row.sexo || 'M').toString().trim().toUpperCase();
        let parentescoRaw = (row.parentesco || 'a').toString().trim();
        let instruccionRaw = (row.nivel_instruccion || row.instruccion || 'c').toString().trim();
        let ocupacionRaw = (row.profesion_ocupacion || row.ocupacion || '').toString().trim();
        let saludRaw = (row.condicion_salud || row.salud || 'e').toString().trim();
        let telfRaw = (row.telefono || '').toString().trim();
        let emailRaw = (row.email || '').toString().trim();

        if (Array.isArray(row)) {
          const col0 = (row[0] || '').toString().trim();
          const col1 = (row[1] || '').toString().trim();

          // Caso Legacy: [0: NUMERO_FAMILIA, 1: CEDULA, 2: NOMBRES, 3: APELLIDOS, 4: VEREDA, 5: CASA...]
          if (/^\d{1,2}$/.test(col0) && (/^[VvEeJjGgPp]?[-]?\d+/.test(col1) || col1.length >= 6)) {
            numFamRaw = Number(col0) || 1;
            cedulaRaw = col1;
            nombresRaw = row[2];
            apellidosRaw = row[3] || '';
            veredaRaw = (row[4] || '').toString().trim().toUpperCase();
            casaRaw = (row[5] || '').toString().trim().toUpperCase();
            sexoRaw = (row[6] || 'M').toString().trim().toUpperCase();
            parentescoRaw = (row[8] || 'a').toString().trim();
            instruccionRaw = (row[9] || 'c').toString().trim();
            ocupacionRaw = (row[10] || '').toString().trim();
            saludRaw = (row[11] || 'e').toString().trim();
            telfRaw = (row[12] || '').toString().trim();
            tiempoRaw = (row[13] || '').toString().trim();
            tenenciaRaw = (row[14] || 'Propia').toString().trim();
            emailRaw = (row[15] || '').toString().trim();
          } else {
            // Caso Estándar Oficial Requerido:
            // [0: CEDULA, 1: NOMBRES, 2: APELLIDOS, 3: NUMERO_FAMILIA, 4: VEREDA, 5: CASA,
            //  6: TIEMPO_RESIDENCIA_ANOS, 7: CALIDAD_TENENCIA, 8: SEXO, 9: PARENTESCO,
            //  10: NIVEL_INSTRUCCION, 11: PROFESION_OCUPACION, 12: CONDICION_SALUD, 13: TELEFONO, 14: EMAIL]
            cedulaRaw = col0;
            nombresRaw = col1;
            apellidosRaw = row[2] || '';
            numFamRaw = Number(row[3]) || 1;
            veredaRaw = (row[4] || '').toString().trim().toUpperCase();
            casaRaw = (row[5] || '').toString().trim().toUpperCase();
            tiempoRaw = (row[6] || '').toString().trim();
            tenenciaRaw = (row[7] || 'Propia').toString().trim();
            if (row[8]) sexoRaw = row[8].toString().trim().toUpperCase();
            if (row[9]) parentescoRaw = row[9].toString().trim();
            if (row[10]) instruccionRaw = row[10].toString().trim();
            if (row[11]) ocupacionRaw = row[11].toString().trim();
            if (row[12]) saludRaw = row[12].toString().trim();
            if (row[13]) telfRaw = row[13].toString().trim();
            if (row[14]) emailRaw = row[14].toString().trim();
          }
        }

        if (!cedulaRaw || !nombresRaw || !veredaRaw || !casaRaw) {
          errors.push({ fila: index + 2, error: 'Faltan datos obligatorios (Cédula, Nombres, Vereda o Casa)' });
          return;
        }

        const normCed = normalizarCedula(cedulaRaw);
        const normCasa = normalizarCasaVereda(veredaRaw, casaRaw);
        if (!esCasaValida(veredaRaw, normCasa)) {
          errors.push({ fila: index + 2, cedula: normCed, error: `Casa ${casaRaw} inválida para Vereda ${veredaRaw}` });
          return;
        }

        // Mapeo automático de códigos por letra a valores completos legibles (catálogos dinámicos)
        const parentescoDecod = decodificarParentesco(parentescoRaw, mapasCatalogos.parentesco);
        const instruccionDecod = decodificarInstruccion(instruccionRaw, mapasCatalogos.instruccion);
        const saludDecod = decodificarSalud(saludRaw, mapasCatalogos.salud);

        parsedRows.push({
          fila: index + 2,
          numero_familia: numFamRaw,
          cedula: normCed,
          nombres: nombresRaw.toString().trim().toUpperCase(),
          apellidos: apellidosRaw.toString().trim().toUpperCase(),
          vereda: veredaRaw,
          casa: normCasa,
          sexo: ['F', 'FEMENINO', 'MUJER'].includes(sexoRaw) ? 'F' : 'M',
          parentesco: parentescoDecod,
          parentesco_codigo: parentescoRaw.toLowerCase(),
          instruccion: instruccionDecod,
          instruccion_codigo: instruccionRaw.toLowerCase(),
          profesion_ocupacion: ocupacionRaw || 'Oficio del hogar / Empleado',
          salud: saludDecod,
          salud_codigo: saludRaw.toLowerCase(),
          tiempo_residencia: tiempoRaw,
          calidad_tenencia: tenenciaRaw,
          telefono: telfRaw,
          email: emailRaw,
        });
      });

      // Consultar en la base de datos todas las cédulas que ya existan para clasificarlas
      const cedulasToCheck = parsedRows.map(r => r.cedula);
      let cedulasExistentes = new Set();
      if (cedulasToCheck.length > 0) {
        // En SQLite / Turso podemos consultar en lotes
        const placeholders = cedulasToCheck.map(() => '?').join(',');
        const existRes = await db.execute({
          sql: `SELECT cedula, nombres, apellidos, vereda, casa, estado_aprobacion FROM vecinos WHERE cedula IN (${placeholders})`,
          args: cedulasToCheck,
        });
        existRes.rows.forEach(r => {
          cedulasExistentes.add(r.cedula);
        });
      }

      // Detectar duplicados dentro del mismo CSV o ya existentes en la BD
      const cedulasVistasEnCsv = new Set();
      const filasNuevas = [];
      const filasDuplicadas = [];

      for (const item of parsedRows) {
        if (cedulasExistentes.has(item.cedula)) {
          filasDuplicadas.push({
            fila: item.fila,
            cedula: item.cedula,
            nombres: `${item.nombres} ${item.apellidos}`,
            ubicacion: `Vereda ${item.vereda}, ${item.casa}`,
            motivo: 'Ya registrado previamente en la base de datos del padrón',
          });
        } else if (cedulasVistasEnCsv.has(item.cedula)) {
          filasDuplicadas.push({
            fila: item.fila,
            cedula: item.cedula,
            nombres: `${item.nombres} ${item.apellidos}`,
            ubicacion: `Vereda ${item.vereda}, ${item.casa}`,
            motivo: 'Cédula repetida múltiples veces dentro del mismo archivo CSV',
          });
        } else {
          cedulasVistasEnCsv.add(item.cedula);
          filasNuevas.push(item);
        }
      }

      // Marcar en las muestras si ya existe para resaltarlo visualmente en la tabla
      const muestrasConEstado = parsedRows.map(r => ({
        ...r,
        yaExiste: cedulasExistentes.has(r.cedula),
      }));

      if (previewOnly) {
        return NextResponse.json({
          preview: true,
          totalFilasRecibidas: rows.length,
          totalNuevos: filasNuevas.length,
          totalExistentes: filasDuplicadas.length,
          totalErrores: errors.length,
          totalProcesables: filasNuevas.length,
          filasValidas: filasNuevas.length,
          duplicados: filasDuplicadas,
          errores: errors,
          muestras: muestrasConEstado.slice(0, 100),
        });
      }

      // Inserción real en base de datos: solo se procesan las filas nuevas
      let insertados = 0;
      let erroresInsercion = [];

      for (const item of filasNuevas) {
        try {
          const estado = autoApprove ? 'APROBADO' : 'PENDIENTE';
          const aprobadoPorId = autoApprove ? currentUser.id : null;
          const aprobadoPorNombre = autoApprove ? currentUser.nombre : null;
          const aprobadoEn = autoApprove ? now : null;

          const obsDemografica = JSON.stringify({
            fam: item.numero_familia,
            parentesco: item.parentesco,
            instruccion: item.instruccion,
            ocupacion: item.profesion_ocupacion,
            salud: item.salud,
          });

          const res = await db.execute({
            sql: `INSERT OR IGNORE INTO vecinos (
              cedula, nombres, apellidos, vereda, casa, tiempo_residencia,
              calidad_tenencia, telefono, email, sexo, observaciones,
              estado_aprobacion, aprobado_por_usuario_id, aprobado_por_nombre,
              aprobado_en, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              item.cedula,
              item.nombres,
              item.apellidos,
              item.vereda,
              item.casa,
              item.tiempo_residencia,
              item.calidad_tenencia,
              item.telefono,
              item.email,
              item.sexo,
              obsDemografica,
              estado,
              aprobadoPorId,
              aprobadoPorNombre,
              aprobadoEn,
              now,
              now,
            ]
          });

          if (res.rowsAffected > 0) {
            insertados++;
          }
        } catch (e) {
          erroresInsercion.push({ cedula: item.cedula, error: e.message });
        }
      }

      await registrarAuditoria({
        tipo_evento: 'IMPORTACION_CSV_VECINOS',
        usuario_id: currentUser.id,
        usuario_nombre: currentUser.nombre,
        request,
        detalles: { 
          insertados, 
          duplicadosOmitidos: filasDuplicadas.length, 
          erroresFormato: errors.length,
          erroresInsercion: erroresInsercion.length 
        }
      });

      return NextResponse.json({
        success: true,
        message: `Importación finalizada: ${insertados} vecinos nuevos incorporados al padrón. ${filasDuplicadas.length} cédulas ya existentes fueron omitidas.`,
        insertados,
        duplicados: filasDuplicadas,
        errores: [...errors, ...erroresInsercion],
      });
    }

    return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
  } catch (err) {
    console.error('Error en /api/vecinos POST:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const currentUser = extractUserFromRequest(request);
    if (!currentUser || (currentUser.rol !== 'SUPER_ADMIN' && !hasPermission(currentUser, 'vecinos_editar'))) {
      return NextResponse.json({ error: 'No tienes permisos para editar vecinos del padrón' }, { status: 403 });
    }

    await cargarTerritorio();
    const body = await request.json();
    const {
      id,
      vecinoId,
      cedula,
      nombres,
      apellidos,
      vereda,
      casa,
      tiempo_residencia,
      calidad_tenencia,
      telefono,
      email,
      sexo,
      fecha_nacimiento,
      estado_aprobacion,
      observaciones,
    } = body;

    const targetId = id || vecinoId;
    if (!targetId) {
      return NextResponse.json({ error: 'ID del vecino es obligatorio' }, { status: 400 });
    }

    const existRes = await db.execute({
      sql: 'SELECT * FROM vecinos WHERE id = ?',
      args: [targetId],
    });
    if (existRes.rows.length === 0) {
      return NextResponse.json({ error: 'Vecino no encontrado' }, { status: 404 });
    }
    const prev = existRes.rows[0];

    const normCedula = cedula ? normalizarCedula(cedula) : prev.cedula;
    const vUpper = (vereda || prev.vereda || 'A').toString().trim().toUpperCase();
    const cUpper = normalizarCasaVereda(vUpper, (casa || prev.casa || ''));

    if (!esCasaValida(vUpper, cUpper)) {
      return NextResponse.json({
        error: `La casa ${cUpper} no pertenece a las casas válidas de la Vereda ${vUpper}.`
      }, { status: 400 });
    }

    // Verificar duplicado de cédula si fue modificada
    if (normCedula !== prev.cedula) {
      const dupRes = await db.execute({
        sql: 'SELECT id FROM vecinos WHERE cedula = ? AND id != ?',
        args: [normCedula, targetId],
      });
      if (dupRes.rows.length > 0) {
        return NextResponse.json({
          error: `Ya existe otro vecino registrado con la cédula ${normCedula}.`
        }, { status: 409 });
      }
    }

    const now = new Date().toISOString();
    const nomFinal = nombres !== undefined ? String(nombres).trim().toUpperCase() : String(prev.nombres || '').trim().toUpperCase();
    const apeFinal = apellidos !== undefined ? String(apellidos).trim().toUpperCase() : String(prev.apellidos || '').trim().toUpperCase();
    const estadoFinal = estado_aprobacion ? String(estado_aprobacion).trim().toUpperCase() : prev.estado_aprobacion;

    let aprobadoPorId = prev.aprobado_por_usuario_id;
    let aprobadoPorNombre = prev.aprobado_por_nombre ? String(prev.aprobado_por_nombre).trim().toUpperCase() : null;
    let aprobadoEn = prev.aprobado_en;

    if (estadoFinal === 'APROBADO' && prev.estado_aprobacion !== 'APROBADO') {
      aprobadoPorId = currentUser.id;
      aprobadoPorNombre = (currentUser.nombre || '').trim().toUpperCase();
      aprobadoEn = now;
    }

    await db.execute({
      sql: `UPDATE vecinos SET
        cedula = ?,
        nombres = ?,
        apellidos = ?,
        vereda = ?,
        casa = ?,
        tiempo_residencia = ?,
        calidad_tenencia = ?,
        telefono = ?,
        email = ?,
        sexo = ?,
        fecha_nacimiento = ?,
        estado_aprobacion = ?,
        aprobado_por_usuario_id = ?,
        aprobado_por_nombre = ?,
        aprobado_en = ?,
        observaciones = ?,
        updated_at = ?
      WHERE id = ?`,
      args: [
        normCedula,
        nomFinal,
        apeFinal,
        vUpper,
        cUpper,
        tiempo_residencia !== undefined ? String(tiempo_residencia).trim() : (prev.tiempo_residencia || ''),
        calidad_tenencia || prev.calidad_tenencia || 'Propia',
        telefono !== undefined ? String(telefono).trim() : (prev.telefono || ''),
        email !== undefined ? String(email).trim() : (prev.email || ''),
        sexo ? String(sexo).trim().toUpperCase() : (prev.sexo || 'M'),
        fecha_nacimiento !== undefined ? String(fecha_nacimiento).trim() : (prev.fecha_nacimiento || ''),
        estadoFinal,
        aprobadoPorId,
        aprobadoPorNombre,
        aprobadoEn,
        observaciones !== undefined ? observaciones : prev.observaciones,
        now,
        targetId,
      ],
    });

    await registrarAuditoria({
      tipo_evento: 'EDICION_VECINO',
      usuario_id: currentUser.id,
      usuario_nombre: currentUser.nombre,
      vecino_id: Number(targetId),
      cedula: normCedula,
      request,
      detalles: {
        nombres: `${nomFinal} ${apeFinal}`.trim(),
        vereda: vUpper,
        casa: cUpper,
        estado_aprobacion: estadoFinal,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Datos del vecino ${nomFinal} ${apeFinal} (${normCedula}) actualizados correctamente`,
    });
  } catch (err) {
    console.error('Error en /api/vecinos PUT:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const currentUser = extractUserFromRequest(request);
    if (!currentUser || (currentUser.rol !== 'SUPER_ADMIN' && !hasPermission(currentUser, 'vecinos_eliminar'))) {
      return NextResponse.json({ error: 'No tienes permisos para eliminar vecinos del padrón' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID del vecino requerido' }, { status: 400 });
    }

    const existRes = await db.execute({
      sql: 'SELECT id, cedula, nombres, apellidos, vereda, casa FROM vecinos WHERE id = ?',
      args: [id],
    });
    if (existRes.rows.length === 0) {
      return NextResponse.json({ error: 'Vecino no encontrado' }, { status: 404 });
    }
    const vec = existRes.rows[0];

    await db.execute({
      sql: 'DELETE FROM vecinos WHERE id = ?',
      args: [id],
    });

    await registrarAuditoria({
      tipo_evento: 'ELIMINACION_VECINO',
      usuario_id: currentUser.id,
      usuario_nombre: currentUser.nombre,
      vecino_id: Number(id),
      cedula: vec.cedula,
      request,
      detalles: {
        nombres: `${vec.nombres || ''} ${vec.apellidos || ''}`.trim().toUpperCase(),
        vereda: vec.vereda,
        casa: vec.casa,
        accion: `Eliminó del Padrón Comunal al vecino ${vec.nombres} ${vec.apellidos} (${vec.cedula})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Vecino ${vec.nombres} ${vec.apellidos} (${vec.cedula}) eliminado del padrón exitosamente`,
    });
  } catch (err) {
    console.error('Error en /api/vecinos DELETE:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

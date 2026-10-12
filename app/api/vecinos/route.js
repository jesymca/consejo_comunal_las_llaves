import { NextResponse } from 'next/server';
import db from '@/lib/turso';
import { normalizarCedula, esCasaValida, getCasasPorVereda } from '@/lib/territory';
import { extractUserFromRequest, hasPermission } from '@/lib/auth';
import { registrarAuditoria } from '@/lib/audit';

export const dynamic = 'force-dynamic';

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
      } = body;

      if (!cedula || !nombres || !vereda || !casa) {
        return NextResponse.json({ error: 'Cédula, Nombres, Vereda y Casa son campos obligatorios' }, { status: 400 });
      }

      const normCedula = normalizarCedula(cedula);
      const vUpper = vereda.trim().toUpperCase();
      const cUpper = casa.trim().toUpperCase();

      // Validar que la casa sea estrictamente de las permitidas para esa vereda
      if (!esCasaValida(vUpper, cUpper)) {
        return NextResponse.json({
          error: `La casa ${cUpper} no pertenece a las casas válidas de la Vereda ${vUpper}.`
        }, { status: 400 });
      }

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
          aprobadoPorNombre = currentUser.nombre;
          aprobadoEn = now;
        }
      }

      const res = await db.execute({
        sql: `INSERT INTO vecinos (
          cedula, nombres, apellidos, vereda, casa, tiempo_residencia,
          calidad_tenencia, telefono, email, sexo, fecha_nacimiento,
          estado_aprobacion, aprobado_por_usuario_id, aprobado_por_nombre,
          aprobado_en, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          now,
          now,
        ]
      });

      // Si fue aprobado por admin en la creación, registrar auditoría
      if (aprobadoPorId) {
        await registrarAuditoria({
          tipo_evento: 'APROBACION_VECINO',
          usuario_id: currentUser.id,
          usuario_nombre: currentUser.nombre,
          cedula: normCedula,
          detalles: { motivo: 'Registro directo aprobado por administración', vereda: vUpper, casa: cUpper }
        });
      }

      return NextResponse.json({
        success: true,
        message: estadoInicial === 'APROBADO'
          ? 'Vecino registrado y aprobado satisfactoriamente'
          : 'Vecino registrado en espera de aprobación por la vocería comunal',
        vecinoId: Number(res.lastInsertRowid),
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
        args: [currentUser.id, currentUser.nombre, now, now, targetId]
      });

      // Registro estricto en bitácora auditable
      await registrarAuditoria({
        tipo_evento: 'APROBACION_VECINO',
        usuario_id: currentUser.id,
        usuario_nombre: currentUser.nombre,
        vecino_id: vec.id,
        cedula: vec.cedula,
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
      await db.execute({
        sql: `UPDATE vecinos SET estado_aprobacion = 'RECHAZADO', observaciones = ?, updated_at = ? WHERE id = ?`,
        args: [motivo || 'Rechazado por administración', now, vecinoId]
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

      const parsedRows = [];
      const errors = [];

      rows.forEach((row, index) => {
        // Soporta formato clásico y formato censo por habitante
        // Formato Censo Habitante: [NUMERO_FAMILIA, CEDULA, NOMBRES, APELLIDOS, VEREDA, CASA, SEXO, FECHA_NAC, PARENTESCO, INSTRUCCION, OCUPACION, SALUD, TELEFONO, TIEMPO_RESIDENCIA, TENENCIA, EMAIL]
        // Formato Vecinos Clásico: [CEDULA, NOMBRES, APELLIDOS, VEREDA, CASA, TIEMPO_RESIDENCIA, CALIDAD_TENENCIA, TELEFONO, EMAIL]
        
        let cedulaRaw = row.cedula;
        let nombresRaw = row.nombres;
        let apellidosRaw = row.apellidos || '';
        let veredaRaw = (row.vereda || '').toString().trim().toUpperCase();
        let casaRaw = (row.casa || '').toString().trim().toUpperCase();
        let tiempoRaw = (row.tiempo_residencia || '').toString().trim();
        let tenenciaRaw = (row.calidad_tenencia || 'Propia').toString().trim();
        let telfRaw = (row.telefono || '').toString().trim();
        let emailRaw = (row.email || '').toString().trim();
        let sexoRaw = (row.sexo || 'M').toString().trim().toUpperCase();
        let fechaNacRaw = (row.fecha_nacimiento || row.fecha_nac || '').toString().trim();
        let parentescoRaw = (row.parentesco || 'a').toString().trim().toLowerCase();
        let instruccionRaw = (row.instruccion || 'c').toString().trim().toLowerCase();
        let ocupacionRaw = (row.profesion_ocupacion || row.ocupacion || '').toString().trim();
        let saludRaw = (row.salud || 'e').toString().trim().toLowerCase();
        let numFamRaw = Number(row.numero_familia || row.nro_fam || 1);

        if (Array.isArray(row)) {
          // Detectar si la columna 0 es un número pequeño (NUMERO_FAMILIA) o una cédula
          const col0 = (row[0] || '').toString().trim();
          const col1 = (row[1] || '').toString().trim();
          
          if (/^\d{1,2}$/.test(col0) && (/^[VvEeJjGgPp]?[-]?\d+/.test(col1) || col1.length >= 6)) {
            // Formato Censo Habitante:
            // [0: FAM_NRO, 1: CEDULA, 2: NOMBRES, 3: APELLIDOS, 4: VEREDA, 5: CASA, 6: SEXO, 7: FECHA_NAC, 8: PARENTESCO, 9: INSTRUCCION, 10: OCUPACION, 11: SALUD, 12: TELEFONO, 13: TIEMPO_RESIDENCIA, 14: TENENCIA, 15: EMAIL]
            numFamRaw = Number(col0) || 1;
            cedulaRaw = col1;
            nombresRaw = row[2];
            apellidosRaw = row[3] || '';
            veredaRaw = (row[4] || '').toString().trim().toUpperCase();
            casaRaw = (row[5] || '').toString().trim().toUpperCase();
            sexoRaw = (row[6] || 'M').toString().trim().toUpperCase();
            fechaNacRaw = (row[7] || '').toString().trim();
            parentescoRaw = (row[8] || 'a').toString().trim().toLowerCase();
            instruccionRaw = (row[9] || 'c').toString().trim().toLowerCase();
            ocupacionRaw = (row[10] || '').toString().trim();
            saludRaw = (row[11] || 'e').toString().trim().toLowerCase();
            telfRaw = (row[12] || '').toString().trim();
            tiempoRaw = (row[13] || '').toString().trim();
            tenenciaRaw = (row[14] || 'Propia').toString().trim();
            emailRaw = (row[15] || '').toString().trim();
          } else {
            // Formato Clásico de Vecinos:
            // [0: CEDULA, 1: NOMBRES, 2: APELLIDOS, 3: VEREDA, 4: CASA, 5: TIEMPO_RESIDENCIA, 6: TENENCIA, 7: TELEFONO, 8: EMAIL, 9: SEXO, 10: FECHA_NAC]
            cedulaRaw = col0;
            nombresRaw = col1;
            apellidosRaw = row[2] || '';
            veredaRaw = (row[3] || '').toString().trim().toUpperCase();
            casaRaw = (row[4] || '').toString().trim().toUpperCase();
            tiempoRaw = (row[5] || '').toString().trim();
            tenenciaRaw = (row[6] || 'Propia').toString().trim();
            telfRaw = (row[7] || '').toString().trim();
            emailRaw = (row[8] || '').toString().trim();
            if (row[9]) sexoRaw = row[9].toString().trim().toUpperCase();
            if (row[10]) fechaNacRaw = row[10].toString().trim();
          }
        }

        if (!cedulaRaw || !nombresRaw || !veredaRaw || !casaRaw) {
          errors.push({ fila: index + 2, error: 'Faltan datos obligatorios (Cédula, Nombres, Vereda o Casa)' });
          return;
        }

        const normCed = normalizarCedula(cedulaRaw);
        if (!esCasaValida(veredaRaw, casaRaw)) {
          errors.push({ fila: index + 2, cedula: normCed, error: `Casa ${casaRaw} inválida para Vereda ${veredaRaw}` });
          return;
        }

        parsedRows.push({
          numero_familia: numFamRaw,
          cedula: normCed,
          nombres: nombresRaw.toString().trim().toUpperCase(),
          apellidos: apellidosRaw.toString().trim().toUpperCase(),
          vereda: veredaRaw,
          casa: casaRaw,
          sexo: ['F', 'FEMENINO'].includes(sexoRaw) ? 'F' : 'M',
          fecha_nacimiento: fechaNacRaw,
          parentesco: parentescoRaw,
          instruccion: instruccionRaw,
          profesion_ocupacion: ocupacionRaw,
          salud: saludRaw,
          tiempo_residencia: tiempoRaw,
          calidad_tenencia: tenenciaRaw,
          telefono: telfRaw,
          email: emailRaw,
        });
      });

      if (previewOnly) {
        return NextResponse.json({
          preview: true,
          totalFilasRecibidas: rows.length,
          filasValidas: parsedRows.length,
          errores: errors,
          muestras: parsedRows.slice(0, 15),
        });
      }

      // Inserción real en base de datos
      let insertados = 0;
      let duplicados = 0;

      for (const item of parsedRows) {
        try {
          const estado = autoApprove ? 'APROBADO' : 'PENDIENTE';
          const aprobadoPorId = autoApprove ? currentUser.id : null;
          const aprobadoPorNombre = autoApprove ? currentUser.nombre : null;
          const aprobadoEn = autoApprove ? now : null;

          const res = await db.execute({
            sql: `INSERT OR IGNORE INTO vecinos (
              cedula, nombres, apellidos, vereda, casa, tiempo_residencia,
              calidad_tenencia, telefono, email, sexo, fecha_nacimiento,
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
              item.fecha_nacimiento,
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
          } else {
            duplicados++;
          }
        } catch (e) {
          errors.push({ cedula: item.cedula, error: e.message });
        }
      }

      await registrarAuditoria({
        tipo_evento: 'IMPORTACION_CSV_VECINOS',
        usuario_id: currentUser.id,
        usuario_nombre: currentUser.nombre,
        detalles: { insertados, duplicados, totalErrores: errors.length }
      });

      return NextResponse.json({
        success: true,
        message: `Importación finalizada: ${insertados} insertados, ${duplicados} omitidos por cédula duplicada.`,
        insertados,
        duplicados,
        errores: errors,
      });
    }

    return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
  } catch (err) {
    console.error('Error en /api/vecinos POST:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

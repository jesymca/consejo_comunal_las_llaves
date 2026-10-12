import { NextResponse } from 'next/server';
import db from '@/lib/turso';
import { normalizarCedula } from '@/lib/territory';
import { generarCodigoAlfanumerico, generarQrDataUrl } from '@/lib/qrCodeHelper';
import { extractUserFromRequest, hasPermission } from '@/lib/auth';
import { registrarAuditoria } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cedula = searchParams.get('cedula');
    const codigo = searchParams.get('codigo');
    const tipo = searchParams.get('tipo');
    const estado = searchParams.get('estado');

    // Si consulta por cédula (ej: vecino visitando la web para descargar sus documentos)
    if (cedula) {
      const norm = normalizarCedula(cedula);
      const res = await db.execute({
        sql: `SELECT * FROM documentos_solicitudes WHERE cedula = ? ORDER BY id DESC`,
        args: [norm]
      });

      // Calcular si alguno ha vencido dinámicamente
      const docs = res.rows.map(doc => {
        const hoy = new Date();
        const exp = new Date(doc.fecha_vencimiento);
        const diasRestantes = Math.ceil((exp - hoy) / (1000 * 60 * 60 * 24));
        const estaVencido = diasRestantes < 0;
        return {
          ...doc,
          dias_restantes: Math.max(0, diasRestantes),
          estado_calculado: doc.estado === 'REVOCADO' ? 'REVOCADO' : (estaVencido ? 'VENCIDO' : doc.estado),
        };
      });

      return NextResponse.json({ documentos: docs });
    }

    // Consulta para Dashboard
    const currentUser = extractUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let sql = `SELECT * FROM documentos_solicitudes WHERE 1=1`;
    const args = [];

    if (tipo) {
      sql += ` AND tipo_documento = ?`;
      args.push(tipo.toUpperCase());
    }
    if (estado) {
      sql += ` AND estado = ?`;
      args.push(estado.toUpperCase());
    }
    if (codigo) {
      sql += ` AND codigo_qr = ?`;
      args.push(codigo.toUpperCase());
    }

    sql += ` ORDER BY id DESC LIMIT 200`;

    const res = await db.execute({ sql, args });
    const docs = res.rows.map(doc => {
      const hoy = new Date();
      const exp = new Date(doc.fecha_vencimiento);
      const diasRestantes = Math.ceil((exp - hoy) / (1000 * 60 * 60 * 24));
      return {
        ...doc,
        dias_restantes: Math.max(0, diasRestantes),
        estado_calculado: doc.estado === 'REVOCADO' ? 'REVOCADO' : (diasRestantes < 0 ? 'VENCIDO' : doc.estado),
      };
    });

    return NextResponse.json({ documentos: docs });
  } catch (err) {
    console.error('Error en /api/documentos GET:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;
    const now = new Date();
    const nowIso = now.toISOString();

    // 1. SOLICITAR / EMITIR DOCUMENTO
    if (!action || action === 'solicitar') {
      const {
        cedula,
        tipo_documento, // 'RESIDENCIA', 'BUENA_CONDUCTA', 'FALLECIMIENTO'
        es_exonerado,
        motivo_exoneracion,
        banco_origen_id,
        banco_nombre,
        numero_transferencia,
        monto_bs,
        monto_usd,
        tasa_bcv,
        fecha_pago,
        datos_extra, // Ej. datos de familiar fallecido, parentesco, etc.
      } = body;

      if (!cedula || !tipo_documento) {
        return NextResponse.json({ error: 'Cédula y tipo de documento son obligatorios' }, { status: 400 });
      }

      const normCedula = normalizarCedula(cedula);

      // Verificar que el vecino exista y esté APROBADO
      const vecRes = await db.execute({
        sql: 'SELECT * FROM vecinos WHERE cedula = ? LIMIT 1',
        args: [normCedula]
      });

      if (vecRes.rows.length === 0) {
        return NextResponse.json({
          error: 'No se encuentra registrado en el censo del Consejo Comunal. Por favor complete su registro primero.'
        }, { status: 404 });
      }

      const vecino = vecRes.rows[0];
      if (vecino.estado_aprobacion !== 'APROBADO') {
        return NextResponse.json({
          error: 'Su registro como habitante aún se encuentra en estado PENDIENTE de aprobación por parte de la vocería comunal. No puede tramitar documentos hasta ser autorizado.'
        }, { status: 403 });
      }

      // Obtener vigencia configurada
      const vigenciaConfigRes = await db.execute({
        sql: "SELECT valor FROM configuracion_sistema WHERE clave = 'vigencia_dias_default' LIMIT 1"
      });
      const vigenciaDias = Number(vigenciaConfigRes.rows[0]?.valor) || 60;

      // Calcular fechas
      const fechaEmision = now.toISOString().split('T')[0];
      const fechaVenc = new Date(now.getTime() + (vigenciaDias * 24 * 60 * 60 * 1000));
      const fechaVencimiento = fechaVenc.toISOString().split('T')[0];

      // Generar código alfanumérico único XX00XX00XX00
      let codigoQr = generarCodigoAlfanumerico();
      // Asegurar que no colisione
      for (let attempt = 0; attempt < 5; attempt++) {
        const check = await db.execute({
          sql: 'SELECT id FROM documentos_solicitudes WHERE codigo_qr = ?',
          args: [codigoQr]
        });
        if (check.rows.length === 0) break;
        codigoQr = generarCodigoAlfanumerico();
      }

      const estadoInicial = 'VIGENTE'; // Habilitado directamente para descarga

      const res = await db.execute({
        sql: `INSERT INTO documentos_solicitudes (
          codigo_qr, tipo_documento, vecino_id, cedula, nombres_apellidos,
          vereda, casa, tiempo_residencia, vigencia_dias, fecha_emision,
          fecha_vencimiento, estado, banco_origen_id, banco_nombre,
          numero_transferencia, monto_bs, monto_usd, tasa_bcv, fecha_pago,
          es_exonerado, motivo_exoneracion, datos_extra_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          codigoQr,
          tipo_documento.toUpperCase(),
          vecino.id,
          vecino.cedula,
          `${vecino.nombres} ${vecino.apellidos}`.trim(),
          vecino.vereda,
          vecino.casa,
          vecino.tiempo_residencia,
          vigenciaDias,
          fechaEmision,
          fechaVencimiento,
          estadoInicial,
          banco_origen_id || null,
          banco_nombre || null,
          numero_transferencia || null,
          monto_bs || 0,
          monto_usd || 1.0,
          tasa_bcv || 0,
          fecha_pago || fechaEmision,
          es_exonerado ? 1 : 0,
          motivo_exoneracion || null,
          datos_extra ? JSON.stringify(datos_extra) : null,
          nowIso,
          nowIso,
        ]
      });

      // Si es FUNCIONAMIENTO y se proporcionaron datos del comercio, registrar en locales_comerciales_viviendas
      if (tipo_documento.toUpperCase() === 'FUNCIONAMIENTO' && datos_extra) {
        try {
          await db.execute({
            sql: `INSERT INTO locales_comerciales_viviendas (
              propietario_cedula, propietario_nombres, vereda, casa,
              nombre_comercio, rif_comercio, tamano_espacio,
              rubro_establecimiento, fecha_inicio_alquiler,
              documento_solicitud_id, codigo_documento, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              vecino.cedula,
              `${vecino.nombres} ${vecino.apellidos}`.trim(),
              vecino.vereda,
              vecino.casa,
              datos_extra.nombre_comercio || 'Sin especificar',
              datos_extra.rif_comercio || 'Sin RIF',
              datos_extra.tamano_espacio || 'No especificado',
              datos_extra.rubro_establecimiento || 'General',
              datos_extra.fecha_inicio_alquiler || fechaEmision,
              Number(res.lastInsertRowid || 0),
              codigoQr,
              nowIso,
              nowIso,
            ]
          });
        } catch (errLocal) {
          console.warn('Error guardando en locales_comerciales_viviendas:', errLocal);
        }
      }

      // Registrar en auditoría
      await registrarAuditoria({
        tipo_evento: 'SOLICITUD_DOCUMENTO',
        vecino_id: vecino.id,
        cedula: vecino.cedula,
        codigo_documento: codigoQr,
        tipo_documento,
        detalles: {
          tipo: tipo_documento,
          exonerado: Boolean(es_exonerado),
          monto_bs,
          banco: banco_nombre,
          referencia: numero_transferencia,
          comercio: datos_extra?.nombre_comercio || null
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Documento generado con éxito',
        documentoId: Number(res.lastInsertRowid),
        codigo_qr: codigoQr,
        tipo_documento,
        vigencia_dias: vigenciaDias,
        fecha_emision: fechaEmision,
        fecha_vencimiento: fechaVencimiento,
        titular: {
          nombres_apellidos: `${vecino.nombres} ${vecino.apellidos}`.trim(),
          cedula: vecino.cedula,
          vereda: vecino.vereda,
          casa: vecino.casa,
          tiempo_residencia: vecino.tiempo_residencia,
        }
      });
    }

    // 2. RENOVAR DOCUMENTO VENCIDO
    if (action === 'renovar') {
      const { codigo_anterior, cedula } = body;
      if (!codigo_anterior && !cedula) {
        return NextResponse.json({ error: 'Código del documento anterior o cédula requerida' }, { status: 400 });
      }

      let oldDoc = null;
      if (codigo_anterior) {
        const r = await db.execute({
          sql: 'SELECT * FROM documentos_solicitudes WHERE codigo_qr = ? LIMIT 1',
          args: [codigo_anterior]
        });
        if (r.rows.length > 0) oldDoc = r.rows[0];
      } else {
        const r = await db.execute({
          sql: 'SELECT * FROM documentos_solicitudes WHERE cedula = ? ORDER BY id DESC LIMIT 1',
          args: [normalizarCedula(cedula)]
        });
        if (r.rows.length > 0) oldDoc = r.rows[0];
      }

      if (!oldDoc) {
        return NextResponse.json({ error: 'Documento previo no encontrado' }, { status: 404 });
      }

      // Obtener vigencia configurada
      const vigenciaConfigRes = await db.execute({
        sql: "SELECT valor FROM configuracion_sistema WHERE clave = 'vigencia_dias_default' LIMIT 1"
      });
      const vigenciaDias = Number(vigenciaConfigRes.rows[0]?.valor) || 60;

      const fechaEmision = now.toISOString().split('T')[0];
      const fechaVenc = new Date(now.getTime() + (vigenciaDias * 24 * 60 * 60 * 1000));
      const fechaVencimiento = fechaVenc.toISOString().split('T')[0];
      const nuevoCodigoQr = generarCodigoAlfanumerico();

      // Marcar el anterior como VENCIDO
      await db.execute({
        sql: "UPDATE documentos_solicitudes SET estado = 'VENCIDO', updated_at = ? WHERE id = ?",
        args: [nowIso, oldDoc.id]
      });

      // Insertar nuevo documento renovado
      const res = await db.execute({
        sql: `INSERT INTO documentos_solicitudes (
          codigo_qr, tipo_documento, vecino_id, cedula, nombres_apellidos,
          vereda, casa, tiempo_residencia, vigencia_dias, fecha_emision,
          fecha_vencimiento, estado, renovado_de_codigo, banco_origen_id,
          banco_nombre, numero_transferencia, monto_bs, monto_usd, tasa_bcv,
          fecha_pago, es_exonerado, motivo_exoneracion, datos_extra_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'VIGENTE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          nuevoCodigoQr,
          oldDoc.tipo_documento,
          oldDoc.vecino_id,
          oldDoc.cedula,
          oldDoc.nombres_apellidos,
          oldDoc.vereda,
          oldDoc.casa,
          oldDoc.tiempo_residencia,
          vigenciaDias,
          fechaEmision,
          fechaVencimiento,
          oldDoc.codigo_qr,
          body.banco_origen_id || oldDoc.banco_origen_id,
          body.banco_nombre || oldDoc.banco_nombre,
          body.numero_transferencia || oldDoc.numero_transferencia,
          body.monto_bs || oldDoc.monto_bs,
          body.monto_usd || oldDoc.monto_usd,
          body.tasa_bcv || oldDoc.tasa_bcv,
          fechaEmision,
          body.es_exonerado ? 1 : 0,
          body.motivo_exoneracion || null,
          oldDoc.datos_extra_json,
          nowIso,
          nowIso,
        ]
      });

      await registrarAuditoria({
        tipo_evento: 'RENOVACION_DOCUMENTO',
        vecino_id: oldDoc.vecino_id,
        cedula: oldDoc.cedula,
        codigo_documento: nuevoCodigoQr,
        tipo_documento: oldDoc.tipo_documento,
        detalles: { renovado_de: oldDoc.codigo_qr, nueva_fecha_vencimiento: fechaVencimiento }
      });

      return NextResponse.json({
        success: true,
        message: 'Documento renovado satisfactoriamente con nuevo código QR alfanumérico',
        documentoId: Number(res.lastInsertRowid),
        codigo_qr: nuevoCodigoQr,
        fecha_emision: fechaEmision,
        fecha_vencimiento: fechaVencimiento,
        vigencia_dias: vigenciaDias,
      });
    }

    // 3. REVOCAR DOCUMENTO (Solo con permiso docs_anular o SUPER_ADMIN)
    if (action === 'revocar') {
      const currentUser = extractUserFromRequest(request);
      if (!currentUser || !hasPermission(currentUser, 'docs_anular')) {
        return NextResponse.json({ error: 'No autorizado para revocar documentos' }, { status: 403 });
      }

      const { codigo, motivo } = body;
      if (!codigo) return NextResponse.json({ error: 'Código de documento requerido' }, { status: 400 });

      await db.execute({
        sql: "UPDATE documentos_solicitudes SET estado = 'REVOCADO', updated_at = ? WHERE codigo_qr = ?",
        args: [nowIso, codigo.toUpperCase()]
      });

      await registrarAuditoria({
        tipo_evento: 'REVOCACION_DOCUMENTO',
        usuario_id: currentUser.id,
        usuario_nombre: currentUser.nombre,
        codigo_documento: codigo.toUpperCase(),
        detalles: { motivo: motivo || 'Revocado por administración' }
      });

      return NextResponse.json({ success: true, message: `Documento ${codigo} revocado` });
    }

    return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
  } catch (err) {
    console.error('Error en /api/documentos POST:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

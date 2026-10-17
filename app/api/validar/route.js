import { NextResponse } from 'next/server';
import db from '@/lib/turso';
import { normalizarCedula } from '@/lib/territory';
import { registrarAuditoria } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const codigo = searchParams.get('codigo')?.trim();
    const cedula = searchParams.get('cedula')?.trim();

    if (!codigo && !cedula) {
      return NextResponse.json({
        error: 'Debe ingresar un código de validación alfanumérico (XX00XX00XX00) o número de cédula'
      }, { status: 400 });
    }

    let querySql = '';
    let queryArgs = [];

    if (codigo) {
      querySql = `SELECT * FROM documentos_solicitudes WHERE codigo_qr = ? LIMIT 1`;
      queryArgs = [codigo.toUpperCase()];
    } else {
      const normCed = normalizarCedula(cedula);
      querySql = `SELECT * FROM documentos_solicitudes WHERE cedula = ? ORDER BY id DESC LIMIT 1`;
      queryArgs = [normCed];
    }

    const res = await db.execute({ sql: querySql, args: queryArgs });

    if (res.rows.length === 0) {
      await registrarAuditoria({
        tipo_evento: 'CONSULTA_VALIDADOR',
        usuario_nombre: 'Visitante / Verificador Externo',
        cedula: cedula ? normalizarCedula(cedula) : null,
        codigo_documento: codigo ? codigo.toUpperCase() : null,
        request,
        detalles: { encontrado: false, resultado: 'NO_ENCONTRADO', criterio: codigo || cedula }
      });
      return NextResponse.json({
        valido: false,
        encontrado: false,
        mensaje: 'No se encontró ningún documento emitido con ese código o cédula.',
      });
    }

    const doc = res.rows[0];

    // Obtener firmas activas para la constancia
    const firmasRes = await db.execute('SELECT * FROM firmas_sellos WHERE activo = 1 ORDER BY orden ASC LIMIT 3');
    const firmas = firmasRes.rows;

    // Calcular vigencia y días restantes
    const hoy = new Date();
    const fechaEmision = new Date(doc.fecha_emision);
    const fechaVencimiento = new Date(doc.fecha_vencimiento);
    const diffTime = fechaVencimiento.getTime() - hoy.getTime();
    const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let estadoCalculado = doc.estado;
    if (doc.estado === 'REVOCADO') {
      estadoCalculado = 'REVOCADO';
    } else if (diasRestantes <= 0) {
      estadoCalculado = 'VENCIDO';
    } else {
      estadoCalculado = 'VIGENTE';
    }

    // Registrar consulta en bitácora con IP pública
    await registrarAuditoria({
      tipo_evento: 'CONSULTA_VALIDADOR',
      usuario_nombre: doc.nombres_apellidos || 'Verificador Público',
      cedula: doc.cedula,
      codigo_documento: doc.codigo_qr,
      tipo_documento: doc.tipo_documento,
      request,
      detalles: { encontrado: true, estado: estadoCalculado, diasRestantes, titular: doc.nombres_apellidos }
    });

    return NextResponse.json({
      encontrado: true,
      valido: estadoCalculado === 'VIGENTE',
      estado: estadoCalculado,
      dias_restantes: Math.max(0, diasRestantes),
      mensaje_vigencia: estadoCalculado === 'VIGENTE'
        ? `Documento VÁLIDO y VIGENTE. Le quedan ${diasRestantes} días de validez.`
        : (estadoCalculado === 'VENCIDO'
            ? `El documento se encuentra VENCIDO. Expiró el ${doc.fecha_vencimiento}.`
            : `El documento se encuentra REVOCADO por el Consejo Comunal.`),
      documento: {
        id: doc.id,
        codigo_qr: doc.codigo_qr,
        tipo_documento: doc.tipo_documento,
        cedula: doc.cedula,
        nombres_apellidos: doc.nombres_apellidos,
        vereda: doc.vereda,
        casa: doc.casa,
        tiempo_residencia: doc.tiempo_residencia,
        fecha_emision: doc.fecha_emision,
        fecha_vencimiento: doc.fecha_vencimiento,
        vigencia_dias: doc.vigencia_dias,
        es_exonerado: Boolean(doc.es_exonerado),
        renovado_de_codigo: doc.renovado_de_codigo,
      },
      firmas,
    });
  } catch (err) {
    console.error('Error en /api/validar GET:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

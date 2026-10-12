import { NextResponse } from 'next/server';
import db from '@/lib/turso';
import { extractUserFromRequest } from '@/lib/auth';
import { registrarAuditoria } from '@/lib/audit';

export async function GET(request) {
  try {
    const currentUser = extractUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const cedula = searchParams.get('cedula');
    const limit = parseInt(searchParams.get('limit') || '150', 10);

    let sql = `SELECT * FROM bitacora_auditoria WHERE 1=1`;
    const args = [];

    if (tipo) {
      sql += ` AND tipo_evento = ?`;
      args.push(tipo);
    }
    if (cedula) {
      sql += ` AND cedula LIKE ?`;
      args.push(`%${cedula}%`);
    }

    sql += ` ORDER BY id DESC LIMIT ?`;
    args.push(limit);

    const res = await db.execute({ sql, args });

    const logs = res.rows.map(r => ({
      ...r,
      detalles: (() => {
        try {
          return typeof r.detalles === 'string' && r.detalles.startsWith('{')
            ? JSON.parse(r.detalles)
            : r.detalles;
        } catch {
          return r.detalles;
        }
      })(),
    }));

    return NextResponse.json({ logs });
  } catch (err) {
    console.error('Error en /api/auditoria GET:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    // Registrar evento de descarga por parte del vecino
    if (action === 'registrar_descarga') {
      const { cedula, codigo_documento, tipo_documento, vecino_id, usuario_nombre } = body;

      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
      const userAgent = request.headers.get('user-agent') || 'Browser';

      await registrarAuditoria({
        tipo_evento: 'DESCARGA_DOCUMENTO',
        cedula,
        codigo_documento,
        tipo_documento,
        vecino_id: vecino_id || null,
        usuario_nombre: usuario_nombre || 'Vecino / Ciudadano',
        ip,
        user_agent: userAgent,
        detalles: {
          timestamp: new Date().toISOString(),
          metodo: 'Descarga Digital PDF',
        }
      });

      return NextResponse.json({ success: true, message: 'Evento de descarga registrado' });
    }

    return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
  } catch (err) {
    console.error('Error en /api/auditoria POST:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

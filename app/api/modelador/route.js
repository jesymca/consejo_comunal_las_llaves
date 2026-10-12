import { NextResponse } from 'next/server';
import db from '@/lib/turso';
import { extractUserFromRequest, hasPermission } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const res = await db.execute({
        sql: 'SELECT * FROM documentos_plantillas WHERE id = ? LIMIT 1',
        args: [id.toUpperCase()]
      });
      if (res.rows.length === 0) return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });
      return NextResponse.json({ plantilla: res.rows[0] });
    }

    const res = await db.execute('SELECT * FROM documentos_plantillas ORDER BY id ASC');
    return NextResponse.json({ plantillas: res.rows });
  } catch (err) {
    console.error('Error en /api/modelador GET:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const currentUser = extractUserFromRequest(request);
    if (!currentUser || (!hasPermission(currentUser, 'modelador') && !hasPermission(currentUser, 'modelador_edit'))) {
      return NextResponse.json({ error: 'No autorizado para editar modelos de documentos ni plantillas' }, { status: 403 });
    }

    const body = await request.json();
    const { id, titulo, subtitulo, cuerpo_template, encabezado_svg, pie_svg } = body;

    if (!id || !titulo || !cuerpo_template) {
      return NextResponse.json({ error: 'ID, Título y Cuerpo del template son requeridos' }, { status: 400 });
    }

    const now = new Date().toISOString();

    await db.execute({
      sql: `UPDATE documentos_plantillas SET
        titulo = ?,
        subtitulo = ?,
        cuerpo_template = ?,
        encabezado_svg = ?,
        pie_svg = ?,
        updated_at = ?
        WHERE id = ?`,
      args: [
        titulo,
        subtitulo || '',
        cuerpo_template,
        encabezado_svg || '',
        pie_svg || '',
        now,
        id.toUpperCase(),
      ]
    });

    return NextResponse.json({ success: true, message: 'Plantilla actualizada exitosamente' });
  } catch (err) {
    console.error('Error en /api/modelador PUT:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

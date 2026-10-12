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

export async function POST(request) {
  try {
    const currentUser = extractUserFromRequest(request);
    if (!currentUser || (!hasPermission(currentUser, 'modelador') && !hasPermission(currentUser, 'modelador_edit'))) {
      return NextResponse.json({ error: 'No autorizado para crear modelos de documentos ni plantillas' }, { status: 403 });
    }

    const body = await request.json();
    let { id, titulo, subtitulo, cuerpo_template, encabezado_svg, pie_svg } = body;

    if (!id || !titulo) {
      return NextResponse.json({ error: 'Identificador único (ID) y Título son requeridos' }, { status: 400 });
    }

    // Normalizar ID en mayúsculas sin espacios
    const cleanId = String(id).trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');

    const existRes = await db.execute({
      sql: 'SELECT id FROM documentos_plantillas WHERE id = ? LIMIT 1',
      args: [cleanId]
    });

    if (existRes.rows.length > 0) {
      return NextResponse.json({ error: `Ya existe una plantilla con el identificador ${cleanId}` }, { status: 400 });
    }

    const defaultCuerpo = cuerpo_template || 'Quien suscribe, voceros del Consejo Comunal de la Urbanización Dr. Alfredo Travieso Paul "LAS LLAVES", por medio de la presente hacemos constar que el ciudadano (a): {nombre_completo}, portador (a) de la cédula de identidad N°: {cedula}, habitante de la Vereda {vereda}, Casa N° {casa}.\n\nConstancia que se expide a solicitud de parte interesada, en la ciudad de Puerto Cabello, a los {dias} días del mes de {mes} del año {ano}.';

    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO documentos_plantillas (id, titulo, subtitulo, cuerpo_template, encabezado_svg, pie_svg, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        cleanId,
        String(titulo).trim(),
        subtitulo ? String(subtitulo).trim() : 'NRO: {codigo_qr}',
        defaultCuerpo,
        encabezado_svg || '',
        pie_svg || '',
        now,
      ]
    });

    return NextResponse.json({
      success: true,
      message: 'Nueva plantilla documental creada exitosamente',
      plantilla: {
        id: cleanId,
        titulo: String(titulo).trim(),
        subtitulo: subtitulo || 'NRO: {codigo_qr}',
        cuerpo_template: defaultCuerpo,
      }
    });
  } catch (err) {
    console.error('Error en /api/modelador POST:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const currentUser = extractUserFromRequest(request);
    if (!currentUser || currentUser.rol !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Solo el SUPER_ADMIN puede eliminar plantillas documentales' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de la plantilla requerido' }, { status: 400 });
    }

    const cleanId = id.toUpperCase();

    // Proteger plantillas fundamentales del sistema
    const protegidas = ['RESIDENCIA', 'BUENA_CONDUCTA', 'FALLECIMIENTO', 'FUNCIONAMIENTO'];
    if (protegidas.includes(cleanId)) {
      return NextResponse.json({ error: `La plantilla oficial ${cleanId} es un documento base del sistema y no puede ser eliminada` }, { status: 400 });
    }

    await db.execute({
      sql: 'DELETE FROM documentos_plantillas WHERE id = ?',
      args: [cleanId]
    });

    return NextResponse.json({ success: true, message: 'Plantilla eliminada correctamente' });
  } catch (err) {
    console.error('Error en /api/modelador DELETE:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

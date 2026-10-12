import { NextResponse } from 'next/server';
import db from '@/lib/turso';
import { extractUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const PRESETS_DEFAULT = [
  { name: 'Escudo Venezuela', url: 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/escudo_venezuela.svg', defaultW: 55, defaultH: 55, lockRatio: 1 },
  { name: 'Logo Comunas', url: 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/mppcomunas.png', defaultW: 90, defaultH: 45, lockRatio: 0 },
  { name: 'Logo Consejo Comunal', url: 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/logo.png', defaultW: 70, defaultH: 70, lockRatio: 1 },
  { name: 'Sello Húmedo CC', url: 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/sello.png', defaultW: 75, defaultH: 75, lockRatio: 1 },
  { name: 'Comisión de Tecnología (TEI)', url: 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/tei.png', defaultW: 65, defaultH: 65, lockRatio: 1 },
];

async function asegurarTablaPresets() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS presets_imagenes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      url TEXT NOT NULL,
      ancho INTEGER NOT NULL DEFAULT 60,
      alto INTEGER NOT NULL DEFAULT 60,
      bloquear_proporcion INTEGER NOT NULL DEFAULT 1,
      categoria TEXT DEFAULT 'OFICIAL',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const countRes = await db.execute('SELECT COUNT(*) as count FROM presets_imagenes');
  const count = Number(countRes.rows[0]?.count || 0);

  if (count === 0) {
    const now = new Date().toISOString();
    for (const p of PRESETS_DEFAULT) {
      await db.execute({
        sql: `INSERT INTO presets_imagenes (nombre, url, ancho, alto, bloquear_proporcion, categoria, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, 'OFICIAL', ?, ?)`,
        args: [p.name, p.url, p.defaultW, p.defaultH, p.lockRatio, now, now],
      });
    }
  }
}

// GET: Listar todos los presets de imágenes
export async function GET() {
  try {
    await asegurarTablaPresets();
    const res = await db.execute('SELECT * FROM presets_imagenes ORDER BY id ASC');
    const presets = res.rows.map(r => ({
      id: r.id,
      name: r.nombre,
      url: r.url,
      defaultW: Number(r.ancho) || 60,
      defaultH: Number(r.alto) || 60,
      lockRatio: Boolean(r.bloquear_proporcion),
      categoria: r.categoria || 'OFICIAL',
    }));

    return NextResponse.json({ presets });
  } catch (err) {
    console.error('Error en /api/presets GET:', err);
    return NextResponse.json({ error: err.message || 'Error al obtener presets' }, { status: 500 });
  }
}

// POST: Crear un nuevo preset oficial
export async function POST(request) {
  try {
    const user = extractUserFromRequest(request);
    if (!user || (user.rol !== 'SUPER_ADMIN' && user.rol !== 'ADMIN')) {
      return NextResponse.json({ error: 'Solo administradores pueden crear presets oficiales' }, { status: 403 });
    }

    await asegurarTablaPresets();
    const body = await request.json();
    const { nombre, url, ancho, alto, bloquear_proporcion, categoria } = body;

    if (!nombre || !url) {
      return NextResponse.json({ error: 'Nombre y URL de imagen son obligatorios' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const res = await db.execute({
      sql: `INSERT INTO presets_imagenes (nombre, url, ancho, alto, bloquear_proporcion, categoria, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        nombre.trim(),
        url.trim(),
        Number(ancho) || 60,
        Number(alto) || 60,
        bloquear_proporcion ? 1 : 0,
        categoria || 'OFICIAL',
        now,
        now,
      ],
    });

    return NextResponse.json({
      success: true,
      message: 'Preset oficial creado satisfactoriamente',
      presetId: Number(res.lastInsertRowid),
    });
  } catch (err) {
    console.error('Error en /api/presets POST:', err);
    return NextResponse.json({ error: err.message || 'Error al crear preset' }, { status: 500 });
  }
}

// PUT: Modificar un preset existente
export async function PUT(request) {
  try {
    const user = extractUserFromRequest(request);
    if (!user || (user.rol !== 'SUPER_ADMIN' && user.rol !== 'ADMIN')) {
      return NextResponse.json({ error: 'Solo administradores pueden modificar presets oficiales' }, { status: 403 });
    }

    await asegurarTablaPresets();
    const body = await request.json();
    const { id, nombre, url, ancho, alto, bloquear_proporcion, categoria } = body;

    if (!id || !nombre || !url) {
      return NextResponse.json({ error: 'ID, Nombre y URL son requeridos' }, { status: 400 });
    }

    const now = new Date().toISOString();
    await db.execute({
      sql: `UPDATE presets_imagenes SET
            nombre = ?,
            url = ?,
            ancho = ?,
            alto = ?,
            bloquear_proporcion = ?,
            categoria = ?,
            updated_at = ?
            WHERE id = ?`,
      args: [
        nombre.trim(),
        url.trim(),
        Number(ancho) || 60,
        Number(alto) || 60,
        bloquear_proporcion ? 1 : 0,
        categoria || 'OFICIAL',
        now,
        Number(id),
      ],
    });

    return NextResponse.json({
      success: true,
      message: 'Preset oficial actualizado satisfactoriamente',
    });
  } catch (err) {
    console.error('Error en /api/presets PUT:', err);
    return NextResponse.json({ error: err.message || 'Error al actualizar preset' }, { status: 500 });
  }
}

// DELETE: Eliminar un preset
export async function DELETE(request) {
  try {
    const user = extractUserFromRequest(request);
    if (!user || (user.rol !== 'SUPER_ADMIN' && user.rol !== 'ADMIN')) {
      return NextResponse.json({ error: 'Solo administradores pueden eliminar presets oficiales' }, { status: 403 });
    }

    await asegurarTablaPresets();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de preset requerido' }, { status: 400 });
    }

    await db.execute({
      sql: 'DELETE FROM presets_imagenes WHERE id = ?',
      args: [Number(id)],
    });

    return NextResponse.json({
      success: true,
      message: 'Preset eliminado correctamente',
    });
  } catch (err) {
    console.error('Error en /api/presets DELETE:', err);
    return NextResponse.json({ error: err.message || 'Error al eliminar preset' }, { status: 500 });
  }
}

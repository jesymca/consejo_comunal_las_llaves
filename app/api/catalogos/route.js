import { NextResponse } from 'next/server';
import db from '@/lib/turso';
import { extractUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const CATALOGOS_DEFAULT = [
  // Parentesco
  { tipo: 'parentesco', codigo: 'a', descripcion: 'Jefe(a)', orden: 1 },
  { tipo: 'parentesco', codigo: 'b', descripcion: 'Cónyuge', orden: 2 },
  { tipo: 'parentesco', codigo: 'c', descripcion: 'Hijo(a)', orden: 3 },
  { tipo: 'parentesco', codigo: 'd', descripcion: 'Madre/Padre', orden: 4 },
  { tipo: 'parentesco', codigo: 'e', descripcion: 'Abuelo(a)', orden: 5 },
  { tipo: 'parentesco', codigo: 'f', descripcion: 'Tíos/Tías', orden: 6 },

  // Instrucción
  { tipo: 'instruccion', codigo: 'a', descripcion: 'Ninguno', orden: 1 },
  { tipo: 'instruccion', codigo: 'b', descripcion: 'Primaria', orden: 2 },
  { tipo: 'instruccion', codigo: 'c', descripcion: 'Secundaria', orden: 3 },
  { tipo: 'instruccion', codigo: 'd', descripcion: 'TSU', orden: 4 },
  { tipo: 'instruccion', codigo: 'e', descripcion: 'Universitario', orden: 5 },
  { tipo: 'instruccion', codigo: 'f', descripcion: 'Postgrado', orden: 6 },

  // Salud
  { tipo: 'salud', codigo: 'a', descripcion: 'Discapacidad', orden: 1 },
  { tipo: 'salud', codigo: 'b', descripcion: 'En cama', orden: 2 },
  { tipo: 'salud', codigo: 'c', descripcion: 'Crónica', orden: 3 },
  { tipo: 'salud', codigo: 'd', descripcion: 'Silla de Ruedas', orden: 4 },
  { tipo: 'salud', codigo: 'e', descripcion: 'Ninguna', orden: 5 },
];

export async function asegurarTablaCatalogos() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS catalogos_sistema (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL,
      codigo TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      orden INTEGER NOT NULL DEFAULT 1,
      activo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(tipo, codigo)
    );
  `);

  const countRes = await db.execute('SELECT COUNT(*) as count FROM catalogos_sistema');
  const count = Number(countRes.rows[0]?.count || 0);

  if (count === 0) {
    const now = new Date().toISOString();
    for (const item of CATALOGOS_DEFAULT) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO catalogos_sistema (tipo, codigo, descripcion, orden, activo, created_at, updated_at)
              VALUES (?, ?, ?, ?, 1, ?, ?)`,
        args: [item.tipo, item.codigo.toLowerCase(), item.descripcion, item.orden, now, now],
      });
    }
  }
}

// GET: Retornar los ítems del catálogo agrupados o por tipo
export async function GET(request) {
  try {
    await asegurarTablaCatalogos();
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');

    let sql = 'SELECT * FROM catalogos_sistema WHERE activo = 1 ORDER BY tipo ASC, orden ASC, codigo ASC';
    let args = [];

    if (tipo) {
      sql = 'SELECT * FROM catalogos_sistema WHERE tipo = ? AND activo = 1 ORDER BY orden ASC, codigo ASC';
      args = [tipo];
    }

    const res = await db.execute({ sql, args });

    const items = res.rows.map(r => ({
      id: r.id,
      tipo: r.tipo,
      codigo: r.codigo,
      descripcion: r.descripcion,
      orden: Number(r.orden) || 1,
      activo: Boolean(r.activo),
    }));

    // Agrupación de conveniencia
    const agrupado = {
      parentesco: items.filter(i => i.tipo === 'parentesco'),
      instruccion: items.filter(i => i.tipo === 'instruccion'),
      salud: items.filter(i => i.tipo === 'salud'),
    };

    return NextResponse.json({
      items,
      catalogos: agrupado,
    });
  } catch (err) {
    console.error('Error en /api/catalogos GET:', err);
    return NextResponse.json({ error: err.message || 'Error al obtener catálogos' }, { status: 500 });
  }
}

// POST: Crear nuevo ítem (literal/código y descripción)
export async function POST(request) {
  try {
    const user = extractUserFromRequest(request);
    if (!user || (user.rol !== 'SUPER_ADMIN' && user.rol !== 'ADMIN')) {
      return NextResponse.json({ error: 'Solo administradores pueden agregar opciones al sistema' }, { status: 403 });
    }

    await asegurarTablaCatalogos();
    const body = await request.json();
    const { tipo, codigo, descripcion, orden } = body;

    if (!tipo || !codigo || !descripcion) {
      return NextResponse.json({ error: 'Tipo, código (literal) y descripción son obligatorios' }, { status: 400 });
    }

    const tipoNorm = tipo.trim().toLowerCase();
    const codigoNorm = codigo.trim().toLowerCase();
    const descNorm = descripcion.trim();
    const ordenNum = Number(orden) || 1;
    const now = new Date().toISOString();

    if (!['parentesco', 'instruccion', 'salud'].includes(tipoNorm)) {
      return NextResponse.json({ error: 'El tipo debe ser: parentesco, instruccion o salud' }, { status: 400 });
    }

    const res = await db.execute({
      sql: `INSERT INTO catalogos_sistema (tipo, codigo, descripcion, orden, activo, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, ?, ?)
            ON CONFLICT(tipo, codigo) DO UPDATE SET
              descripcion = excluded.descripcion,
              orden = excluded.orden,
              activo = 1,
              updated_at = excluded.updated_at;`,
      args: [tipoNorm, codigoNorm, descNorm, ordenNum, now, now],
    });

    return NextResponse.json({
      success: true,
      message: `Ítem (${codigoNorm}) agregado con éxito al catálogo ${tipoNorm}`,
      id: Number(res.lastInsertRowid),
    });
  } catch (err) {
    console.error('Error en /api/catalogos POST:', err);
    return NextResponse.json({ error: err.message || 'Error al crear ítem de catálogo' }, { status: 500 });
  }
}

// PUT: Modificar un ítem existente
export async function PUT(request) {
  try {
    const user = extractUserFromRequest(request);
    if (!user || (user.rol !== 'SUPER_ADMIN' && user.rol !== 'ADMIN')) {
      return NextResponse.json({ error: 'Solo administradores pueden modificar opciones del sistema' }, { status: 403 });
    }

    await asegurarTablaCatalogos();
    const body = await request.json();
    const { id, tipo, codigo, descripcion, orden } = body;

    if (!id || !codigo || !descripcion) {
      return NextResponse.json({ error: 'ID, código y descripción son obligatorios' }, { status: 400 });
    }

    const now = new Date().toISOString();
    await db.execute({
      sql: `UPDATE catalogos_sistema SET
              codigo = ?,
              descripcion = ?,
              orden = ?,
              updated_at = ?
            WHERE id = ?`,
      args: [
        codigo.trim().toLowerCase(),
        descripcion.trim(),
        Number(orden) || 1,
        now,
        Number(id),
      ],
    });

    return NextResponse.json({
      success: true,
      message: 'Ítem de catálogo actualizado con éxito',
    });
  } catch (err) {
    console.error('Error en /api/catalogos PUT:', err);
    return NextResponse.json({ error: err.message || 'Error al actualizar ítem' }, { status: 500 });
  }
}

// DELETE: Eliminar un ítem de catálogo
export async function DELETE(request) {
  try {
    const user = extractUserFromRequest(request);
    if (!user || user.rol !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acceso restringido: Solo el SUPER_ADMIN puede eliminar opciones del catálogo del sistema' }, { status: 403 });
    }

    await asegurarTablaCatalogos();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de ítem requerido' }, { status: 400 });
    }

    await db.execute({
      sql: 'DELETE FROM catalogos_sistema WHERE id = ?',
      args: [Number(id)],
    });

    return NextResponse.json({
      success: true,
      message: 'Ítem eliminado correctamente',
    });
  } catch (err) {
    console.error('Error en /api/catalogos DELETE:', err);
    return NextResponse.json({ error: err.message || 'Error al eliminar ítem' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import db from '@/lib/turso';
import { extractUserFromRequest } from '@/lib/auth';
import { VEREDAS, esCasaValida, getCasasPermitidasPorVereda, normalizarCasaVereda } from '@/lib/territory';
import { asegurarTablaTerritorio, cargarTerritorio } from '@/lib/territoryServer';
import { registrarAuditoria } from '@/lib/audit';

export const dynamic = 'force-dynamic';

function esAdmin(request) {
  const user = extractUserFromRequest(request);
  return user && (user.rol === 'SUPER_ADMIN' || user.rol === 'ADMIN');
}

function normalizarCasa(vereda, casa) {
  return normalizarCasaVereda(vereda, casa);
}

// GET: mapa completo de veredas y casas
export async function GET() {
  try {
    const { mapa, items } = await cargarTerritorio();
    return NextResponse.json({ veredas: VEREDAS, casasPorVereda: mapa, items });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al obtener territorio' }, { status: 500 });
  }
}

// POST: crear una o varias casas. Body: { vereda, casa } | { vereda, casas: [] } | { vereda, desde, hasta, paso }
export async function POST(request) {
  try {
    const currentUser = extractUserFromRequest(request);
    if (!currentUser || (currentUser.rol !== 'SUPER_ADMIN' && currentUser.rol !== 'ADMIN')) {
      return NextResponse.json({ error: 'Solo administradores pueden gestionar casas' }, { status: 403 });
    }
    await asegurarTablaTerritorio();
    const body = await request.json();
    const vereda = String(body.vereda || '').trim().toUpperCase();
    if (!VEREDAS.includes(vereda)) {
      return NextResponse.json({ error: 'Vereda inválida (A–O)' }, { status: 400 });
    }

    let lista = [];
    const casasPermitidas = new Set(getCasasPermitidasPorVereda(vereda));
    if (Array.isArray(body.casas)) lista = body.casas;
    else if (body.casa) lista = [body.casa];
    else if (body.desde && body.hasta) {
      const desde = Number(body.desde), hasta = Number(body.hasta), paso = Math.max(1, Number(body.paso) || 1);
      if (hasta < desde || hasta - desde > 500) {
        return NextResponse.json({ error: 'Rango inválido' }, { status: 400 });
      }
      for (let n = desde; n <= hasta; n += paso) {
        const casa = normalizarCasa(vereda, String(n));
        if (casasPermitidas.has(casa)) lista.push(casa);
      }
    }
    lista = lista.map(c => normalizarCasa(vereda, c)).filter(Boolean);
    const invalidas = lista.filter(c => !casasPermitidas.has(c));
    if (invalidas.length > 0) {
      return NextResponse.json({ error: `Las casas ${invalidas.join(', ')} no pertenecen a la Vereda ${vereda}.` }, { status: 400 });
    }
    if (lista.length === 0) {
      return NextResponse.json({ error: `Debe indicar al menos una casa válida para la Vereda ${vereda}.` }, { status: 400 });
    }

    const now = new Date().toISOString();
    let creadas = 0;
    for (const casa of lista) {
      const r = await db.execute({
        sql: `INSERT INTO territorio_casas (vereda, casa, orden, activo, created_at, updated_at)
              VALUES (?, ?, 1, 1, ?, ?)
              ON CONFLICT(vereda, casa) DO UPDATE SET activo = 1, updated_at = excluded.updated_at`,
        args: [vereda, casa, now, now],
      });
      creadas += Number(r.rowsAffected || 0) > 0 ? 1 : 0;
    }

    await registrarAuditoria({
      tipo_evento: 'GESTION_TERRITORIO',
      usuario_id: currentUser.id,
      usuario_nombre: currentUser.nombre,
      request,
      detalles: { accion: 'Creación/habilitación de casas en territorio', vereda, cantidad: creadas, casas: lista.slice(0, 10) }
    });

    return NextResponse.json({ success: true, message: `${creadas} casa(s) registradas en Vereda ${vereda}` });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al crear casa' }, { status: 500 });
  }
}

// PUT: renombrar casa. Body: { id, casa }. Actualiza también referencias en vecinos y censo.
export async function PUT(request) {
  try {
    const currentUser = extractUserFromRequest(request);
    if (!currentUser || (currentUser.rol !== 'SUPER_ADMIN' && currentUser.rol !== 'ADMIN')) {
      return NextResponse.json({ error: 'Solo administradores pueden gestionar casas' }, { status: 403 });
    }
    await asegurarTablaTerritorio();
    const { id, casa } = await request.json();
    if (!id || !casa) {
      return NextResponse.json({ error: 'ID y número de casa son obligatorios' }, { status: 400 });
    }
    const actual = await db.execute({ sql: 'SELECT * FROM territorio_casas WHERE id = ?', args: [Number(id)] });
    const row = actual.rows[0];
    if (!row) return NextResponse.json({ error: 'Casa no encontrada' }, { status: 404 });

    const nueva = normalizarCasa(row.vereda, casa);
    if (!esCasaValida(row.vereda, nueva)) {
      return NextResponse.json({ error: `La casa ${nueva} no pertenece a las casas válidas de la Vereda ${row.vereda}.` }, { status: 400 });
    }
    const dup = await db.execute({
      sql: 'SELECT id FROM territorio_casas WHERE vereda = ? AND casa = ? AND id != ?',
      args: [row.vereda, nueva, Number(id)],
    });
    if (dup.rows.length > 0) {
      return NextResponse.json({ error: `La casa ${nueva} ya existe en la Vereda ${row.vereda}` }, { status: 409 });
    }

    const now = new Date().toISOString();
    await db.execute({
      sql: 'UPDATE territorio_casas SET casa = ?, updated_at = ? WHERE id = ?',
      args: [nueva, now, Number(id)],
    });

    // Propagar el cambio a los registros existentes (tolerante si la tabla/columna no existe)
    const propagaciones = [
      { sql: 'UPDATE vecinos SET casa = ? WHERE UPPER(vereda) = ? AND UPPER(casa) = ?' },
      { sql: 'UPDATE censo_planillas SET numero_casa = ? WHERE UPPER(calle_vereda_av) = ? AND UPPER(numero_casa) = ?' },
    ];
    for (const p of propagaciones) {
      try {
        await db.execute({ sql: p.sql, args: [nueva, row.vereda, String(row.casa).toUpperCase()] });
      } catch (e) {
        console.warn('Propagación de casa omitida:', e.message);
      }
    }

    await registrarAuditoria({
      tipo_evento: 'GESTION_TERRITORIO',
      usuario_id: currentUser.id,
      usuario_nombre: currentUser.nombre,
      request,
      detalles: { accion: 'Renombramiento de casa', vereda: row.vereda, casa_anterior: row.casa, casa_nueva: nueva }
    });

    return NextResponse.json({ success: true, message: `Casa ${row.casa} renombrada a ${nueva}` });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al actualizar casa' }, { status: 500 });
  }
}

// DELETE: eliminar casa ?id=
export async function DELETE(request) {
  try {
    const currentUser = extractUserFromRequest(request);
    if (!currentUser || (currentUser.rol !== 'SUPER_ADMIN' && currentUser.rol !== 'ADMIN')) {
      return NextResponse.json({ error: 'Solo administradores pueden gestionar casas' }, { status: 403 });
    }
    await asegurarTablaTerritorio();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    const prev = await db.execute({ sql: 'SELECT vereda, casa FROM territorio_casas WHERE id = ?', args: [Number(id)] });
    await db.execute({ sql: 'DELETE FROM territorio_casas WHERE id = ?', args: [Number(id)] });

    await registrarAuditoria({
      tipo_evento: 'GESTION_TERRITORIO',
      usuario_id: currentUser.id,
      usuario_nombre: currentUser.nombre,
      request,
      detalles: { accion: 'Eliminación de casa del territorio', vereda: prev.rows[0]?.vereda, casa: prev.rows[0]?.casa }
    });

    return NextResponse.json({ success: true, message: 'Casa eliminada del territorio' });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al eliminar casa' }, { status: 500 });
  }
}

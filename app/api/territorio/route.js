import { NextResponse } from 'next/server';
import db from '@/lib/turso';
import { extractUserFromRequest } from '@/lib/auth';
import { VEREDAS, esCasaValida, getCasasPermitidasPorVereda, normalizarCasaVereda, validarFormatoCasa } from '@/lib/territory';
import { asegurarTablaTerritorio, cargarTerritorio } from '@/lib/territoryServer';
import { registrarAuditoria } from '@/lib/audit';

export const dynamic = 'force-dynamic';

function esAdmin(request) {
  const user = extractUserFromRequest(request);
  return user && (user.rol === 'SUPER_ADMIN' || user.rol === 'ADMIN');
}

// GET: mapa completo de veredas y casas con contadores de vecinos y censo
export async function GET() {
  try {
    const { mapa, items } = await cargarTerritorio();
    return NextResponse.json({ veredas: VEREDAS, casasPorVereda: mapa, items });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al obtener territorio' }, { status: 500 });
  }
}

// POST: crear una o varias casas (incluyendo subdivisiones como D-18A, D-18B)
// Body: { vereda, casa } | { vereda, casas: [] } | { vereda, desde, hasta, paso }
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
    if (Array.isArray(body.casas)) lista = body.casas;
    else if (body.casa) lista = [body.casa];
    else if (body.desde && body.hasta) {
      const desde = Number(body.desde), hasta = Number(body.hasta), paso = Math.max(1, Number(body.paso) || 1);
      if (hasta < desde || hasta - desde > 500) {
        return NextResponse.json({ error: 'Rango inválido' }, { status: 400 });
      }
      for (let n = desde; n <= hasta; n += paso) {
        lista.push(String(n));
      }
    }

    if (lista.length === 0) {
      return NextResponse.json({ error: `Debe indicar el número de casa para la Vereda ${vereda}.` }, { status: 400 });
    }

    // Normalizar y validar formato de cada casa
    const normalizadas = lista.map(c => normalizarCasaVereda(vereda, c)).filter(Boolean);
    const invalidas = normalizadas.filter(c => !validarFormatoCasa(vereda, c));
    if (invalidas.length > 0) {
      return NextResponse.json({
        error: `Formato de casa inválido: ${invalidas.join(', ')}. Ejemplo válido: ${vereda}-18 o ${vereda}-18B.`
      }, { status: 400 });
    }

    const now = new Date().toISOString();
    let creadas = 0;
    const creadasList = [];

    for (const casa of normalizadas) {
      // Verificar si ya existe en la base de datos
      const exist = await db.execute({
        sql: 'SELECT id, activo FROM territorio_casas WHERE vereda = ? AND casa = ?',
        args: [vereda, casa],
      });

      if (exist.rows.length > 0) {
        const row = exist.rows[0];
        if (Number(row.activo) === 1 && lista.length === 1) {
          return NextResponse.json({ error: `La casa ${casa} ya está registrada en la Vereda ${vereda}.` }, { status: 409 });
        }
        // Reactivar si estaba inactiva
        await db.execute({
          sql: 'UPDATE territorio_casas SET activo = 1, updated_at = ? WHERE id = ?',
          args: [now, Number(row.id)],
        });
        creadas++;
        creadasList.push(casa);
      } else {
        await db.execute({
          sql: `INSERT INTO territorio_casas (vereda, casa, orden, activo, created_at, updated_at)
                VALUES (?, ?, 1, 1, ?, ?)`,
          args: [vereda, casa, now, now],
        });
        creadas++;
        creadasList.push(casa);
      }
    }

    await cargarTerritorio();

    await registrarAuditoria({
      tipo_evento: 'GESTION_TERRITORIO',
      usuario_id: currentUser.id,
      usuario_nombre: currentUser.nombre,
      request,
      detalles: { accion: 'Creación/inclusión de casa en territorio', vereda, cantidad: creadas, casas: creadasList }
    });

    return NextResponse.json({
      success: true,
      message: `${creadas} casa(s) registradas exitosamente en Vereda ${vereda}: ${creadasList.join(', ')}`,
      casas: creadasList
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al crear casa' }, { status: 500 });
  }
}

// PUT: actualizar o renombrar casa (ej: D-18 a D-18A por subdivisión)
// Propaga el cambio a vecinos, censo, documentos y solicitudes automáticamente.
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

    const nueva = normalizarCasaVereda(row.vereda, casa);
    if (!validarFormatoCasa(row.vereda, nueva)) {
      return NextResponse.json({
        error: `Formato inválido para la casa '${casa}'. Ejemplo válido: ${row.vereda}-18 o ${row.vereda}-18A.`
      }, { status: 400 });
    }

    if (nueva === row.casa) {
      return NextResponse.json({ success: true, message: `La casa ya tiene la nomenclatura ${nueva}`, casa: nueva });
    }

    const dup = await db.execute({
      sql: 'SELECT id FROM territorio_casas WHERE vereda = ? AND casa = ? AND id != ? AND activo = 1',
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

    // Propagar el cambio a los registros existentes
    const propagaciones = [
      { sql: 'UPDATE vecinos SET casa = ? WHERE UPPER(vereda) = ? AND UPPER(casa) = ?' },
      { sql: 'UPDATE censo_planillas SET numero_casa = ? WHERE UPPER(calle_vereda_av) = ? AND UPPER(numero_casa) = ?' },
      { sql: 'UPDATE documentos_solicitudes SET casa = ? WHERE UPPER(vereda) = ? AND UPPER(casa) = ?' },
      { sql: 'UPDATE locales_comerciales_viviendas SET casa = ? WHERE UPPER(vereda) = ? AND UPPER(casa) = ?' },
      { sql: 'UPDATE jornadas_declaraciones SET casa = ? WHERE UPPER(vereda) = ? AND UPPER(casa) = ?' },
      { sql: 'UPDATE veredas_casas SET casa = ? WHERE UPPER(vereda) = ? AND UPPER(casa) = ?' },
    ];
    for (const p of propagaciones) {
      try {
        await db.execute({ sql: p.sql, args: [nueva, row.vereda, String(row.casa).toUpperCase()] });
      } catch (e) {
        console.warn('Propagación de casa omitida en tabla:', e.message);
      }
    }

    await cargarTerritorio();

    await registrarAuditoria({
      tipo_evento: 'GESTION_TERRITORIO',
      usuario_id: currentUser.id,
      usuario_nombre: currentUser.nombre,
      request,
      detalles: { accion: 'Renombramiento / actualización de casa', vereda: row.vereda, casa_anterior: row.casa, casa_nueva: nueva }
    });

    return NextResponse.json({ success: true, message: `Casa ${row.casa} actualizada a ${nueva}`, casa: nueva });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al actualizar casa' }, { status: 500 });
  }
}

// DELETE: eliminar casa ?id=
export async function DELETE(request) {
  try {
    const currentUser = extractUserFromRequest(request);
    if (!currentUser || currentUser.rol !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acceso restringido: Solo el SUPER_ADMIN puede eliminar casas del territorio comunal' }, { status: 403 });
    }
    await asegurarTablaTerritorio();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    const prev = await db.execute({ sql: 'SELECT vereda, casa FROM territorio_casas WHERE id = ?', args: [Number(id)] });
    if (prev.rows.length === 0) return NextResponse.json({ error: 'Casa no encontrada' }, { status: 404 });
    const { vereda, casa } = prev.rows[0];

    await db.execute({ sql: 'DELETE FROM territorio_casas WHERE id = ?', args: [Number(id)] });

    await cargarTerritorio();

    await registrarAuditoria({
      tipo_evento: 'GESTION_TERRITORIO',
      usuario_id: currentUser.id,
      usuario_nombre: currentUser.nombre,
      request,
      detalles: { accion: 'Eliminación de casa del territorio', vereda, casa }
    });

    return NextResponse.json({ success: true, message: `Casa ${casa} de la Vereda ${vereda} eliminada del territorio` });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al eliminar casa' }, { status: 500 });
  }
}

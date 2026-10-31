import db from '@/lib/turso';
import { VEREDAS, CASAS_POR_VEREDA, setCasasPorVeredaCache, ordenarCasas } from '@/lib/territory';

/**
 * Crea la tabla territorio_casas e inicializa el catálogo base si está vacío.
 * Respeta todas las casas creadas, editadas o subdivididas (ej: D-18A, D-18B).
 */
export async function asegurarTablaTerritorio() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS territorio_casas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vereda TEXT NOT NULL,
      casa TEXT NOT NULL,
      orden INTEGER NOT NULL DEFAULT 1,
      activo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(vereda, casa)
    );
  `);

  // Solo si la tabla está completamente vacía se siembra el catálogo base
  const countRes = await db.execute('SELECT COUNT(*) as total FROM territorio_casas');
  const total = Number(countRes.rows[0]?.total || 0);

  if (total === 0) {
    const now = new Date().toISOString();
    for (const v of VEREDAS) {
      const casas = CASAS_POR_VEREDA[v] || [];
      for (let i = 0; i < casas.length; i++) {
        const casa = String(casas[i]).trim().toUpperCase();
        await db.execute({
          sql: `INSERT OR IGNORE INTO territorio_casas (vereda, casa, orden, activo, created_at, updated_at)
                VALUES (?, ?, ?, 1, ?, ?)`,
          args: [v, casa, i + 1, now, now],
        });
      }
    }
  }
}

export async function listarCasasTerritorio() {
  await asegurarTablaTerritorio();
  let res;
  try {
    res = await db.execute(`
      SELECT
        t.id,
        t.vereda,
        t.casa,
        t.orden,
        t.activo,
        (SELECT COUNT(*) FROM vecinos v WHERE UPPER(v.vereda) = UPPER(t.vereda) AND UPPER(v.casa) = UPPER(t.casa)) as vecinos_count,
        (SELECT COUNT(*) FROM censo_planillas c WHERE UPPER(c.calle_vereda_av) = UPPER(t.vereda) AND UPPER(c.numero_casa) = UPPER(t.casa)) as censo_count
      FROM territorio_casas t
      WHERE t.activo = 1
    `);
  } catch (err) {
    // Fallback simple si falla subconsultas
    res = await db.execute('SELECT id, vereda, casa, orden, activo FROM territorio_casas WHERE activo = 1');
  }

  const items = (res.rows || []).map(r => ({
    id: Number(r.id),
    vereda: r.vereda,
    casa: r.casa,
    orden: Number(r.orden) || 1,
    vecinos_count: Number(r.vecinos_count || 0),
    censo_count: Number(r.censo_count || 0),
  }));

  return ordenarCasas(items);
}

/**
 * Carga el mapa { A: ['A-8', ...], ... } desde BD y actualiza la caché
 * de lib/territory para que esCasaValida/getCasasPorVereda usen datos reales.
 */
export async function cargarTerritorio() {
  try {
    const items = await listarCasasTerritorio();
    const mapa = {};
    for (const v of VEREDAS) mapa[v] = [];
    for (const it of items) {
      if (!mapa[it.vereda]) mapa[it.vereda] = [];
      mapa[it.vereda].push(it.casa);
    }
    setCasasPorVeredaCache(mapa);
    return { mapa, items };
  } catch (e) {
    console.warn('No se pudo cargar territorio desde BD, usando valores por defecto:', e);
    setCasasPorVeredaCache(null);
    return { mapa: CASAS_POR_VEREDA, items: [] };
  }
}

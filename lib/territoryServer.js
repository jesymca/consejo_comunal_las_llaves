import db from '@/lib/turso';
import { VEREDAS, CASAS_POR_VEREDA, setCasasPorVeredaCache } from '@/lib/territory';

/**
 * Crea la tabla territorio_casas y mantiene solo las casas autorizadas por vereda.
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

  const rows = await db.execute('SELECT id, vereda, casa FROM territorio_casas');
  const validas = new Set(
    VEREDAS.flatMap(v => (CASAS_POR_VEREDA[v] || []).map(c => `${v}|${String(c).trim().toUpperCase()}`))
  );

  for (const row of rows.rows || []) {
    const vereda = String(row.vereda || '').trim().toUpperCase();
    const casa = String(row.casa || '').trim().toUpperCase();
    if (!VEREDAS.includes(vereda) || !validas.has(`${vereda}|${casa}`)) {
      await db.execute('DELETE FROM territorio_casas WHERE id = ?', [Number(row.id)]);
    }
  }

  const existentes = await db.execute('SELECT vereda, casa FROM territorio_casas');
  const setExistentes = new Set(
    (existentes.rows || []).map(r => `${String(r.vereda).trim().toUpperCase()}|${String(r.casa).trim().toUpperCase()}`)
  );

  const now = new Date().toISOString();
  for (const v of VEREDAS) {
    const casas = CASAS_POR_VEREDA[v] || [];
    for (let i = 0; i < casas.length; i++) {
      const casa = String(casas[i]).trim().toUpperCase();
      const key = `${v}|${casa}`;
      if (!setExistentes.has(key)) {
        await db.execute({
          sql: `INSERT OR IGNORE INTO territorio_casas (vereda, casa, orden, activo, created_at, updated_at)
                VALUES (?, ?, ?, 1, ?, ?)`,
          args: [v, casa, i + 1, now, now],
        });
      }
    }
  }
}

function numeroDeCasa(casa) {
  const m = String(casa).match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

export async function listarCasasTerritorio() {
  await asegurarTablaTerritorio();
  const res = await db.execute('SELECT * FROM territorio_casas WHERE activo = 1');
  return res.rows
    .map(r => ({ id: Number(r.id), vereda: r.vereda, casa: r.casa, orden: Number(r.orden) || 1 }))
    .sort((a, b) => a.vereda.localeCompare(b.vereda) || numeroDeCasa(a.casa) - numeroDeCasa(b.casa));
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

/**
 * Definición estricta de Veredas y Casas del Consejo Comunal Las Llaves
 * Basado en el plano oficial y criterios territoriales aprobados.
 */

export const VEREDAS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'
];

export const CASAS_POR_VEREDA = {
  A: ['A-8', 'A-10', 'A-12', 'A-14', 'A-16', 'A-18'],
  B: Array.from({ length: 18 }, (_, i) => `B-${i + 1}`),
  C: Array.from({ length: 18 }, (_, i) => `C-${i + 1}`),
  D: Array.from({ length: 18 }, (_, i) => `D-${i + 1}`),
  E: Array.from({ length: 14 }, (_, i) => `E-${i + 5}`),
  F: Array.from({ length: 9 }, (_, i) => `F-${(i + 1) * 2}`),
  G: Array.from({ length: 18 }, (_, i) => `G-${i + 1}`),
  H: [1, 3, 5, 7, 9].map(n => `H-${n}`),
  I: Array.from({ length: 16 }, (_, i) => `I-${i + 6}`),
  J: Array.from({ length: 10 }, (_, i) => `J-${(i + 1) * 2}`),
  K: Array.from({ length: 20 }, (_, i) => `K-${i + 1}`),
  L: Array.from({ length: 18 }, (_, i) => `L-${i + 1}`),
  M: Array.from({ length: 22 }, (_, i) => `M-${i + 1}`),
  N: Array.from({ length: 21 }, (_, i) => `N-${i + 1}`),
  O: Array.from({ length: 9 }, (_, i) => `O-${(i * 2) + 1}`),
};

export function getCasasPermitidasPorVereda(vereda) {
  if (!vereda) return [];
  const v = String(vereda).trim().toUpperCase();
  return getCasasPorVereda(v);
}

export function normalizarCasaVereda(vereda, casa) {
  if (!vereda || !casa) return '';
  const v = String(vereda).trim().toUpperCase();
  let raw = String(casa).trim().toUpperCase().replace(/\s+/g, '');
  if (!raw) return '';

  // Limpiar prefijos redundantes comunes (ej: "CASA-", "CASA", "#", "N°")
  raw = raw.replace(/^(?:CASA[-_#]?|N[°#][-_]?|#)/i, '');

  // 1. Si ya inicia con `${v}-` (ej: D-18, D-18A, D-18-A, D-18B)
  if (raw.startsWith(`${v}-`)) {
    let sub = raw.slice(v.length + 1);
    sub = sub.replace(/^(\d+)-([A-Z])$/, '$1$2');
    return `${v}-${sub}`;
  }

  // 2. Si inicia con `${v}` pegado al número (ej: D18, D18A, D18B)
  if (raw.startsWith(v) && /^[A-Z]\d+/.test(raw)) {
    let sub = raw.slice(v.length);
    sub = sub.replace(/^(\d+)-([A-Z])$/, '$1$2');
    return `${v}-${sub}`;
  }

  // 3. Si inicia directamente con dígitos (ej: 18, 18A, 18-A, 18B, 18-B)
  if (/^\d+/.test(raw)) {
    raw = raw.replace(/^(\d+)-([A-Z])$/, '$1$2');
    return `${v}-${raw}`;
  }

  // 4. Si el usuario ingresó el prefijo de otra letra de vereda por error (ej: A-18 cuando la vereda activa es D)
  if (/^[A-Z]-/.test(raw)) {
    let sub = raw.slice(2);
    sub = sub.replace(/^(\d+)-([A-Z])$/, '$1$2');
    return `${v}-${sub}`;
  }

  return `${v}-${raw}`;
}

export function validarFormatoCasa(vereda, casa) {
  if (!vereda || !casa) return false;
  const v = String(vereda).trim().toUpperCase();
  if (!VEREDAS.includes(v)) return false;
  const norm = normalizarCasaVereda(v, casa);
  const regex = new RegExp(`^${v}-\\d+([A-Z0-9_-]*)$`);
  return regex.test(norm);
}

export function ordenarCasas(casas) {
  return [...casas].sort((a, b) => {
    const cA = typeof a === 'string' ? a : (a?.casa || '');
    const cB = typeof b === 'string' ? b : (b?.casa || '');
    const vA = typeof a === 'object' && a?.vereda ? a.vereda : '';
    const vB = typeof b === 'object' && b?.vereda ? b.vereda : '';
    if (vA && vB && vA !== vB) return vA.localeCompare(vB);
    return cA.localeCompare(cB, undefined, { numeric: true, sensitivity: 'base' });
  });
}

export function validarCasasParaVereda(vereda, casas) {
  const permitidas = new Set(getCasasPermitidasPorVereda(vereda));
  const entrada = Array.isArray(casas) ? casas : [casas];
  return entrada
    .map(c => normalizarCasaVereda(vereda, c))
    .filter(Boolean)
    .filter(c => permitidas.has(c));
}

export const BANCOS_VENEZUELA = [
  { id: 1, banco: "100% Banco" },
  { id: 2, banco: "Bancamiga" },
  { id: 3, banco: "Banco Activo" },
  { id: 4, banco: "Banco Agrícola de Venezuela" },
  { id: 5, banco: "Banco Caroní" },
  { id: 6, banco: "Banco de Comercio Exterior (BANCOEX)" },
  { id: 7, banco: "Banco de Desarrollo Económico y Social (BANDES)" },
  { id: 8, banco: "Banco de la Fuerza Armada Nacional Bolivariana (BANFANB)" },
  { id: 9, banco: "Banco de la Gente Emprendedora (Bangente)" },
  { id: 10, banco: "Banco de Venezuela" },
  { id: 11, banco: "Banco del Caribe (Bancaribe)" },
  { id: 12, banco: "Banco del Tesoro" },
  { id: 13, banco: "Banco Digital de los Trabajadores" },
  { id: 14, banco: "Banco Exterior" },
  { id: 15, banco: "Banco Internacional de Desarrollo" },
  { id: 16, banco: "Banco Nacional de Crédito (BNC)" },
  { id: 17, banco: "Banco Nacional de Vivienda y Hábitat (BANAVIH)" },
  { id: 18, banco: "Banco Plaza" },
  { id: 19, banco: "Banco Provincial" },
  { id: 20, banco: "Banco Sofitasa" },
  { id: 21, banco: "Bancrecer" },
  { id: 22, banco: "Banesco" },
  { id: 23, banco: "Banplus" },
  { id: 24, banco: "BFC Banco Fondo Común" },
  { id: 25, banco: "Del Sur Banco Universal" },
  { id: 26, banco: "Instituto Municipal de Crédito Popular (IMCP)" },
  { id: 27, banco: "Mercantil" },
  { id: 28, banco: "N58 Banco Digital" },
  { id: 29, banco: "R4 Banco Microfinanciero" },
  { id: 30, banco: "Venezolano de Crédito" },
];

export const CALIDADES_TENENCIA = [
  'Propia',
  'Alquilada',
  'En Cuido',
  'Familia Adjunta / Agregada',
  'Otro'
];

/**
 * Catálogos oficiales de codificación por letra del censo
 */
export const MAPEO_PARENTESCO = {
  a: 'Jefe(a)',
  b: 'Cónyuge',
  c: 'Hijo(a)',
  d: 'Madre/Padre',
  e: 'Abuelo(a)',
  f: 'Tíos/Tías',
};

export const MAPEO_INSTRUCCION = {
  a: 'Ninguno',
  b: 'Primaria',
  c: 'Secundaria',
  d: 'TSU',
  e: 'Universitario',
  f: 'Postgrado',
};

export const MAPEO_SALUD = {
  a: 'Discapacidad',
  b: 'En cama',
  c: 'Crónica',
  d: 'Silla de Ruedas',
  e: 'Ninguna',
};

export function decodificarParentesco(val, customMap = null) {
  if (!val) return 'Jefe(a)';
  const lower = val.toString().trim().toLowerCase();
  if (customMap && customMap[lower]) return customMap[lower];
  return MAPEO_PARENTESCO[lower] || val;
}

export function decodificarInstruccion(val, customMap = null) {
  if (!val) return 'Secundaria';
  const lower = val.toString().trim().toLowerCase();
  if (customMap && customMap[lower]) return customMap[lower];
  return MAPEO_INSTRUCCION[lower] || val;
}

export function decodificarSalud(val, customMap = null) {
  if (!val) return 'Ninguna';
  const lower = val.toString().trim().toLowerCase();
  if (customMap && customMap[lower]) return customMap[lower];
  return MAPEO_SALUD[lower] || val;
}

/**
 * Caché dinámica del territorio (cargada desde BD vía /api/territorio).
 * Si existe, sustituye a los valores por defecto de CASAS_POR_VEREDA.
 */
let _casasCache = null;

export function setCasasPorVeredaCache(mapa) {
  _casasCache = mapa && typeof mapa === 'object' ? mapa : null;
}

export function getMapaCasas() {
  return _casasCache || CASAS_POR_VEREDA;
}

export function getVeredas() {
  return VEREDAS;
}

export function getCasasPorVereda(vereda) {
  if (!vereda) return [];
  const v = vereda.toUpperCase().trim();
  return (getMapaCasas()[v] || []).map(c => String(c).trim().toUpperCase());
}

export function esCasaValida(vereda, casa) {
  if (!vereda || !casa) return false;
  const norm = normalizarCasaVereda(vereda, casa);
  if (!norm) return false;
  const casas = getCasasPorVereda(vereda);
  return casas.includes(norm);
}

/**
 * Normaliza una cédula venezolana al formato V-12345678 o E-12345678
 */
export function normalizarCedula(cedula) {
  if (!cedula) return '';
  const clean = cedula.toString().trim().toUpperCase().replace(/[\s\.-]/g, '');
  if (clean.startsWith('V') || clean.startsWith('E')) {
    const letra = clean.charAt(0);
    const num = clean.slice(1);
    return `${letra}-${num}`;
  }
  // Si solo enviaron números, asumir V
  return `V-${clean}`;
}


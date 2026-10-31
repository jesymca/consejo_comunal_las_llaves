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

export function normalizarTextoComparacion(txt) {
  return String(txt || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extraerDigitosCedula(ced) {
  return String(ced || '').replace(/\D+/g, '');
}

export function tokensSimilares(t1, t2) {
  if (t1 === t2) return true;
  if (t1.length >= 5 && t2.length >= 5) {
    if (t1.slice(0, -1) === t2.slice(0, -1)) return true;
    if (t1.startsWith(t2) || t2.startsWith(t1)) return true;
  }
  return false;
}

export function esMismaPersonaEnVivienda(hab, vec) {
  if (!hab || !vec) return false;
  if (hab.vecino_id && Number(hab.vecino_id) === Number(vec.id)) return true;

  const digHab = extraerDigitosCedula(hab.cedula);
  const digVec = extraerDigitosCedula(vec.cedula);
  if (digHab.length >= 5 && digVec.length >= 5 && digHab === digVec) {
    return true;
  }

  const nomHab = normalizarTextoComparacion(hab.nombres_apellidos);
  const nomVec = normalizarTextoComparacion(`${vec.nombres || ''} ${vec.apellidos || ''}`);
  if (!nomHab || !nomVec) return false;
  if (nomHab === nomVec) return true;

  const tokHab = nomHab.split(' ').filter((w) => w.length >= 3);
  const tokVec = nomVec.split(' ').filter((w) => w.length >= 3);
  if (tokHab.length >= 2 && tokVec.length >= 2) {
    const menor = tokHab.length <= tokVec.length ? tokHab : tokVec;
    const mayor = tokHab.length <= tokVec.length ? tokVec : tokHab;
    const todosCoinciden = menor.every((m) => mayor.some((M) => tokensSimilares(m, M)));
    if (todosCoinciden) return true;
  }

  return false;
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

/**
 * Normaliza cualquier fecha a formato estándar ISO YYYY-MM-DD.
 * Admite formatos como DD/MM/AAAA, DD-MM-AAAA, AAAA-MM-DD y AAAA/MM/DD o 8 dígitos seguidos.
 * Si la fecha no es válida en el calendario o tiene texto no fechable, retorna cadena vacía ''.
 */
export function normalizarFechaISO(val) {
  if (!val) return '';
  const str = String(val).trim();
  if (!str) return '';

  // Caso 8 dígitos continuos (ej: 15081995)
  if (/^\d{8}$/.test(str)) {
    const d = parseInt(str.slice(0, 2), 10);
    const m = parseInt(str.slice(2, 4), 10);
    const y = parseInt(str.slice(4), 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
      const dt = new Date(y, m - 1, d);
      if (dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d) {
        return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
    return '';
  }

  // Caso 1: YYYY-MM-DD o YYYY/MM/DD
  const mIso = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (mIso) {
    const y = parseInt(mIso[1], 10);
    const m = parseInt(mIso[2], 10);
    const d = parseInt(mIso[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
      const dt = new Date(y, m - 1, d);
      if (dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d) {
        return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
    return '';
  }

  // Caso 2: DD/MM/YYYY o DD-MM-YYYY
  const mLat = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (mLat) {
    const d = parseInt(mLat[1], 10);
    const m = parseInt(mLat[2], 10);
    const y = parseInt(mLat[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
      const dt = new Date(y, m - 1, d);
      if (dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d) {
        return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
    return '';
  }

  return '';
}

/**
 * Convierte una fecha a formato latino visible DD/MM/AAAA.
 */
export function formatearFechaLatina(val) {
  if (!val) return '';
  const norm = normalizarFechaISO(val);
  if (!norm) return '';
  const [y, m, d] = norm.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Valida si un valor es una fecha real y no futura (si noFuturo=true).
 */
export function validarFechaValida(val, permitirFuturo = false) {
  if (!val) return { valida: false, error: 'Fecha no proporcionada' };
  const str = String(val).trim();
  const iso = normalizarFechaISO(str);

  if (!iso) {
    return {
      valida: false,
      error: 'Debe ingresar una fecha real válida (DD/MM/AAAA o AAAA-MM-DD)'
    };
  }

  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);

  if (!permitirFuturo) {
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);
    if (dt > hoy) {
      return {
        valida: false,
        error: 'La fecha no puede ser futura'
      };
    }
  }

  return {
    valida: true,
    iso,
    latino: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${String(y).padStart(4, '0')}`,
  };
}


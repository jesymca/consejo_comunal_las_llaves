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
  E: Array.from({ length: 14 }, (_, i) => `E-${i + 5}`), // E-5 hasta E-18
  F: [2, 4, 6, 8, 10, 12, 14, 16, 18].map(n => `F-${n}`),
  G: Array.from({ length: 18 }, (_, i) => `G-${i + 1}`),
  H: [1, 3, 5, 7, 9].map(n => `H-${n}`),
  I: Array.from({ length: 16 }, (_, i) => `I-${i + 6}`), // I-6 hasta I-21
  J: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20].map(n => `J-${n}`),
  K: Array.from({ length: 20 }, (_, i) => `K-${i + 1}`),
  L: Array.from({ length: 18 }, (_, i) => `L-${i + 1}`),
  M: Array.from({ length: 22 }, (_, i) => `M-${i + 1}`),
  N: Array.from({ length: 21 }, (_, i) => `N-${i + 1}`),
  O: [1, 3, 5, 7, 9, 11, 13, 15, 17].map(n => `O-${n}`),
};

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

export function getCasasPorVereda(vereda) {
  if (!vereda) return [];
  const v = vereda.toUpperCase().trim();
  return CASAS_POR_VEREDA[v] || [];
}

export function esCasaValida(vereda, casa) {
  if (!vereda || !casa) return false;
  const casas = getCasasPorVereda(vereda);
  return casas.includes(casa.toUpperCase().trim());
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

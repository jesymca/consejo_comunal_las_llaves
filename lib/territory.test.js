import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CASAS_POR_VEREDA,
  esCasaValida,
  getCasasPermitidasPorVereda,
  validarCasasParaVereda,
  normalizarCasaVereda,
  validarFormatoCasa,
  ordenarCasas,
  setCasasPorVeredaCache,
} from './territory.js';

test('catalogo oficial de veredas y casas incluye todas las veredas A-O', () => {
  assert.deepEqual(Object.keys(CASAS_POR_VEREDA), ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O']);
  assert.deepEqual(CASAS_POR_VEREDA.A, ['A-8', 'A-10', 'A-12', 'A-14', 'A-16', 'A-18']);
  assert.deepEqual(CASAS_POR_VEREDA.O, ['O-1', 'O-3', 'O-5', 'O-7', 'O-9', 'O-11', 'O-13', 'O-15', 'O-17']);
});

test('las casas validas son estrictamente las permitidas por vereda (modo estatico)', () => {
  setCasasPorVeredaCache(null);
  assert.equal(esCasaValida('A', 'A-10'), true);
  assert.equal(esCasaValida('A', 'A-11'), false);
  assert.equal(esCasaValida('F', 'F-10'), true);
  assert.equal(esCasaValida('F', 'F-12'), true);
  assert.equal(esCasaValida('F', 'F-11'), false);
  assert.equal(esCasaValida('O', 'O-15'), true);
  assert.equal(esCasaValida('O', 'O-16'), false);
});

test('la validacion por vereda rechaza entradas no autorizadas y conserva los valores permitidos', () => {
  setCasasPorVeredaCache(null);
  const permitidas = getCasasPermitidasPorVereda('H');
  assert.deepEqual(permitidas, ['H-1', 'H-3', 'H-5', 'H-7', 'H-9']);

  assert.deepEqual(validarCasasParaVereda('H', ['H-1', 'H-3', 'H-5', 'H-8']), ['H-1', 'H-3', 'H-5']);
  assert.deepEqual(validarCasasParaVereda('H', ['H-9']), ['H-9']);
});

test('normalizacion de casas asigna prefijo de vereda y respeta nomenclaturas estandar y subdivididas (D-18, D-18A, D-18B)', () => {
  // Caso estándar: número puro asigna formato V-NUMERO
  assert.equal(normalizarCasaVereda('D', '18'), 'D-18');
  assert.equal(normalizarCasaVereda('D', 'D-18'), 'D-18');
  assert.equal(normalizarCasaVereda('D', 'd-18'), 'D-18');
  assert.equal(normalizarCasaVereda('D', 'D18'), 'D-18');
  assert.equal(normalizarCasaVereda('D', 'CASA 18'), 'D-18');

  // Caso subdivisión: casa dividida en 2 o más individuales (D-18A, D-18B)
  assert.equal(normalizarCasaVereda('D', '18A'), 'D-18A');
  assert.equal(normalizarCasaVereda('D', '18a'), 'D-18A');
  assert.equal(normalizarCasaVereda('D', 'D-18A'), 'D-18A');
  assert.equal(normalizarCasaVereda('D', '18-A'), 'D-18A');
  assert.equal(normalizarCasaVereda('D', 'D18A'), 'D-18A');
  assert.equal(normalizarCasaVereda('D', '18B'), 'D-18B');
  assert.equal(normalizarCasaVereda('D', 'D-18B'), 'D-18B');
  assert.equal(normalizarCasaVereda('D', '18-B'), 'D-18B');
  assert.equal(normalizarCasaVereda('D', 'D-18-B'), 'D-18B');

  // Si ingresa por error otra vereda pero seleccionó vereda D
  assert.equal(normalizarCasaVereda('D', 'A-18A'), 'D-18A');
});

test('validacion de formato de casa aprueba casas estandar y subdivisiones validas', () => {
  assert.equal(validarFormatoCasa('D', 'D-18'), true);
  assert.equal(validarFormatoCasa('D', '18'), true);
  assert.equal(validarFormatoCasa('D', 'D-18A'), true);
  assert.equal(validarFormatoCasa('D', '18A'), true);
  assert.equal(validarFormatoCasa('D', 'D-18B'), true);
  assert.equal(validarFormatoCasa('D', '18B'), true);

  // Formatos inválidos
  assert.equal(validarFormatoCasa('D', ''), false);
  assert.equal(validarFormatoCasa('D', 'ABC'), false);
  assert.equal(validarFormatoCasa('Z', 'Z-18'), false); // vereda inexistente
});

test('ordenamiento natural de casas ordena adecuadamente subdivisiones alfanumericas (D-1, D-2, D-18, D-18A, D-18B, D-19)', () => {
  const desordenadas = ['D-19', 'D-18B', 'D-2', 'D-18', 'D-1', 'D-18A', 'D-10'];
  const ordenadas = ordenarCasas(desordenadas);
  assert.deepEqual(ordenadas, ['D-1', 'D-2', 'D-10', 'D-18', 'D-18A', 'D-18B', 'D-19']);
});

test('cache dinamico reconoce y valida casas nuevas y subdivididas creadas en el sistema', () => {
  const mapaDinamico = {
    ...CASAS_POR_VEREDA,
    D: [...CASAS_POR_VEREDA.D, 'D-18A', 'D-18B'],
  };
  setCasasPorVeredaCache(mapaDinamico);

  assert.equal(esCasaValida('D', 'D-18'), true);
  assert.equal(esCasaValida('D', 'D-18A'), true);
  assert.equal(esCasaValida('D', 'D-18B'), true);
  assert.equal(esCasaValida('D', '18A'), true);
  assert.equal(esCasaValida('D', '18B'), true);
  assert.equal(esCasaValida('D', 'D-99'), false);

  setCasasPorVeredaCache(null); // Limpiar caché
});

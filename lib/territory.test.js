import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CASAS_POR_VEREDA,
  esCasaValida,
  getCasasPermitidasPorVereda,
  validarCasasParaVereda,
} from './territory.js';

test('catalogo oficial de veredas y casas incluye todas las veredas A-O', () => {
  assert.deepEqual(Object.keys(CASAS_POR_VEREDA), ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O']);
  assert.deepEqual(CASAS_POR_VEREDA.A, ['A-8', 'A-10', 'A-12', 'A-14', 'A-16', 'A-18']);
  assert.deepEqual(CASAS_POR_VEREDA.O, ['O-1', 'O-3', 'O-5', 'O-7', 'O-9', 'O-11', 'O-13', 'O-15', 'O-17']);
});

test('las casas validas son estrictamente las permitidas por vereda', () => {
  assert.equal(esCasaValida('A', 'A-10'), true);
  assert.equal(esCasaValida('A', 'A-11'), false);
  assert.equal(esCasaValida('F', 'F-10'), true);
  assert.equal(esCasaValida('F', 'F-12'), true);
  assert.equal(esCasaValida('F', 'F-11'), false);
  assert.equal(esCasaValida('O', 'O-15'), true);
  assert.equal(esCasaValida('O', 'O-16'), false);
});

test('la validacion por vereda rechaza entradas no autorizadas y conserva los valores permitidos', () => {
  const permitidas = getCasasPermitidasPorVereda('H');
  assert.deepEqual(permitidas, ['H-1', 'H-3', 'H-5', 'H-7', 'H-9']);

  assert.deepEqual(validarCasasParaVereda('H', ['H-1', 'H-3', 'H-5', 'H-8']), ['H-1', 'H-3', 'H-5']);
  assert.deepEqual(validarCasasParaVereda('H', ['H-9']), ['H-9']);
});

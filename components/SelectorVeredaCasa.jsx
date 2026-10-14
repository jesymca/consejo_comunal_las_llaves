'use client';

import React, { useEffect, useState } from 'react';
import { useTerritorio } from '@/lib/useTerritorio';

/**
 * Pareja de selects Vereda → Casa. Al elegir una vereda se habilitan
 * automáticamente solo sus casas disponibles (configurables en #configuracion).
 * Compatible con formularios no controlados (FormData) mediante `name`.
 */
export default function SelectorVeredaCasa({
  nameVereda = 'vereda',
  nameCasa = 'casa',
  defaultVereda = 'A',
  defaultCasa = '',
  labelVereda = 'Vereda *',
  labelCasa = 'N° Casa *',
  selectClassName = 'w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white font-semibold focus:border-blue-500 outline-none',
  labelClassName = 'block text-slate-400 mb-1',
  idPrefix = 'selector',
}) {
  const { veredas, casasPorVereda, loading } = useTerritorio();
  const [vereda, setVereda] = useState((defaultVereda || 'A').toUpperCase());
  const [casa, setCasa] = useState((defaultCasa || '').toUpperCase());

  // Re-sincronizar si cambian los valores por defecto (ej. al editar otra planilla)
  useEffect(() => {
    setVereda((defaultVereda || 'A').toUpperCase());
    setCasa((defaultCasa || '').toUpperCase());
  }, [defaultVereda, defaultCasa]);

  const casas = casasPorVereda[vereda] || [];
  // Conserva una casa histórica que ya no exista en el catálogo para no perder el dato al editar
  const opciones = casa && !casas.includes(casa) ? [casa, ...casas] : casas;

  const cambiarVereda = (v) => {
    setVereda(v);
    setCasa('');
  };

  return (
    <>
      <div>
        <label htmlFor={`${idPrefix}-vereda`} className={labelClassName}>{labelVereda}</label>
        <select
          id={`${idPrefix}-vereda`}
          name={nameVereda}
          value={vereda}
          onChange={e => cambiarVereda(e.target.value)}
          className={selectClassName}
        >
          {veredas.map(v => <option key={v} value={v}>Vereda {v}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-casa`} className={labelClassName}>{labelCasa}</label>
        <select
          id={`${idPrefix}-casa`}
          name={nameCasa}
          required
          value={casa}
          onChange={e => setCasa(e.target.value)}
          disabled={!vereda || (opciones.length === 0 && !loading)}
          className={`${selectClassName} uppercase font-bold disabled:opacity-50`}
        >
          <option value="">
            {loading && opciones.length === 0 ? 'Cargando...' : opciones.length === 0 ? 'Sin casas registradas' : `Seleccione (${casas.length} disponibles)`}
          </option>
          {opciones.map(c => (
            <option key={c} value={c}>{c}{!casas.includes(c) ? ' (no catalogada)' : ''}</option>
          ))}
        </select>
      </div>
    </>
  );
}

'use client';

import React, { useMemo, useState } from 'react';
import {
  MapPin, Home, Plus, Edit, Trash2, Check, X, RefreshCw,
  Layers, Users, FileText, Search, Sparkles, AlertCircle
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { useTerritorio, notificarTerritorioActualizado } from '@/lib/useTerritorio';
import { normalizarCasaVereda, validarFormatoCasa } from '@/lib/territory';

/**
 * Configurador de Veredas (A–O) y sus casas.
 * Admite asignación estándar (ej: D-18), actualización/renombrado (ej: D-18 -> D-18A)
 * y creación de nuevas subdivisiones o anexos multifamiliares (ej: D-18B, D-18C).
 */
export default function ConfiguradorTerritorio() {
  const { veredas, items, loading, recargar } = useTerritorio();
  const [veredaSel, setVeredaSel] = useState('A');
  const [nuevaCasa, setNuevaCasa] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [rango, setRango] = useState({ desde: '', hasta: '', paso: 1 });
  const [editId, setEditId] = useState(null);
  const [editValor, setEditValor] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Normalización en vivo de la nueva casa que se está escribiendo
  const previewNueva = useMemo(() => {
    if (!nuevaCasa.trim()) return '';
    return normalizarCasaVereda(veredaSel, nuevaCasa);
  }, [veredaSel, nuevaCasa]);

  // Normalización en vivo del valor en edición
  const previewEdit = useMemo(() => {
    if (!editValor.trim()) return '';
    return normalizarCasaVereda(veredaSel, editValor);
  }, [veredaSel, editValor]);

  // Casas de la vereda activa
  const todasCasasVereda = useMemo(() => {
    return items.filter(i => i.vereda === veredaSel);
  }, [items, veredaSel]);

  // Casas filtradas por búsqueda
  const casasVereda = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return todasCasasVereda;
    return todasCasasVereda.filter(i => i.casa.toUpperCase().includes(q));
  }, [todasCasasVereda, busqueda]);

  // Conteo de casas por vereda
  const conteo = useMemo(() => {
    const c = {};
    for (const it of items) c[it.vereda] = (c[it.vereda] || 0) + 1;
    return c;
  }, [items]);

  // Estadísticas globales del territorio
  const statsTerritorio = useMemo(() => {
    const total = items.length;
    let subdivisiones = 0;
    let conHabitantes = 0;
    let conCenso = 0;
    for (const it of items) {
      if (/[A-Z]$/.test(it.casa) || /-[A-Z0-9]+$/.test(it.casa.replace(/^[A-Z]-\d+/, ''))) {
        subdivisiones++;
      }
      if ((it.vecinos_count || 0) > 0) conHabitantes++;
      if ((it.censo_count || 0) > 0) conCenso++;
    }
    return { total, subdivisiones, conHabitantes, conCenso };
  }, [items]);

  // Verifica si una nomenclatura ya existe en la vereda
  const existeNueva = useMemo(() => {
    if (!previewNueva) return false;
    return todasCasasVereda.some(i => i.casa.toUpperCase() === previewNueva.toUpperCase());
  }, [todasCasasVereda, previewNueva]);

  const tras = async (res) => {
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      toast.success(data.message || 'Operación exitosa');
      await recargar();
      notificarTerritorioActualizado();
      return true;
    }
    toast.error(data.error || 'Error en la operación');
    return false;
  };

  const crear = async (payload) => {
    setGuardando(true);
    try {
      const res = await fetch('/api/territorio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vereda: veredaSel, ...payload }),
      });
      return await tras(res);
    } catch (e) {
      toast.error('Error de red al registrar casa');
    } finally {
      setGuardando(false);
    }
  };

  const crearUna = async (e) => {
    e?.preventDefault?.();
    if (!nuevaCasa.trim()) return toast.error('Indique el número o nomenclatura de la casa');
    const valorFinal = previewNueva || normalizarCasaVereda(veredaSel, nuevaCasa);
    if (!validarFormatoCasa(veredaSel, valorFinal)) {
      return toast.error(`Nomenclatura no válida. Ejemplo: ${veredaSel}-18 o ${veredaSel}-18A`);
    }
    if (await crear({ casa: valorFinal })) {
      setNuevaCasa('');
    }
  };

  const crearRango = async (e) => {
    e.preventDefault();
    if (!rango.desde || !rango.hasta) return toast.error('Indique desde y hasta');
    if (await crear({ desde: rango.desde, hasta: rango.hasta, paso: rango.paso })) {
      setRango({ desde: '', hasta: '', paso: 1 });
    }
  };

  const guardarEdicion = async (item) => {
    if (!editValor.trim()) return;
    const valorFinal = previewEdit || normalizarCasaVereda(item.vereda, editValor);
    if (!validarFormatoCasa(item.vereda, valorFinal)) {
      return toast.error(`Formato inválido. Ejemplo: ${item.vereda}-18 o ${item.vereda}-18A`);
    }
    try {
      const res = await fetch('/api/territorio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, casa: valorFinal }),
      });
      if (await tras(res)) setEditId(null);
    } catch (e) {
      toast.error('Error de red al actualizar casa');
    }
  };

  const eliminar = async (item) => {
    let advertencia = `¿Eliminar la casa ${item.casa} de la Vereda ${item.vereda}?`;
    if ((item.vecinos_count || 0) > 0 || (item.censo_count || 0) > 0) {
      advertencia = `⚠️ ATENCIÓN: La casa ${item.casa} tiene ${item.vecinos_count || 0} vecino(s) y ${item.censo_count || 0} planilla(s) de censo vinculadas.\n\n¿Deseas retirarla del catálogo territorial? (Los registros históricos no se borrarán, pero la casa ya no se podrá seleccionar).`;
    }
    if (!confirm(advertencia)) return;
    try {
      const res = await fetch(`/api/territorio?id=${item.id}`, { method: 'DELETE' });
      await tras(res);
    } catch (e) {
      toast.error('Error de red al eliminar casa');
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
      {/* Cabecera y Resumen Territorial */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-2xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 shrink-0">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight">
                Configurador Territorial: Veredas y Casas
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                {statsTerritorio.total} Viviendas
              </span>
              {statsTerritorio.subdivisiones > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {statsTerritorio.subdivisiones} Subdivididas (A/B/C)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Asigna números estándar (ej. <strong>D-18</strong>), edita nomenclaturas por ampliación o subdivisión familiar (ej. <strong>D-18A</strong>) o agrega nuevas viviendas independientes (ej. <strong>D-18B</strong>). Los cambios se sincronizan en <strong>Censo</strong>, <strong>Vecinos</strong>, <strong>Documentos</strong> y <strong>Estadísticas</strong>.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={recargar}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs transition border border-slate-700/60 shadow-sm shrink-0 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>{loading ? 'Sincronizando...' : 'Recargar Catálogo'}</span>
        </button>
      </div>

      {/* Selector de Veredas A a O */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Selecciona la Vereda a Gestionar (A – O):
          </label>
          <span className="text-[11px] text-slate-400">
            Mostrando <strong>Vereda {veredaSel}</strong> ({todasCasasVereda.length} casas)
          </span>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-15 gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))' }}>
          {veredas.map(v => (
            <button
              key={v}
              id={`territorio-vereda-${v}`}
              type="button"
              onClick={() => { setVeredaSel(v); setEditId(null); setBusqueda(''); }}
              className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                veredaSel === v
                  ? 'bg-gradient-to-b from-cyan-600/40 to-cyan-600/20 border-cyan-400 text-white shadow-lg shadow-cyan-900/40 scale-105'
                  : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-cyan-500/40 hover:bg-slate-900'
              }`}
            >
              <div className="text-base font-black font-mono">{v}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{conteo[v] || 0} c.</div>
            </button>
          ))}
        </div>
      </div>

      {/* Contenido en 2 columnas: Formularios y Listado */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Columna Izquierda: Formularios de Creación y Subdivisiones */}
        <div className="space-y-4">
          
          {/* Formulario 1: Nueva Casa / Subdivisión */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
              <Plus className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Nueva Casa en Vereda {veredaSel}
              </h4>
            </div>

            <form onSubmit={crearUna} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Número o Nomenclatura:
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      id="territorio-nueva-casa"
                      type="text"
                      value={nuevaCasa}
                      onChange={e => setNuevaCasa(e.target.value)}
                      placeholder={`Ej: 18, 18A o ${veredaSel}-18B`}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs uppercase font-bold focus:border-cyan-500 outline-none transition"
                    />
                  </div>
                  <button
                    disabled={guardando || !nuevaCasa.trim() || existeNueva}
                    className="shrink-0 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-md shadow-cyan-600/20"
                  >
                    {guardando ? 'Guardando...' : 'Registrar'}
                  </button>
                </div>
              </div>

              {/* Vista previa de nomenclatura calculada */}
              {previewNueva && (
                <div className={`p-2.5 rounded-xl text-xs flex items-center justify-between border ${
                  existeNueva
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                }`}>
                  <div className="flex items-center gap-1.5">
                    {existeNueva ? <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> : <Sparkles className="w-3.5 h-3.5 text-cyan-400" />}
                    <span>Nomenclatura asignada:</span>
                    <strong className="font-mono text-white text-sm bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {previewNueva}
                    </strong>
                  </div>
                  {existeNueva && (
                    <span className="text-[10px] font-bold text-rose-400">Ya existe</span>
                  )}
                </div>
              )}

              {/* Píldoras de sugerencias rápidas para subdivisiones comunes */}
              {nuevaCasa.trim() && /^\d+/.test(nuevaCasa.trim()) && (
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] text-slate-400 block font-medium">Sugerencias para casas divididas:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['', 'A', 'B', 'C'].map(sufijo => {
                      const baseNum = nuevaCasa.trim().match(/^\d+/)?.[0] || '18';
                      const sugerencia = `${veredaSel}-${baseNum}${sufijo}`;
                      return (
                        <button
                          key={sugerencia}
                          type="button"
                          onClick={() => setNuevaCasa(`${baseNum}${sufijo}`)}
                          className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] font-mono text-cyan-300 border border-slate-700 hover:border-cyan-500 transition"
                        >
                          {sugerencia}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                💡 <strong>Ejemplo:</strong> Si introduces <code>18</code> se asigna <strong>{veredaSel}-18</strong>. Si la casa fue subdividida en varias familias, asigna <code>18A</code> o <code>18B</code> para crear <strong>{veredaSel}-18A</strong> y <strong>{veredaSel}-18B</strong>.
              </p>
            </form>
          </div>

          {/* Formulario 2: Generar Rango Numérico Masivo */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Generar Rango Numérico
              </h4>
            </div>

            <form onSubmit={crearRango} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[['desde', 'Desde (N°)'], ['hasta', 'Hasta (N°)'], ['paso', 'Paso']].map(([k, label]) => (
                  <div key={k}>
                    <label className="block text-[10px] text-slate-400 mb-0.5 font-medium">{label}</label>
                    <input
                      type="number"
                      min="1"
                      value={rango[k]}
                      onChange={e => setRango(r => ({ ...r, [k]: e.target.value }))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 outline-none transition"
                    />
                  </div>
                ))}
              </div>
              <button
                disabled={guardando || !rango.desde || !rango.hasta}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-bold transition border border-slate-700"
              >
                Generar Casas en Serie
              </button>
            </form>
          </div>

        </div>

        {/* Columna Derecha: Catálogo de Casas con Búsqueda y Edición */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4 flex flex-col">
          
          {/* Barra de cabecera de la vereda */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Casas Registradas en Vereda {veredaSel}
              </h4>
              <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 font-bold">
                {todasCasasVereda.length}
              </span>
            </div>

            {/* Buscador rápido dentro de la vereda */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar casa (ej: 18)..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 outline-none transition font-semibold"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Grilla de Casas */}
          {loading && items.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400 flex flex-col items-center justify-center flex-1">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mb-2" />
              <span>Cargando catálogo territorial...</span>
            </div>
          ) : casasVereda.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500 flex flex-col items-center justify-center flex-1 space-y-1">
              <Home className="w-8 h-8 text-slate-700 stroke-1 mb-1" />
              <span className="font-semibold text-slate-400">
                {busqueda ? `No se encontraron casas que coincidan con "${busqueda}"` : `La Vereda ${veredaSel} no tiene casas registradas aún.`}
              </span>
              <span className="text-[11px]">Utiliza el formulario de la izquierda para registrar una casa.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
              {casasVereda.map(item => {
                const esSub = /[A-Z]$/.test(item.casa) || /-[A-Z0-9]+$/.test(item.casa.replace(/^[A-Z]-\d+/, ''));
                const enEdicion = editId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`group relative flex flex-col justify-between p-2.5 rounded-2xl border transition text-xs ${
                      enEdicion
                        ? 'bg-cyan-950/40 border-cyan-400 shadow-lg shadow-cyan-950/50'
                        : esSub
                        ? 'bg-slate-900/90 border-amber-500/30 hover:border-amber-400/60 shadow-sm'
                        : 'bg-slate-900/90 border-slate-800 hover:border-cyan-500/40'
                    }`}
                  >
                    {enEdicion ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-cyan-400 uppercase">Editar Casa:</span>
                          <span className="text-[10px] font-mono text-slate-400">{item.casa}</span>
                        </div>
                        <input
                          autoFocus
                          value={editValor}
                          onChange={e => setEditValor(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') guardarEdicion(item);
                            if (e.key === 'Escape') setEditId(null);
                          }}
                          placeholder={`Ej: ${item.casa}A`}
                          className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-cyan-500 text-white text-xs uppercase font-mono font-bold outline-none"
                        />
                        {previewEdit && previewEdit !== item.casa && (
                          <div className="text-[10px] text-cyan-300 font-mono flex items-center gap-1">
                            <span>➔ {previewEdit}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-end gap-1 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditId(null)}
                            title="Cancelar"
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => guardarEdicion(item)}
                            title="Guardar cambios"
                            className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm"
                          >
                            <Check className="w-3 h-3" />
                            <span>Guardar</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <span className="font-mono font-extrabold text-sm text-white tracking-wide">
                            {item.casa}
                          </span>
                          {esSub && (
                            <span
                              title="Casa subdividida / anexo familiar"
                              className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            >
                              División
                            </span>
                          )}
                        </div>

                        {/* Indicadores de datos vinculados (vecinos y planillas de censo) */}
                        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800/80">
                          <div className="flex items-center gap-2">
                            {(item.vecinos_count || 0) > 0 ? (
                              <span
                                title={`${item.vecinos_count} vecino(s) registrado(s)`}
                                className="flex items-center gap-1 font-semibold text-emerald-400"
                              >
                                <Users className="w-3 h-3" />
                                {item.vecinos_count}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[9px]">0 hab</span>
                            )}

                            {(item.censo_count || 0) > 0 && (
                              <span
                                title={`${item.censo_count} planilla(s) de censo vinculada(s)`}
                                className="flex items-center gap-1 font-semibold text-blue-400"
                              >
                                <FileText className="w-3 h-3" />
                                {item.censo_count}
                              </span>
                            )}
                          </div>

                          {/* Acciones de Edición y Eliminación */}
                          <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition">
                            <button
                              type="button"
                              title={`Editar / renombrar casa ${item.casa} (ej: a ${item.casa}A)`}
                              onClick={() => { setEditId(item.id); setEditValor(item.casa); }}
                              className="p-1 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              title={`Eliminar casa ${item.casa}`}
                              onClick={() => eliminar(item)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pie de catálogo con resumen */}
          <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <div>
              Total en Vereda {veredaSel}: <strong className="text-white">{todasCasasVereda.length}</strong> casas
              {busqueda && ` (${casasVereda.length} coinciden con "${busqueda}")`}
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Habitantes registrados</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>Subdivisiones familiares</span>
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

'use client';

import React, { useMemo, useState } from 'react';
import { MapPin, Home, Plus, Edit, Trash2, Check, X, RefreshCw, Layers } from 'lucide-react';
import { toast } from '@/lib/toast';
import { useTerritorio, notificarTerritorioActualizado } from '@/lib/useTerritorio';
import { getCasasPermitidasPorVereda } from '@/lib/territory';

/**
 * Configurador de Veredas (A–O) y sus casas. CRUD conectado a /api/territorio.
 */
export default function ConfiguradorTerritorio() {
  const { veredas, items, loading, recargar } = useTerritorio();
  const [veredaSel, setVeredaSel] = useState('A');
  const [nuevaCasa, setNuevaCasa] = useState('');
  const [rango, setRango] = useState({ desde: '', hasta: '', paso: 1 });
  const [editId, setEditId] = useState(null);
  const [editValor, setEditValor] = useState('');
  const [guardando, setGuardando] = useState(false);

  const casasVereda = useMemo(() => items.filter(i => i.vereda === veredaSel), [items, veredaSel]);
  const casasPermitidas = useMemo(() => getCasasPermitidasPorVereda(veredaSel), [veredaSel]);
  const conteo = useMemo(() => {
    const c = {};
    for (const it of items) c[it.vereda] = (c[it.vereda] || 0) + 1;
    return c;
  }, [items]);

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
      toast.error('Error de red al crear casa');
    } finally {
      setGuardando(false);
    }
  };

  const crearUna = async (e) => {
    e.preventDefault();
    if (!nuevaCasa.trim()) return toast.error('Indique el número de casa');
    if (await crear({ casa: nuevaCasa })) setNuevaCasa('');
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
    try {
      const res = await fetch('/api/territorio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, casa: editValor }),
      });
      if (await tras(res)) setEditId(null);
    } catch (e) {
      toast.error('Error de red al actualizar casa');
    }
  };

  const eliminar = async (item) => {
    if (!confirm(`¿Eliminar la casa ${item.casa} de la Vereda ${item.vereda}? Los registros existentes no se borran, pero ya no podrá seleccionarse.`)) return;
    try {
      const res = await fetch(`/api/territorio?id=${item.id}`, { method: 'DELETE' });
      await tras(res);
    } catch (e) {
      toast.error('Error de red al eliminar casa');
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-cyan-600/20 text-cyan-400">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Configurador Territorial: Veredas y Casas</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                {items.length} Casas
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Administra las casas de cada vereda (A–O). Los cambios se aplican en el <strong>Censo</strong>, <strong>Registro de Vecinos</strong>, filtros y <strong>Carga Masiva (CSV)</strong>.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={recargar}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Recargar</span>
        </button>
      </div>

      {/* Selector de veredas */}
      <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-15 gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))' }}>
        {veredas.map(v => (
          <button
            key={v}
            id={`territorio-vereda-${v}`}
            type="button"
            onClick={() => { setVeredaSel(v); setEditId(null); }}
            className={`p-2 rounded-xl border text-center transition ${
              veredaSel === v
                ? 'bg-cyan-600/30 border-cyan-500 text-white shadow-lg shadow-cyan-900/30'
                : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-cyan-500/40'
            }`}
          >
            <div className="text-sm font-extrabold">{v}</div>
            <div className="text-[10px] text-slate-400">{conteo[v] || 0} casas</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Formularios de creación */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
          <form onSubmit={crearUna} className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-3.5 h-3.5 text-cyan-400" /> Nueva casa en Vereda {veredaSel}
            </h4>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="territorio-nueva-casa"
                type="text"
                value={nuevaCasa}
                onChange={e => setNuevaCasa(e.target.value)}
                placeholder={`Ej: ${casasPermitidas[0] || 'A-8'}`}
                title={`Casas permitidas: ${casasPermitidas.join(', ')}`}
                className="w-full min-w-0 flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs uppercase font-bold focus:border-cyan-500 outline-none"
              />
              <button
                disabled={guardando}
                className="w-full sm:w-auto shrink-0 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold"
              >
                Agregar
              </button>
            </div>
          </form>

          <form onSubmit={crearRango} className="space-y-2 border-t border-slate-800 pt-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> Generar rango
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {[['desde', 'Desde'], ['hasta', 'Hasta'], ['paso', 'Paso']].map(([k, label]) => (
                <div key={k}>
                  <label className="block text-[10px] text-slate-400 mb-0.5">{label}</label>
                  <input
                    type="number"
                    min="1"
                    value={rango[k]}
                    onChange={e => setRango(r => ({ ...r, [k]: e.target.value }))}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 outline-none"
                  />
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-500">Casas válidas para {veredaSel}: {casasPermitidas.join(', ')}</p>
            <button disabled={guardando} className="w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-bold">
              Generar casas
            </button>
          </form>
        </div>

        {/* Listado de casas */}
        <div className="lg:col-span-2 p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Home className="w-3.5 h-3.5 text-cyan-400" /> Casas de la Vereda {veredaSel}
            </h4>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              {casasVereda.length} casas
            </span>
          </div>

          {loading && items.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" /> Cargando territorio...
            </div>
          ) : casasVereda.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">Esta vereda aún no tiene casas registradas.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-80 overflow-y-auto pr-1">
              {casasVereda.map(item => (
                <div key={item.id} className="group flex items-center justify-between gap-1 p-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 transition text-xs">
                  {editId === item.id ? (
                    <>
                      <input
                        autoFocus
                        value={editValor}
                        onChange={e => setEditValor(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') guardarEdicion(item); if (e.key === 'Escape') setEditId(null); }}
                        className="w-full min-w-0 px-1.5 py-0.5 rounded bg-slate-950 border border-cyan-500 text-white uppercase font-bold outline-none"
                      />
                      <button type="button" onClick={() => guardarEdicion(item)} className="p-0.5 text-emerald-400"><Check className="w-3 h-3" /></button>
                      <button type="button" onClick={() => setEditId(null)} className="p-0.5 text-slate-400"><X className="w-3 h-3" /></button>
                    </>
                  ) : (
                    <>
                      <span className="font-mono font-bold text-slate-100">{item.casa}</span>
                      <div className="flex items-center opacity-60 group-hover:opacity-100">
                        <button type="button" title="Editar" onClick={() => { setEditId(item.id); setEditValor(item.casa); }} className="p-0.5 rounded text-slate-400 hover:text-cyan-400">
                          <Edit className="w-3 h-3" />
                        </button>
                        <button type="button" title="Eliminar" onClick={() => eliminar(item)} className="p-0.5 rounded text-slate-400 hover:text-rose-400">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useRef } from 'react';
import {
  X, Printer, Users, Home, FileText, DollarSign,
  Heart, GraduationCap, ShieldCheck, PieChart as PieIcon,
  Sparkles, CheckCircle2, AlertTriangle, Layers
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

/**
 * Modal visual que consolida el Resumen Estadístico Integral de todo el sistema:
 * Territorio, Familias, Catálogos Oficiales (Parentesco, Instrucción, Salud),
 * Demografía, Recaudación y Trámites Comunales.
 */
export default function ModalResumenEstadistico({
  isOpen,
  onClose,
  stats,
  config = {},
}) {
  const contentRef = useRef(null);

  if (!isOpen) return null;

  const resumen = stats?.resumen || {};
  const graficos = stats?.graficos || {};

  const parentescoData = graficos.parentescoData || [];
  const instruccionData = graficos.instruccionData || [];
  const saludData = graficos.saludData || [];
  const veredasData = graficos.veredasData || [];
  const generoData = graficos.generoData || [];
  const edadesData = graficos.edadesData || [];
  const tiposDocs = graficos.tiposDocs || [];
  const estadosDocs = graficos.estadosDocs || [];

  const totalDemografia = resumen.total_personas_demografia || resumen.total_habitantes_censo || resumen.vecinos_total || 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-6xl max-h-[92vh] bg-slate-900 border border-slate-750 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Cabecera del Modal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
              <PieIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {config.situr_codigo || '08-11-04-001-0033'}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  En Vivo
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
                Resumen Estadístico Integral Comunal
              </h2>
              <p className="text-xs text-slate-400">
                {config.comunidad_nombre || 'Consejo Comunal Las Llaves'} — {config.urbanizacion || 'Urb. Dr. Alfredo Travieso Paúl'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-bold transition shadow-sm"
              title="Imprimir resumen visual"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              <span>Imprimir / Vista Limpia</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido con scroll */}
        <div ref={contentRef} className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">

          {/* 1. Tarjetas de Indicadores Clave (KPIs) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Viviendas / Casas
              </span>
              <div className="text-xl font-black text-cyan-400">{resumen.total_casas_territorio || 0}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {resumen.total_casas_subdivididas || 0} divisiones (A/B)
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Familias Censo
              </span>
              <div className="text-xl font-black text-blue-400">{resumen.total_planillas_censo || 0}</div>
              <div className="text-[10px] text-blue-300 mt-0.5">
                {resumen.total_habitantes_censo || 0} habitantes
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Vecinos Aprobados
              </span>
              <div className="text-xl font-black text-emerald-400">{resumen.vecinos_aprobados || 0}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                De {resumen.vecinos_total || 0} registrados
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Locales en Casas
              </span>
              <div className="text-xl font-black text-indigo-400">{resumen.total_locales_comerciales || 0}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Comercios familiares</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Trámites Emitidos
              </span>
              <div className="text-xl font-black text-amber-400">{resumen.documentos_total || 0}</div>
              <div className="text-[10px] text-emerald-400 mt-0.5">
                {resumen.documentos_vigentes || 0} vigentes
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Recaudación Total
              </span>
              <div className="text-lg font-black text-emerald-400 truncate">
                Bs. {Number(resumen.recaudado_bs || 0).toFixed(2)}
              </div>
              <div className="text-[10px] text-blue-400 mt-0.5">
                ${Number(resumen.recaudado_usd || 0).toFixed(2)} USD
              </div>
            </div>
          </div>

          {/* 2. Sección Principal: Catálogos Oficiales Comunitarios (Parentesco, Instrucción, Salud) */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Catálogos Oficiales y Sistema de Selecciones Comunales
                </h3>
                <p className="text-[11px] text-slate-400">
                  Valores configurables desde <strong>#configuracion</strong> sincronizados en tiempo real con habitantes y censo ({totalDemografia} habitantes censados/registrados).
                </p>
              </div>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20 self-start sm:self-auto font-bold">
                Conectado a #configuracion
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Gráfico 1: Parentesco */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-cyan-400" /> Parentesco Familiar
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    {parentescoData.reduce((acc, it) => acc + (it.cantidad || 0), 0)} reg.
                  </span>
                </div>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={parentescoData} layout="vertical">
                      <XAxis type="number" stroke="#64748b" fontSize={9} />
                      <YAxis dataKey="descripcion" type="category" stroke="#64748b" fontSize={9} width={75} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                      <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>
                        {parentescoData.map((entry, index) => (
                          <Cell key={`p-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Desglose en lista */}
                <div className="grid grid-cols-2 gap-1 pt-2 border-t border-slate-800/80 text-[10px]">
                  {parentescoData.map(item => (
                    <div key={item.codigo} className="flex items-center justify-between py-0.5 px-1 rounded bg-slate-950/60">
                      <span className="text-slate-300 truncate max-w-[90px]">{item.descripcion}</span>
                      <strong className="text-cyan-400 font-mono">{item.cantidad}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gráfico 2: Nivel de Instrucción */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-400" /> Nivel de Instrucción
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    {instruccionData.reduce((acc, it) => acc + (it.cantidad || 0), 0)} reg.
                  </span>
                </div>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={instruccionData} layout="vertical">
                      <XAxis type="number" stroke="#64748b" fontSize={9} />
                      <YAxis dataKey="descripcion" type="category" stroke="#64748b" fontSize={9} width={75} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                      <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>
                        {instruccionData.map((entry, index) => (
                          <Cell key={`i-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-1 pt-2 border-t border-slate-800/80 text-[10px]">
                  {instruccionData.map(item => (
                    <div key={item.codigo} className="flex items-center justify-between py-0.5 px-1 rounded bg-slate-950/60">
                      <span className="text-slate-300 truncate max-w-[90px]">{item.descripcion}</span>
                      <strong className="text-emerald-400 font-mono">{item.cantidad}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gráfico 3: Condición de Salud */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-400" /> Condición de Salud
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    {saludData.reduce((acc, it) => acc + (it.cantidad || 0), 0)} reg.
                  </span>
                </div>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={saludData} layout="vertical">
                      <XAxis type="number" stroke="#64748b" fontSize={9} />
                      <YAxis dataKey="descripcion" type="category" stroke="#64748b" fontSize={9} width={75} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                      <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>
                        {saludData.map((entry, index) => (
                          <Cell key={`s-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-1 pt-2 border-t border-slate-800/80 text-[10px]">
                  {saludData.map(item => (
                    <div key={item.codigo} className="flex items-center justify-between py-0.5 px-1 rounded bg-slate-950/60">
                      <span className="text-slate-300 truncate max-w-[90px]">{item.descripcion}</span>
                      <strong className="text-rose-400 font-mono">{item.cantidad}</strong>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* 3. Cobertura Territorial por Vereda (A a O) */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Home className="w-4 h-4 text-cyan-400" />
                Cobertura Territorial por Veredas (A hasta O)
              </h3>
              <span className="text-[11px] text-slate-400">
                15 Veredas — {resumen.total_casas_territorio || 0} Viviendas Totales
              </span>
            </div>

            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={veredasData}>
                  <XAxis dataKey="vereda" stroke="#64748b" fontSize={9} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar name="Vecinos Registrados" dataKey="vecinos" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar name="Casas en Catálogo" dataKey="casas" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 4. Demografía (Género y Edades) y Trámites */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Género y Edades */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <Users className="w-3.5 h-3.5 text-blue-400" /> Pirámide Etaria y Género
              </h4>
              <div className="grid grid-cols-2 gap-2 h-44">
                <div>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={generoData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={55}
                        label
                      >
                        {generoData.map((e, idx) => (
                          <Cell key={`gen-${idx}`} fill={e.color || (idx === 0 ? '#3b82f6' : '#ec4899')} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={edadesData}>
                      <XAxis dataKey="rango" stroke="#64748b" fontSize={8} />
                      <YAxis stroke="#64748b" fontSize={8} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '10px' }} />
                      <Bar dataKey="habitantes" fill="#10b981" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Trámites Emitidos */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <FileText className="w-3.5 h-3.5 text-amber-400" /> Trámites Comunales y Estatus
              </h4>
              <div className="grid grid-cols-2 gap-2 h-44">
                <div>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tiposDocs}>
                      <XAxis dataKey="tipo" stroke="#64748b" fontSize={8} />
                      <YAxis stroke="#64748b" fontSize={8} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '10px' }} />
                      <Bar dataKey="total" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={estadosDocs}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={55}
                        label
                      >
                        {estadosDocs.map((e, idx) => (
                          <Cell key={`est-${idx}`} fill={e.color || '#3b82f6'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

          </div>

          {/* Pie de certificación */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 text-center text-slate-400 space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold text-[11px]">
              <ShieldCheck className="w-4 h-4" />
              <span>Conformidad y Certificación del Colectivo de Gobierno Comunal</span>
            </div>
            <p className="text-[10px] text-slate-500 max-w-2xl mx-auto">
              Datos auditables con respaldo en base de datos cifrada y trazabilidad bajo la Ley Orgánica de los Consejos Comunales (Gaceta Oficial N° 6.743 Extraordinario, 2023).
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}

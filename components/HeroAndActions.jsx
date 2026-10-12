'use client';

import React, { useState } from 'react';
import { Search, Home, Award, HeartCrack, Store, QrCode, ArrowRight, ShieldCheck, Clock, AlertTriangle, CheckCircle, Download } from 'lucide-react';

export default function HeroAndActions({
  onSelectDocumentType,
  onBuscarCedula,
  onOpenRegistro,
  vecinoBuscado,
  isSearching,
  tasaBcv,
}) {
  const [cedulaInput, setCedulaInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!cedulaInput.trim()) return;
    onBuscarCedula(cedulaInput);
  };

  return (
    <section className="relative pt-10 pb-16 overflow-hidden">
      
      {/* Luces de fondo decorativas */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-blue-600/15 via-indigo-500/10 to-emerald-500/10 blur-3xl -z-10 pointer-events-none rounded-full" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Badge Institucional y Tasa BCV */}
        <div className="inline-flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-300 mb-6 backdrop-blur-md shadow-inner">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Gestión Comunal Digital Oficial</span>
          {tasaBcv && (
            <span className="border-l border-slate-750 pl-3 font-semibold text-emerald-400">
              Tasa Oficial BCV: Bs. {Number(tasaBcv).toFixed(2)} / $
            </span>
          )}
        </div>

        {/* Título Principal de Alto Impacto */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-4 leading-tight">
          Emisión y Validación de <br />
          <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">
            Documentos Comunitarios
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-400 mb-10 leading-relaxed">
          Plataforma modular del <strong>Consejo Comunal Las Llaves</strong> para la tramitación de constancias con certificación digital, código QR alfanumérico único y verificación en tiempo real.
        </p>

        {/* Acceso Directo a los Documentos Base */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto mb-12 text-left">
          
          {/* 1. Carta de Residencia */}
          <button
            onClick={() => onSelectDocumentType('RESIDENCIA')}
            className="group p-5 rounded-2xl glass-panel glass-panel-hover flex flex-col justify-between text-left relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-blue-400 mb-1 block">Documento 01</span>
              <h3 className="font-bold text-lg text-white group-hover:text-blue-300 transition mb-1">
                Carta de Residencia
              </h3>
              <p className="text-xs text-slate-400 leading-normal">
                Certifica la dirección de habitación en la vereda y casa comunal ante entes públicos y privados.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-blue-400 group-hover:translate-x-1 transition-transform">
              <span>Tramitar ahora</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* 2. Constancia de Buena Conducta */}
          <button
            onClick={() => onSelectDocumentType('BUENA_CONDUCTA')}
            className="group p-5 rounded-2xl glass-panel glass-panel-hover flex flex-col justify-between text-left relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-amber-400 mb-1 block">Documento 02</span>
              <h3 className="font-bold text-lg text-white group-hover:text-amber-300 transition mb-1">
                Buena Conducta
              </h3>
              <p className="text-xs text-slate-400 leading-normal">
                Acredita vista, trato, comunicación y moral intachable del habitante en el ámbito geográfico.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition-transform">
              <span>Tramitar ahora</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* 3. Notificación de Fallecimiento */}
          <button
            onClick={() => onSelectDocumentType('FALLECIMIENTO')}
            className="group p-5 rounded-2xl glass-panel glass-panel-hover flex flex-col justify-between text-left relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 group-hover:scale-110 transition-transform">
              <HeartCrack className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-rose-400 mb-1 block">Documento 03</span>
              <h3 className="font-bold text-lg text-white group-hover:text-rose-300 transition mb-1">
                Fallecimiento
              </h3>
              <p className="text-xs text-slate-400 leading-normal">
                Constancia comunitaria para trámites legales, Registro Civil y servicios funerarios de habitantes.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-rose-400 group-hover:translate-x-1 transition-transform">
              <span>Tramitar ahora</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* 4. Carta Comunal de Funcionamiento (Locales en Alquiler) */}
          <button
            onClick={() => onSelectDocumentType('FUNCIONAMIENTO')}
            className="group p-5 rounded-2xl glass-panel glass-panel-hover flex flex-col justify-between text-left relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-400 mb-1 block">Documento 04</span>
              <h3 className="font-bold text-lg text-white group-hover:text-indigo-300 transition mb-1">
                Funcionamiento
              </h3>
              <p className="text-xs text-slate-400 leading-normal">
                Aval para dueños de casa que poseen locales comerciales en alquiler en su inmueble.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
              <span>Tramitar ahora</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>

        </div>

        {/* Buscador de Cédula Central */}
        <div className="max-w-2xl mx-auto p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-3 text-left">
            <div>
              <h2 className="text-base font-bold text-white">Consulta y Solicitud por Cédula</h2>
              <p className="text-xs text-slate-400">Ingresa tu cédula de identidad en formato <strong>V-12345678</strong> o sólo números.</p>
            </div>
            <ShieldCheck className="w-6 h-6 text-blue-400 shrink-0" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={cedulaInput}
                onChange={(e) => setCedulaInput(e.target.value)}
                placeholder="Ejemplo: V-12345678 o 12345678"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-750 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm font-medium transition"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
            >
              {isSearching ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Buscando...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Buscar</span>
                </>
              )}
            </button>
          </form>

          {/* Resultado de Búsqueda si existe o no */}
          {vecinoBuscado && (
            <div className="mt-5 text-left border-t border-slate-800 pt-5">
              {vecinoBuscado.encontrado ? (
                <div>
                  {vecinoBuscado.aprobado ? (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                      <div className="flex items-center gap-2 mb-2 font-bold text-sm">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>Vecino Censado y Aprobado</span>
                      </div>
                      <p className="text-xs text-slate-300 mb-1">
                        <strong>Nombre:</strong> {vecinoBuscado.vecino.nombres} {vecinoBuscado.vecino.apellidos} &nbsp;|&nbsp; <strong>Cédula:</strong> {vecinoBuscado.vecino.cedula}
                      </p>
                      <p className="text-xs text-slate-400 mb-3">
                        <strong>Ubicación:</strong> Vereda {vecinoBuscado.vecino.vereda}, Casa {vecinoBuscado.vecino.casa} &nbsp;|&nbsp; <strong>Reside desde:</strong> {vecinoBuscado.vecino.tiempo_residencia} años
                      </p>
                      
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-emerald-500/20">
                        <button
                          onClick={() => onSelectDocumentType('RESIDENCIA', vecinoBuscado.vecino)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                        >
                          Generar Carta de Residencia
                        </button>
                        <button
                          onClick={() => onSelectDocumentType('BUENA_CONDUCTA', vecinoBuscado.vecino)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition"
                        >
                          Generar Buena Conducta
                        </button>
                        <button
                          onClick={() => onSelectDocumentType('FALLECIMIENTO', vecinoBuscado.vecino)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition"
                        >
                          Notif. Fallecimiento
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
                      <div className="flex items-center gap-2 mb-1.5 font-bold text-sm">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>Registro en Proceso de Aprobación</span>
                      </div>
                      <p className="text-xs text-slate-300 mb-2">
                        Hola, <strong>{vecinoBuscado.vecino.nombres}</strong> ({vecinoBuscado.vecino.cedula}). Tu solicitud de residencia en la Vereda {vecinoBuscado.vecino.vereda}, Casa {vecinoBuscado.vecino.casa} está registrada, pero se encuentra <strong>PENDIENTE DE APROBACIÓN</strong> por los voceros comunales.
                      </p>
                      <p className="text-[11px] text-amber-400/90 font-medium bg-amber-500/10 p-2 rounded border border-amber-500/15">
                        Por normas de contraloría comunal, solo podrás tramitar y descargar documentos una vez que un Administrador o Super Administrador apruebe que habitas en el sector.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-slate-300">
                  <div className="flex items-center gap-2 mb-1.5 font-bold text-sm text-blue-300">
                    <AlertTriangle className="w-4 h-4 text-blue-400" />
                    <span>Cédula no encontrada en el padrón</span>
                  </div>
                  <p className="text-xs text-slate-300 mb-3">
                    La cédula <strong>{vecinoBuscado.cedula}</strong> no aparece registrada en el padrón de vecinos del Consejo Comunal Las Llaves.
                  </p>
                  <button
                    onClick={() => onOpenRegistro(vecinoBuscado.cedula)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md shadow-blue-600/30"
                  >
                    <span>Completar Registro Comunal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </section>
  );
}

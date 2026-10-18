'use client';

import React, { useState } from 'react';
import { Search, Home, Award, HeartCrack, Store, QrCode, ArrowRight, ShieldCheck, Clock, AlertTriangle, CheckCircle, Download, BookOpen, Flame, History, Wallet } from 'lucide-react';

export default function HeroAndActions({
  onSelectDocumentType,
  onBuscarCedula,
  onOpenRegistro,
  onOpenServicios,
  hasActiveJornada,
  jornadaActiva,
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
        <div className="inline-flex flex-wrap items-center justify-center gap-3 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-300 mb-6 backdrop-blur-md shadow-inner">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Gestión Comunal Digital · LOCC Reforma 2023</span>
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
          Plataforma oficial del <strong>Consejo Comunal Las Llaves</strong> adecuada a la <strong>Ley Orgánica de los Consejos Comunales (2023)</strong> para la tramitación de constancias con certificación digital, código QR alfanumérico único y verificación en tiempo real.
        </p>

        {/* Acceso Directo a los Documentos Base */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto mb-10 text-left">
          
          {/* 1. Carta de Residencia */}
          <button
            onClick={() => onSelectDocumentType('RESIDENCIA')}
            className="group p-5 rounded-2xl glass-panel glass-panel-hover flex flex-col justify-between text-left relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-blue-400 mb-1 block">Art. 34 Num. 19 LOCC</span>
              <h3 className="font-bold text-lg text-white group-hover:text-blue-300 transition mb-1">
                Carta de Residencia
              </h3>
              <p className="text-xs text-slate-400 leading-normal">
                Certifica la residencia del habitante en la comunidad conforme al Censo Demográfico Comunal (Art. 34 num. 19 y 20 LOCC).
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
              <span className="text-[10px] font-bold tracking-wider uppercase text-amber-400 mb-1 block">Art. 4 y 25 LOCC</span>
              <h3 className="font-bold text-lg text-white group-hover:text-amber-300 transition mb-1">
                Buena Conducta
              </h3>
              <p className="text-xs text-slate-400 leading-normal">
                Acredita vista, trato, corresponsabilidad y convivencia ciudadana del habitante en el ámbito geográfico comunal.
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
              <span className="text-[10px] font-bold tracking-wider uppercase text-rose-400 mb-1 block">Solidaridad Comunal</span>
              <h3 className="font-bold text-lg text-white group-hover:text-rose-300 transition mb-1">
                Fallecimiento
              </h3>
              <p className="text-xs text-slate-400 leading-normal">
                Constancia comunitaria gratuita para trámites legales, Registro Civil y servicios funerarios de habitantes.
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
              <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-400 mb-1 block">Art. 26 y 32 LOCC</span>
              <h3 className="font-bold text-lg text-white group-hover:text-indigo-300 transition mb-1">
                Funcionamiento
              </h3>
              <p className="text-xs text-slate-400 leading-normal">
                Aval socio-productivo y de contraloría comunal para propietarios con locales comerciales en su inmueble.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
              <span>Tramitar ahora</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>

        </div>

        {/* Banner de Jornadas de Servicios / Gas Comunal y Aportes (Sólo visible si la jornada está ACTIVA en Configuración) */}
        {hasActiveJornada && onOpenServicios && (
          <div className="max-w-4xl mx-auto p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-amber-950/30 border border-amber-500/40 shadow-xl text-left flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <Flame className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Servicios Comunales · LOCC Art. 51
                  </span>
                  <span className="text-[11px] text-amber-200/90 font-semibold">
                    {jornadaActiva?.titulo || 'Jornada Activa de Gas Comunal'}
                  </span>
                  {jornadaActiva?.max_unidades_por_familia && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                      Máx. {jornadaActiva.max_unidades_por_familia} unidades / familia
                    </span>
                  )}
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Aportes Comunitarios y Declaración de Pagos de Servicios
                </h3>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Participa en la jornada de distribución de gas doméstico, declara tu transferencia bancaria o pago móvil y obtén tu comprobante digital de autogestión.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                onClick={onOpenServicios}
                className="w-full sm:w-auto px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                <Flame className="w-4 h-4" />
                <span>Declarar / Mis Aportes</span>
              </button>
            </div>
          </div>
        )}

        {/* Buscador de Cédula Central */}
        <div className="max-w-2xl mx-auto p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl mb-10">
          <div className="flex items-center justify-between mb-3 text-left">
            <div>
              <h2 className="text-base font-bold text-white">Consulta en el Censo Demográfico y Solicitud por Cédula</h2>
              <p className="text-xs text-slate-400">Ingresa tu cédula de identidad en formato <strong>V-12345678</strong> o sólo números (Art. 34 num. 19 y 20 LOCC).</p>
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
                        <span>Habitante Censado y Verificado en el Censo Demográfico Comunal</span>
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
                        <span>Registro en Proceso de Verificación Comunal</span>
                      </div>
                      <p className="text-xs text-slate-300 mb-2">
                        Hola, <strong>{vecinoBuscado.vecino.nombres}</strong> ({vecinoBuscado.vecino.cedula}). Tu solicitud de incorporación al Censo Demográfico en la Vereda {vecinoBuscado.vecino.vereda}, Casa {vecinoBuscado.vecino.casa} está registrada y se encuentra <strong>PENDIENTE DE VERIFICACIÓN</strong> por las instancias del Consejo Comunal.
                      </p>
                      <p className="text-[11px] text-amber-400/90 font-medium bg-amber-500/10 p-2 rounded border border-amber-500/15">
                        Conforme al Art. 34 numerales 19 y 20 de la Ley Orgánica de los Consejos Comunales (2023), podrás emitir y descargar constancias una vez que la Comisión Electoral / Colectivo de Gobierno Comunal valide tu residencia en el sector.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-slate-300">
                  <div className="flex items-center gap-2 mb-1.5 font-bold text-sm text-blue-300">
                    <AlertTriangle className="w-4 h-4 text-blue-400" />
                    <span>Cédula no encontrada en el Censo Demográfico Comunal</span>
                  </div>
                  <p className="text-xs text-slate-300 mb-3">
                    La cédula <strong>{vecinoBuscado.cedula}</strong> no aparece registrada aún en el Censo Demográfico del Consejo Comunal Las Llaves (Art. 15 num. 3 y Art. 34 num. 20 LOCC).
                  </p>
                  <button
                    onClick={() => onOpenRegistro(vecinoBuscado.cedula)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md shadow-blue-600/30"
                  >
                    <span>Completar Registro en el Censo Comunal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Banner Oficial de Descarga de la Ley Orgánica de los Consejos Comunales (2023) para Visitantes */}
        <div className="max-w-4xl mx-auto p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-900/95 via-blue-950/30 to-slate-900/95 border border-amber-500/30 shadow-xl text-left flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Marco Legal Vigente · Gaceta Oficial 2023
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  Asamblea Nacional · 22 de junio de 2023
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                Ley Orgánica de los Consejos Comunales (Reforma 2023)
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Consulta y descarga el texto íntegro de la Ley que rige la organización y funcionamiento de la <strong>Asamblea de Ciudadanas y Ciudadanos</strong>, el <strong>Colectivo de Gobierno Comunal</strong>, la <strong>Unidad Ejecutiva</strong>, la <strong>Unidad Administrativa y Financiera Comunitaria</strong>, la <strong>Unidad de Contraloría Social</strong> y la <strong>Comisión Electoral</strong> (Art. 18 al 35).
              </p>
            </div>
          </div>

          <a
            href="https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/archivo/Ley_Organica_Consejos_Comunales_2023.pdf"
            target="_blank"
            rel="noopener noreferrer"
            download="Ley_Organica_Consejos_Comunales_2023.pdf"
            className="w-full md:w-auto px-5 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Ley Orgánica (PDF)</span>
          </a>
        </div>

      </div>
    </section>
  );
}

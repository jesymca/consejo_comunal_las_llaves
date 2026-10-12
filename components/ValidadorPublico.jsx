'use client';

import React, { useState, useEffect } from 'react';
import { Search, CheckCircle2, AlertTriangle, XCircle, QrCode, Download, RefreshCw, Calendar, Clock, Home, User, Shield } from 'lucide-react';
import { generarDocumentoPdf } from '@/lib/pdfGenerator';
import { toast } from '@/lib/toast';

export default function ValidadorPublico({ initialCodigo = '', initialCedula = '' }) {
  const [query, setQuery] = useState(initialCodigo || initialCedula || '');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [renovando, setRenovando] = useState(false);
  const [descargando, setDescargando] = useState(false);

  useEffect(() => {
    if (initialCodigo || initialCedula) {
      setQuery(initialCodigo || initialCedula);
      ejecutarBusqueda(initialCodigo || initialCedula);
    }
  }, [initialCodigo, initialCedula]);

  const ejecutarBusqueda = async (valor) => {
    const q = (valor || query).trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setResultado(null);

    try {
      // Determinar si parece código alfanumérico o cédula
      const isQrCode = q.length >= 10 && !q.includes('-');
      const param = isQrCode ? `codigo=${encodeURIComponent(q)}` : `cedula=${encodeURIComponent(q)}`;

      const res = await fetch(`/api/validar?${param}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al validar documento');
      }

      setResultado(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDescargar = async () => {
    if (!resultado?.documento) return;
    setDescargando(true);
    try {
      const [configRes, plantillaRes] = await Promise.all([
        fetch('/api/configuracion').then(r => r.json()).catch(() => ({ config: {} })),
        fetch(`/api/modelador?id=${encodeURIComponent(resultado.documento.tipo_documento)}`).then(r => r.json()).catch(() => ({})),
      ]);

      await generarDocumentoPdf({
        documento: resultado.documento,
        firmas: resultado.firmas || [],
        config: configRes.config || {},
        plantilla: plantillaRes.plantilla || null,
      });

      // Registrar descarga
      await fetch('/api/auditoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'registrar_descarga',
          cedula: resultado.documento.cedula,
          codigo_documento: resultado.documento.codigo_qr,
          tipo_documento: resultado.documento.tipo_documento,
          usuario_nombre: resultado.documento.nombres_apellidos,
        })
      });
    } catch (err) {
      toast.error('Error descargando el PDF: ' + err.message);
    } finally {
      setDescargando(false);
    }
  };

  const handleRenovar = async () => {
    if (!resultado?.documento) return;
    setRenovando(true);
    try {
      const res = await fetch('/api/documentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'renovar',
          codigo_anterior: resultado.documento.codigo_qr,
          cedula: resultado.documento.cedula,
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error renovando documento');

      toast.success(`¡Documento renovado con éxito! Nuevo código: ${data.codigo_qr}`);
      // Re-consultar con el nuevo código
      ejecutarBusqueda(data.codigo_qr);
    } catch (err) {
      toast.error('Error al renovar: ' + err.message);
    } finally {
      setRenovando(false);
    }
  };

  return (
    <div id="validar" className="max-w-4xl mx-auto px-4 py-8">
      
      {/* Encabezado del Validador */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold mb-3">
          <QrCode className="w-3.5 h-3.5" />
          <span>Verificación Oficial y Auditoría</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          Validador Digital de Documentos
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto mt-2">
          Verifica la autenticidad, vigencia y legitimidad de constancias emitidas por el Consejo Comunal Las Llaves ingresando el código alfanumérico (ej: <span className="font-mono text-blue-400 font-semibold">LL26AB12CD34</span>) o la cédula de identidad.
        </p>
      </div>

      {/* Caja de Búsqueda */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md mb-8">
        <form
          onSubmit={(e) => { e.preventDefault(); ejecutarBusqueda(); }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ingresa código QR (XX00XX00XX00) o cédula (V-12345678)"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-750 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm font-medium transition"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Validando...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Verificar Estatus</span>
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex gap-2 items-center">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Resultado de la Validación */}
      {resultado && (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden animate-in fade-in">
          
          {resultado.encontrado ? (
            <div>
              
              {/* Estatus Badge Superior */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  {resultado.estado === 'VIGENTE' && (
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                  )}
                  {resultado.estado === 'VENCIDO' && (
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                      <AlertTriangle className="w-7 h-7" />
                    </div>
                  )}
                  {resultado.estado === 'REVOCADO' && (
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                      <XCircle className="w-7 h-7" />
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 block">
                      Resultado de Verificación
                    </span>
                    <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                      {resultado.estado === 'VIGENTE' && <span className="text-emerald-400">CONSTANCIA VÁLIDA Y VIGENTE</span>}
                      {resultado.estado === 'VENCIDO' && <span className="text-amber-400">CONSTANCIA VENCIDA</span>}
                      {resultado.estado === 'REVOCADO' && <span className="text-rose-400">CONSTANCIA REVOCADA</span>}
                    </h3>
                  </div>
                </div>

                {/* Código Alfanumérico */}
                <div className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-left sm:text-right">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Código Validador</span>
                  <span className="font-mono text-base font-extrabold text-blue-400">
                    {resultado.documento.codigo_qr}
                  </span>
                </div>
              </div>

              {/* Tiempo Restante de Vigencia */}
              <div className="py-4 my-4 p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span>{resultado.mensaje_vigencia}</span>
                </div>
                {resultado.estado === 'VIGENTE' && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {resultado.dias_restantes} días restantes
                  </span>
                )}
              </div>

              {/* Ficha del Titular del Documento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-2">
                  <div className="flex items-center gap-2 text-slate-400 font-semibold mb-1">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span>Datos del Titular</span>
                  </div>
                  <div><strong className="text-slate-300">Nombre Completo:</strong> <span className="text-white font-bold">{resultado.documento.nombres_apellidos}</span></div>
                  <div><strong className="text-slate-300">Cédula de Identidad:</strong> <span className="text-white font-mono">{resultado.documento.cedula}</span></div>
                  <div><strong className="text-slate-300">Tipo de Documento:</strong> <span className="text-blue-300">{resultado.documento.tipo_documento}</span></div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-2">
                  <div className="flex items-center gap-2 text-slate-400 font-semibold mb-1">
                    <Home className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Ubicación Territorial</span>
                  </div>
                  <div><strong className="text-slate-300">Vereda:</strong> <span className="text-white font-bold">Vereda {resultado.documento.vereda}</span></div>
                  <div><strong className="text-slate-300">Número de Casa:</strong> <span className="text-white font-bold">Casa {resultado.documento.casa}</span></div>
                  <div><strong className="text-slate-300">Tiempo de Residencia:</strong> <span className="text-white">{resultado.documento.tiempo_residencia} años</span></div>
                </div>
              </div>

              {/* Fechas de Emisión y Vencimiento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-400 pb-6 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Fecha de Emisión: <strong className="text-slate-200">{resultado.documento.fecha_emision}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Fecha de Vencimiento: <strong className="text-slate-200">{resultado.documento.fecha_vencimiento}</strong></span>
                </div>
              </div>

              {/* Botones de Acción: Descargar o Renovar */}
              <div className="pt-6 flex flex-wrap gap-3 items-center justify-end">
                {resultado.estado === 'VENCIDO' && (
                  <button
                    onClick={handleRenovar}
                    disabled={renovando}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs transition shadow-lg shadow-amber-600/30 flex items-center gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${renovando ? 'animate-spin' : ''}`} />
                    <span>Actualizar Vigencia y Generar Nuevo Código QR</span>
                  </button>
                )}

                <button
                  onClick={handleDescargar}
                  disabled={descargando}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs transition shadow-lg shadow-blue-600/30 flex items-center gap-2"
                >
                  <Download className={`w-3.5 h-3.5 ${descargando ? 'animate-spin' : ''}`} />
                  <span>Descargar Copia Certificada en PDF</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="text-center py-6">
              <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
              <h4 className="text-base font-bold text-white mb-1">Documento No Encontrado</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No existe ninguna constancia registrada con el código o cédula ingresada. Asegúrate de verificar los datos o ponte en contacto con la vocería comunal.
              </p>
            </div>
          )}

        </div>
      )}

    </div>
  );
}

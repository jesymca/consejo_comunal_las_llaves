'use client';

import React, { useState, useEffect } from 'react';
import { X, FileText, CheckCircle2, Download, AlertCircle, RefreshCw, QrCode } from 'lucide-react';
import { BANCOS_VENEZUELA } from '@/lib/territory';
import { generarDocumentoPdf } from '@/lib/pdfGenerator';
import { toast } from '@/lib/toast';

export default function ModalSolicitud({
  vecino,
  tipoDocumento = 'RESIDENCIA',
  tasaBcv = 875.65,
  onClose,
  onDocumentoGenerado,
}) {
  const [tipo, setTipo] = useState(tipoDocumento || 'RESIDENCIA');
  const [plantillasLista, setPlantillasLista] = useState([]);
  const [docCostos, setDocCostos] = useState({});
  const [esExonerado, setEsExonerado] = useState(false);
  const [motivoExoneracion, setMotivoExoneracion] = useState('Adulto Mayor / Situación de Vulnerabilidad');
  const [bancoOrigenId, setBancoOrigenId] = useState(10); // Banco de Venezuela por defecto
  const [numeroTransferencia, setNumeroTransferencia] = useState('');
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);

  // Campos específicos para Carta Comunal de Funcionamiento (Locales en Alquiler)
  const [nombreComercio, setNombreComercio] = useState('');
  const [rifComercio, setRifComercio] = useState('');
  const [tamanoEspacio, setTamanoEspacio] = useState('');
  const [rubroEstablecimiento, setRubroEstablecimiento] = useState('');
  const [fechaInicioAlquiler, setFechaInicioAlquiler] = useState(new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [docGenerado, setDocGenerado] = useState(null);
  const [descargandoPdf, setDescargandoPdf] = useState(false);

  // Cargar plantillas y configuración de costos
  useEffect(() => {
    Promise.all([
      fetch('/api/modelador').then(r => r.json()).catch(() => ({ plantillas: [] })),
      fetch('/api/configuracion').then(r => r.json()).catch(() => ({ config: {} })),
    ]).then(([modData, cfgData]) => {
      if (modData.plantillas && modData.plantillas.length > 0) {
        setPlantillasLista(modData.plantillas);
      }
      if (cfgData.config && cfgData.config.doc_costos_json) {
        try {
          const parsed = JSON.parse(cfgData.config.doc_costos_json);
          setDocCostos(parsed);
        } catch (e) {
          console.warn('Error parseando doc_costos_json:', e);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (tipoDocumento) setTipo(tipoDocumento);
  }, [tipoDocumento]);

  // Determinar costo o gratuidad configurada para el tipo de documento seleccionado
  const configDocActual = docCostos[tipo] || { gratuito: false, monto_usd: 1.0 };
  const esGratuitoPorConfiguracion = Boolean(configDocActual.gratuito);
  const montoUsd = esGratuitoPorConfiguracion ? 0 : Number(configDocActual.monto_usd ?? 1.0);
  const montoBsCalculado = Number((montoUsd * (tasaBcv || 875.65)).toFixed(2));
  const noRequierePago = esGratuitoPorConfiguracion || esExonerado;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tipo === 'FUNCIONAMIENTO') {
        if (!nombreComercio.trim()) throw new Error('Por favor ingrese el nombre del comercio');
        if (!rifComercio.trim()) throw new Error('Por favor ingrese el RIF del comercio');
        if (!tamanoEspacio.trim()) throw new Error('Por favor ingrese el tamaño del espacio en alquiler');
        if (!rubroEstablecimiento.trim()) throw new Error('Por favor ingrese el rubro del establecimiento');
      }

      const bancoSeleccionado = BANCOS_VENEZUELA.find(b => b.id === Number(bancoOrigenId));

      const payload = {
        action: 'solicitar',
        cedula: vecino.cedula,
        tipo_documento: tipo,
        es_exonerado: noRequierePago,
        motivo_exoneracion: esGratuitoPorConfiguracion ? 'Trámite Comunal Gratuito' : (esExonerado ? motivoExoneracion : null),
        banco_origen_id: noRequierePago ? null : bancoOrigenId,
        banco_nombre: noRequierePago ? null : bancoSeleccionado?.banco,
        numero_transferencia: noRequierePago ? null : numeroTransferencia,
        monto_bs: noRequierePago ? 0 : montoBsCalculado,
        monto_usd: noRequierePago ? 0 : montoUsd,
        tasa_bcv: tasaBcv,
        fecha_pago: fechaPago,
        datos_extra: tipo === 'FUNCIONAMIENTO' ? {
          nombre_comercio: nombreComercio.trim(),
          rif_comercio: rifComercio.trim().toUpperCase(),
          tamano_espacio: tamanoEspacio.trim(),
          rubro_establecimiento: rubroEstablecimiento.trim(),
          fecha_inicio_alquiler: fechaInicioAlquiler,
        } : null
      };

      const res = await fetch('/api/documentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar la solicitud');
      }

      setDocGenerado(data);
      toast.success('¡Documento emitido exitosamente!');
      if (onDocumentoGenerado) onDocumentoGenerado(data);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDescargarPdf = async () => {
    if (!docGenerado) return;
    setDescargandoPdf(true);
    try {
      // Obtener firmas, configuración y plantilla modelada
      const [firmasRes, configRes, plantillaRes] = await Promise.all([
        fetch('/api/firmas').then(r => r.json()).catch(() => ({ firmas: [] })),
        fetch('/api/configuracion').then(r => r.json()).catch(() => ({ config: {} })),
        fetch(`/api/modelador?id=${encodeURIComponent(docGenerado.tipo_documento)}`).then(r => r.json()).catch(() => ({})),
      ]);

      await generarDocumentoPdf({
        documento: {
          codigo_qr: docGenerado.codigo_qr,
          tipo_documento: docGenerado.tipo_documento,
          cedula: docGenerado.titular.cedula,
          nombres_apellidos: docGenerado.titular.nombres_apellidos,
          vereda: docGenerado.titular.vereda,
          casa: docGenerado.titular.casa,
          tiempo_residencia: docGenerado.titular.tiempo_residencia,
          fecha_emision: docGenerado.fecha_emision,
          fecha_vencimiento: docGenerado.fecha_vencimiento,
          vigencia_dias: docGenerado.vigencia_dias,
        },
        firmas: firmasRes.firmas || [],
        config: configRes.config || {},
        plantilla: plantillaRes.plantilla || null,
      });

      // Registrar evento de descarga en bitácora
      await fetch('/api/auditoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'registrar_descarga',
          cedula: docGenerado.titular.cedula,
          codigo_documento: docGenerado.codigo_qr,
          tipo_documento: docGenerado.tipo_documento,
          usuario_nombre: docGenerado.titular.nombres_apellidos,
        })
      });
    } catch (err) {
      console.error('Error descargando PDF:', err);
      toast.error('Error generando el archivo PDF: ' + err.message);
    } finally {
      setDescargandoPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Trámite de Documento Comunal</h3>
            <p className="text-xs text-slate-400">Titular: <strong>{vecino?.nombres} {vecino?.apellidos}</strong> ({vecino?.cedula})</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex gap-2 items-center">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {docGenerado ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-base font-bold text-white mb-1">¡Documento Emitido Satisfactoriamente!</h4>
              <p className="text-xs text-slate-300">
                Se ha generado la constancia con código alfanumérico único de verificación digital.
              </p>
            </div>

            {/* Código QR y Código Alfanumérico */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 inline-block mx-auto text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Código de Validación</span>
              <span className="font-mono text-xl font-extrabold text-blue-400 tracking-wider block">
                {docGenerado.codigo_qr}
              </span>
              <span className="text-[11px] text-emerald-400 mt-1 block">
                Válido hasta: {docGenerado.fecha_vencimiento} ({docGenerado.vigencia_dias} días)
              </span>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleDescargarPdf}
                disabled={descargandoPdf}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
              >
                {descargandoPdf ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Generando PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Descargar PDF Oficial</span>
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs border border-slate-700 transition"
              >
                Finalizar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            
            {/* Selección de Tipo de Documento */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Documento a Tramitar *
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-white text-xs focus:outline-none focus:border-blue-500"
              >
                {plantillasLista && plantillasLista.length > 0 ? (
                  plantillasLista.map((p) => {
                    const cfg = docCostos[p.id];
                    const labelCosto = cfg?.gratuito ? '· Gratuito' : (cfg ? `· $${Number(cfg.monto_usd).toFixed(2)}` : '');
                    return (
                      <option key={p.id} value={p.id}>
                        {p.titulo} {labelCosto}
                      </option>
                    );
                  })
                ) : (
                  <>
                    <option value="RESIDENCIA">1. Carta de Residencia</option>
                    <option value="BUENA_CONDUCTA">2. Constancia de Buena Conducta</option>
                    <option value="FALLECIMIENTO">3. Constancia de Notificación de Fallecimiento (Gratuito)</option>
                    <option value="FUNCIONAMIENTO">4. Carta Comunal de Funcionamiento Comercial</option>
                  </>
                )}
              </select>
            </div>

            {/* SECCIÓN ESPECÍFICA: CARTA COMUNAL DE FUNCIONAMIENTO (LOCALES COMERCIALES EN ALQUILER) */}
            {tipo === 'FUNCIONAMIENTO' && (
              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-3">
                <div className="flex items-center gap-2 border-b border-indigo-500/20 pb-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Datos del Local Comercial en Alquiler
                  </h4>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Como propietario(a) de la vivienda (Vereda {vecino?.vereda}, Casa {vecino?.casa}), ingresa los datos del comercio que opera en alquiler dentro de tu inmueble:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Nombre del Comercio / Razón Social *
                    </label>
                    <input
                      type="text"
                      required
                      value={nombreComercio}
                      onChange={(e) => setNombreComercio(e.target.value)}
                      placeholder="Ej: Inversiones El Progreso C.A."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white text-xs focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      RIF del Comercio *
                    </label>
                    <input
                      type="text"
                      required
                      value={rifComercio}
                      onChange={(e) => setRifComercio(e.target.value)}
                      placeholder="Ej: J-12345678-0"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white text-xs font-mono uppercase focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Tamaño del Espacio en Alquiler *
                    </label>
                    <input
                      type="text"
                      required
                      value={tamanoEspacio}
                      onChange={(e) => setTamanoEspacio(e.target.value)}
                      placeholder="Ej: 35 m² / Local frontal"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white text-xs focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Rubro del Establecimiento *
                    </label>
                    <input
                      type="text"
                      required
                      value={rubroEstablecimiento}
                      onChange={(e) => setRubroEstablecimiento(e.target.value)}
                      placeholder="Ej: Víveres, Bodega, Peluquería"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white text-xs focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    ¿Desde qué Fecha está Alquilado en ese lugar? *
                  </label>
                  <input
                    type="date"
                    required
                    value={fechaInicioAlquiler}
                    onChange={(e) => setFechaInicioAlquiler(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white text-xs focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Aporte Comunitario y Cálculo de Bolívares */}
            {esGratuitoPorConfiguracion ? (
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-300 block">Trámite Comunal Gratuito</span>
                  <span className="text-[11px] text-slate-300">Este documento está configurado sin cobro de colaboración comunal.</span>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  $0.00 USD (Bs. 0.00)
                </span>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-blue-950/40 border border-blue-800/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-200">Aporte de Corresponsabilidad y Sostenimiento:</span>
                  <span className="text-xs font-extrabold text-white">${montoUsd.toFixed(2)} USD</span>
                </div>
                
                <div className="flex items-center justify-between text-xs text-slate-300 border-t border-blue-900/40 pt-2">
                  <span>Tasa Oficial BCV: <strong>Bs. {Number(tasaBcv).toFixed(2)}</strong></span>
                  <span className="font-extrabold text-emerald-400 text-sm">
                    Total a Transferir: Bs. {montoBsCalculado.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Select de Exoneración Social por Vulnerabilidad (solo si no es gratuito por configuración) */}
            {!esGratuitoPorConfiguracion && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={esExonerado}
                    onChange={(e) => setEsExonerado(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700 focus:ring-0"
                  />
                  <span className="text-xs font-semibold text-slate-300">
                    Solicitar exoneración social por caso de vulnerabilidad
                  </span>
                </label>

                {esExonerado && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-850">
                    <label className="block text-[11px] text-slate-400 mb-1">Motivo de la exoneración:</label>
                    <select
                      value={motivoExoneracion}
                      onChange={(e) => setMotivoExoneracion(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-750 text-white text-xs"
                    >
                      <option value="Adulto Mayor / Jubilado">Adulto Mayor / Jubilado</option>
                      <option value="Condición de Discapacidad / Salud">Condición de Discapacidad / Salud</option>
                      <option value="Caso Social de Vulnerabilidad Económica">Caso Social de Vulnerabilidad Económica</option>
                      <option value="Trámite Escolar o Estudiantil">Trámite Escolar o Estudiantil</option>
                    </select>
                    <p className="text-[10px] text-emerald-400 mt-1">Este trámite se gestionará de forma 100% gratuita.</p>
                  </div>
                )}
              </div>
            )}

            {/* Datos de Pago (Si requiere pago) */}
            {!noRequierePago && (
              <div className="space-y-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                <span className="text-xs font-bold text-slate-200 block">Datos del Pago Comunitario</span>
                
                {/* Banco de Origen */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Banco de Origen *
                  </label>
                  <select
                    value={bancoOrigenId}
                    onChange={(e) => setBancoOrigenId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white text-xs"
                  >
                    {BANCOS_VENEZUELA.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.id}. {b.banco}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Número de Transferencia y Fecha */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      N° de Transferencia / Ref *
                    </label>
                    <input
                      type="text"
                      required={!esExonerado}
                      value={numeroTransferencia}
                      onChange={(e) => setNumeroTransferencia(e.target.value)}
                      placeholder="Ej: 12345678"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Fecha de Pago *
                    </label>
                    <input
                      type="date"
                      required={!esExonerado}
                      value={fechaPago}
                      onChange={(e) => setFechaPago(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Botón de Emisión */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
              >
                {loading ? 'Procesando Documento...' : 'Emitir y Certificar Documento Digital'}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}

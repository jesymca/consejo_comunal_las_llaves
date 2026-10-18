'use client';

import React, { useState, useEffect } from 'react';
import {
  X, Flame, ShoppingBag, CheckCircle2, AlertCircle, Copy, Check,
  Search, Calendar, Clock, DollarSign, Globe, ShieldCheck, Printer, RefreshCw, UserCheck
} from 'lucide-react';
import { BANCOS_VENEZUELA } from '@/lib/territory';
import { toast } from '@/lib/toast';

export default function ModalServicios({ onClose, tasaBcv = 875.65 }) {
  const [activeTab, setActiveTab] = useState('declarar'); // 'declarar' | 'historial'
  const [loading, setLoading] = useState(false);
  const [jornadaActiva, setJornadaActiva] = useState(null);
  const [config, setConfig] = useState({});

  // Formulario de Declaración
  const [cedula, setCedula] = useState('');
  const [verificandoVecino, setVerificandoVecino] = useState(false);
  const [vecinoData, setVecinoData] = useState(null);
  const [cantidades, setCantidades] = useState({}); // { [item_id]: cantidad }
  const [bancoOrigenId, setBancoOrigenId] = useState(10);
  const [numeroTransferencia, setNumeroTransferencia] = useState('');
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
  const [telefonoContacto, setTelefonoContacto] = useState('');
  const [reciboGenerado, setReciboGenerado] = useState(null);

  // Historial del Vecino
  const [cedulaConsulta, setCedulaConsulta] = useState('');
  const [consultandoHistorial, setConsultandoHistorial] = useState(false);
  const [historialData, setHistorialData] = useState(null);

  // Copiado al portapapeles
  const [copiadoKey, setCopiadoKey] = useState('');

  const copiarTexto = (texto, key) => {
    navigator.clipboard.writeText(texto);
    setCopiadoKey(key);
    toast.success('Copiado al portapapeles');
    setTimeout(() => setCopiadoKey(''), 2000);
  };

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    setLoading(true);
    try {
      const [jorRes, cfgRes] = await Promise.all([
        fetch('/api/servicios?action=jornada_activa').then(r => r.json()).catch(() => ({ jornada: null })),
        fetch('/api/configuracion').then(r => r.json()).catch(() => ({ config: {} })),
      ]);

      if (jorRes.jornada) {
        setJornadaActiva(jorRes.jornada);
        // Inicializar cantidades en 0
        try {
          const items = typeof jorRes.jornada.items_json === 'string'
            ? JSON.parse(jorRes.jornada.items_json)
            : (jorRes.jornada.items_json || []);
          const initCants = {};
          items.forEach(it => { initCants[it.id || it.codigo] = 0; });
          setCantidades(initCants);
        } catch (e) {}
      }

      if (cfgRes.config) {
        setConfig(cfgRes.config);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const verificarVecinoEnCenso = async () => {
    if (!cedula.trim()) {
      toast.error('Ingrese su número de cédula');
      return;
    }
    setVerificandoVecino(true);
    try {
      const res = await fetch(`/api/vecinos?q=${encodeURIComponent(cedula.trim())}`);
      const data = await res.json();
      const encontrado = data.vecinos?.find(v =>
        v.cedula.replace(/\D/g, '') === cedula.replace(/\D/g, '')
      );

      if (encontrado) {
        setVecinoData(encontrado);
        if (encontrado.telefono) setTelefonoContacto(encontrado.telefono);
        toast.success(`Vecino certificado: ${encontrado.nombres} ${encontrado.apellidos}`);
      } else {
        setVecinoData(null);
        toast.error('No se encontró su registro en el censo comunal. Debe estar censado para solicitar servicios.');
      }
    } catch (e) {
      toast.error('Error al conectar con el servidor');
    } finally {
      setVerificandoVecino(false);
    }
  };

  // Calcular items de la jornada
  const itemsJornada = (() => {
    if (!jornadaActiva || !jornadaActiva.items_json) return [];
    try {
      return typeof jornadaActiva.items_json === 'string'
        ? JSON.parse(jornadaActiva.items_json)
        : jornadaActiva.items_json;
    } catch (e) {
      return [];
    }
  })();

  const maxPermitido = Number(jornadaActiva?.max_unidades_por_familia) || 2;
  const totalUnidadesSeleccionadas = Object.values(cantidades).reduce((a, b) => a + (Number(b) || 0), 0);

  const cambiarCantidad = (itemId, delta) => {
    const actual = Number(cantidades[itemId] || 0);
    const nuevo = Math.max(0, actual + delta);
    const nuevoTotal = totalUnidadesSeleccionadas - actual + nuevo;

    if (nuevoTotal > maxPermitido) {
      toast.warning(`Límite por familia: Máximo ${maxPermitido} unidades en total por vivienda.`);
      return;
    }

    setCantidades(prev => ({ ...prev, [itemId]: nuevo }));
  };

  // Cálculos financieros
  let totalUsd = 0;
  let totalAlicuotaUsd = 0;
  const itemsParaEnviar = [];

  itemsJornada.forEach(it => {
    const cant = Number(cantidades[it.id || it.codigo] || 0);
    if (cant > 0) {
      const pu = Number(it.precio_usd || 0);
      const ali = Number(it.alicuota_autogestion_usd || 0);
      totalUsd += cant * pu;
      totalAlicuotaUsd += cant * ali;
      itemsParaEnviar.push({
        id: it.id,
        codigo: it.codigo,
        nombre: it.nombre,
        cantidad: cant,
        precio_usd: pu,
        alicuota_autogestion_usd: ali,
      });
    }
  });

  const totalBs = Number((totalUsd * tasaBcv).toFixed(2));
  const totalAlicuotaBs = Number((totalAlicuotaUsd * tasaBcv).toFixed(2));

  // Enviar declaración
  const handleSubmitDeclaracion = async (e) => {
    e.preventDefault();
    if (!vecinoData) {
      toast.error('Debe verificar su cédula en el censo primero');
      return;
    }
    if (totalUnidadesSeleccionadas <= 0) {
      toast.error('Debe seleccionar al menos 1 unidad de servicio');
      return;
    }
    if (totalUnidadesSeleccionadas > maxPermitido) {
      toast.error(`Ha superado el límite de ${maxPermitido} unidades por vivienda`);
      return;
    }
    if (!numeroTransferencia.trim()) {
      toast.error('Ingrese el número de transferencia o referencia bancaria');
      return;
    }

    const bancoObj = BANCOS_VENEZUELA.find(b => b.id === bancoOrigenId);
    const bancoNombre = bancoObj ? bancoObj.banco : 'Banco de Venezuela';

    setLoading(true);
    try {
      const res = await fetch('/api/servicios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'declarar_pago',
          jornada_id: jornadaActiva.id,
          cedula: vecinoData.cedula,
          items: itemsParaEnviar,
          banco_origen_id: bancoOrigenId,
          banco_nombre: bancoNombre,
          numero_transferencia: numeroTransferencia.trim(),
          fecha_pago: fechaPago,
          tasa_bcv: tasaBcv,
          telefono: telefonoContacto || vecinoData.telefono || '',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setReciboGenerado(data.recibo);
        toast.success('¡Aporte de servicio declarado con éxito!');
      } else {
        toast.error(data.error || 'Error al declarar el aporte');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  // Consultar historial
  const handleConsultarHistorial = async (e) => {
    e?.preventDefault();
    if (!cedulaConsulta.trim()) {
      toast.error('Ingrese su cédula para consultar');
      return;
    }
    setConsultandoHistorial(true);
    try {
      const res = await fetch(`/api/servicios?action=historial_vecino&cedula=${encodeURIComponent(cedulaConsulta.trim())}`);
      const data = await res.json();
      if (res.ok) {
        setHistorialData(data);
        if (data.servicios.length === 0 && data.documentos.length === 0) {
          toast.info('No se encontraron aportes registrados con esta cédula');
        } else {
          toast.success(`Se encontraron ${data.servicios.length + data.documentos.length} aportes en total`);
        }
      } else {
        toast.error(data.error || 'Error al consultar historial');
      }
    } catch (e) {
      toast.error('Error de conexión');
    } finally {
      setConsultandoHistorial(false);
    }
  };

  // Coordenadas bancarias oficiales del Consejo Comunal
  const bancoNombreOficial = config.banco_nombre || 'Banco de Venezuela (0102)';
  const bancoCuentaOficial = config.banco_cuenta || '0102-0888-21-0000123456';
  const bancoRifOficial = config.banco_rif || 'C-299916862';
  const bancoTelefonoOficial = config.banco_telefono || '0412-1234567';
  const bancoTitularOficial = config.banco_titular || 'Consejo Comunal Dr. Alfredo Travieso Paúl - Las Llaves';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl my-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-white">
                  Aportes Comunitarios y Servicios
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">
                  Gas Comunal · LOCC 2023
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400">
                Declaración de pagos, autogestión comunitaria y consulta de aportes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas de Selección: Declarar Aporte vs Mis Aportes */}
        <div className="grid grid-cols-2 p-2 bg-slate-950/60 border-b border-slate-800 text-xs font-bold gap-2">
          <button
            onClick={() => setActiveTab('declarar')}
            className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'declarar'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Declarar Aporte (Gas)</span>
          </button>

          <button
            onClick={() => setActiveTab('historial')}
            className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'historial'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Consultar Mis Aportes</span>
          </button>
        </div>

        {/* CONTENIDO PESTAÑA 1: DECLARACIÓN DE APORTE PARA JORNADA */}
        {activeTab === 'declarar' && (
          <div className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            
            {reciboGenerado ? (
              /* PANTALLA DE ÉXITO CON RECIBO DIGITAL */
              <div className="p-6 rounded-3xl bg-slate-950/90 border border-emerald-500/40 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                    Declaración Registrada Exitosamente
                  </span>
                  <h3 className="text-xl font-extrabold text-white mt-1">
                    {reciboGenerado.jornada_titulo}
                  </h3>
                  <div className="inline-block mt-2 px-3 py-1 rounded-xl bg-slate-900 border border-slate-750 font-mono text-sm font-bold text-amber-300">
                    N° Recibo: {reciboGenerado.codigo_recibo}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-left text-xs space-y-2">
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400">Titular Censado:</span>
                    <strong className="text-white">{reciboGenerado.solicitante} ({reciboGenerado.cedula})</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400">Vivienda:</span>
                    <strong className="text-slate-200">Vereda {reciboGenerado.vereda} - Casa {reciboGenerado.casa}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400">Unidades de Servicio:</span>
                    <strong className="text-amber-300">{reciboGenerado.unidades} unidades</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400">N° de Transferencia / Ref:</span>
                    <strong className="text-white font-mono">{reciboGenerado.referencia}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400">Alícuota de Autogestión Comunal:</span>
                    <strong className="text-blue-400">Bs. {Number(reciboGenerado.alicuota_autogestion_bs || 0).toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-300 font-bold">Total Pagado:</span>
                    <strong className="text-emerald-400 text-sm font-black">
                      Bs. {Number(reciboGenerado.total_bs).toFixed(2)} (${Number(reciboGenerado.total_usd).toFixed(2)} USD)
                    </strong>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-2 border border-slate-700"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir Comprobante</span>
                  </button>
                  <button
                    onClick={() => {
                      setReciboGenerado(null);
                      setCantidades({});
                      setNumeroTransferencia('');
                      setVecinoData(null);
                      setCedula('');
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/30"
                  >
                    Realizar Otra Declaración
                  </button>
                </div>
              </div>
            ) : !jornadaActiva ? (
              /* NO HAY JORNADA ABIERTA */
              <div className="p-8 rounded-3xl bg-slate-950/60 border border-slate-800 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
                  <Flame className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">No hay jornadas de servicios abiertas actualmente</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  La vocería de servicios y mesa técnica de gas publicará la próxima fecha de jornada comunitaria a través de este portal.
                </p>
              </div>
            ) : (
              /* FORMULARIO DE DECLARACIÓN ACTIVO */
              <form onSubmit={handleSubmitDeclaracion} className="space-y-4">
                
                {/* Banner de Jornada Activa */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/30">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Jornada Activa
                    </span>
                    <span className="text-[11px] text-slate-300 font-medium">
                      Cierre de recepción: <strong>{jornadaActiva.fecha_cierre}</strong>
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-extrabold text-white">
                    {jornadaActiva.titulo}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {jornadaActiva.descripcion}
                  </p>
                </div>

                {/* PASO 1: Identificación y Validación en Censo */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-blue-400" />
                      1. Identificación del Vecino Censado
                    </span>
                    {vecinoData && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Censado Activo
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ej: V-12345678"
                      value={cedula}
                      onChange={(e) => setCedula(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={verificarVecinoEnCenso}
                      disabled={verificandoVecino}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>{verificandoVecino ? 'Buscando...' : 'Verificar Censo'}</span>
                    </button>
                  </div>

                  {vecinoData && (
                    <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/20 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Titular:</span>
                        <strong className="text-white">{vecinoData.nombres} {vecinoData.apellidos}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Ubicación Comunal:</span>
                        <strong className="text-emerald-400">Vereda {vecinoData.vereda} - Casa {vecinoData.casa}</strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* PASO 2: Selección de Bombonas con Límite Máximo por Familia */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-amber-400" />
                      2. Selección de Cilindros (Máximo {maxPermitido} por familia)
                    </span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                      totalUnidadesSeleccionadas > maxPermitido
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        : totalUnidadesSeleccionadas === maxPermitido
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                    }`}>
                      Seleccionadas: {totalUnidadesSeleccionadas} / {maxPermitido}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {itemsJornada.map((it) => {
                      const idKey = it.id || it.codigo;
                      const cant = Number(cantidades[idKey] || 0);
                      const pu = Number(it.precio_usd || 0);
                      const subtotalBsItem = Number((cant * pu * tasaBcv).toFixed(2));

                      return (
                        <div
                          key={idKey}
                          className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3"
                        >
                          <div>
                            <span className="text-xs font-bold text-white block">
                              {it.nombre}
                            </span>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>${pu.toFixed(2)} USD</span>
                              <span>·</span>
                              <span>Autogestión incl.: ${Number(it.alicuota_autogestion_usd || 0).toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => cambiarCantidad(idKey, -1)}
                              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-sm border border-slate-700"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-bold text-xs text-white">
                              {cant}
                            </span>
                            <button
                              type="button"
                              onClick={() => cambiarCantidad(idKey, 1)}
                              className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center text-sm"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Resumen de Costo y Tasa BCV */}
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-blue-500/30 text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-300">
                      <span>Total Unidades:</span>
                      <strong>{totalUnidadesSeleccionadas} cilindro(s)</strong>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Monto en Divisas:</span>
                      <strong>${totalUsd.toFixed(2)} USD</strong>
                    </div>
                    <div className="flex justify-between text-slate-400 text-[10px]">
                      <span>Alícuota de Autogestión Logística:</span>
                      <span>${totalAlicuotaUsd.toFixed(2)} USD (Bs. {totalAlicuotaBs.toFixed(2)})</span>
                    </div>
                    <div className="flex justify-between text-slate-300 border-t border-slate-800 pt-1.5">
                      <span>Tasa Oficial BCV:</span>
                      <strong>Bs. {Number(tasaBcv).toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between border-t border-blue-900/50 pt-2 text-sm font-extrabold text-white">
                      <span className="text-emerald-400">Total a Transferir:</span>
                      <span className="text-emerald-400 text-base">Bs. {totalBs.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* PASO 3: Coordenadas Bancarias Oficiales del Consejo Comunal */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 to-slate-900 border border-blue-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-bold text-white">Coordenadas de Pago Oficial del Consejo Comunal</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Cuenta Receptora Única
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Banco Receptor:</span>
                      <strong className="text-white">{bancoNombreOficial}</strong>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block">RIF Consejo Comunal:</span>
                        <strong className="text-amber-300 font-mono">{bancoRifOficial}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => copiarTexto(bancoRifOficial, 'rif')}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold"
                      >
                        {copiadoKey === 'rif' ? '¡Copiado!' : 'Copiar'}
                      </button>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between sm:col-span-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block">N° de Cuenta Bancaria:</span>
                        <strong className="text-white font-mono text-[11px] sm:text-xs">{bancoCuentaOficial}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => copiarTexto(bancoCuentaOficial.replace(/[-\s]/g, ''), 'cuenta')}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold shrink-0"
                      >
                        {copiadoKey === 'cuenta' ? '¡Copiado!' : 'Copiar'}
                      </button>
                    </div>

                    {bancoTelefonoOficial && (
                      <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between sm:col-span-2">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Pago Móvil (Teléfono Revisor):</span>
                          <strong className="text-emerald-400 font-mono">{bancoTelefonoOficial}</strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => copiarTexto(bancoTelefonoOficial.replace(/[-\s]/g, ''), 'tlf')}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold shrink-0"
                        >
                          {copiadoKey === 'tlf' ? '¡Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Titular: <strong>{bancoTitularOficial}</strong>
                  </p>
                </div>

                {/* PASO 4: Datos del Pago Realizado por el Vecino */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-white block">
                    4. Declarar Comprobante de Transferencia / Pago Móvil
                  </span>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Banco de Origen (Desde donde pagó) *
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        N° de Referencia / Transferencia *
                      </label>
                      <input
                        type="text"
                        required
                        value={numeroTransferencia}
                        onChange={(e) => setNumeroTransferencia(e.target.value)}
                        placeholder="Ej: 12345678"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Fecha de Pago *
                      </label>
                      <input
                        type="date"
                        required
                        value={fechaPago}
                        onChange={(e) => setFechaPago(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Teléfono de Contacto (Para avisarle la entrega)
                    </label>
                    <input
                      type="text"
                      value={telefonoContacto}
                      onChange={(e) => setTelefonoContacto(e.target.value)}
                      placeholder="Ej: 0412-5551234"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white text-xs"
                    />
                  </div>
                </div>

                {/* Botón de Envío */}
                <button
                  type="submit"
                  disabled={loading || totalUnidadesSeleccionadas <= 0 || !vecinoData}
                  className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
                >
                  <Flame className="w-4 h-4" />
                  <span>
                    {loading
                      ? 'Procesando Declaración...'
                      : `Declarar Aporte (${totalUnidadesSeleccionadas} cilindros · Bs. ${totalBs.toFixed(2)})`}
                  </span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* CONTENIDO PESTAÑA 2: HISTORIAL DE MIS APORTES */}
        {activeTab === 'historial' && (
          <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            <form onSubmit={handleConsultarHistorial} className="flex gap-2">
              <input
                type="text"
                placeholder="Ingrese su cédula (ej: V-12345678)"
                value={cedulaConsulta}
                onChange={(e) => setCedulaConsulta(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={consultandoHistorial}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{consultandoHistorial ? 'Buscando...' : 'Consultar'}</span>
              </button>
            </form>

            {historialData && (
              <div className="space-y-4 animate-in fade-in">
                {/* Aportes de Jornadas de Servicios */}
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>Aportes de Jornadas de Servicios ({historialData.servicios.length})</span>
                  </h4>

                  {historialData.servicios.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-3 rounded-xl bg-slate-950 border border-slate-850">
                      No se registran aportes de gas o servicios con esta cédula.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {historialData.servicios.map((s) => (
                        <div
                          key={s.id}
                          className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-xs">{s.jornada_titulo || 'Jornada de Gas'}</span>
                              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                                s.estado === 'ENTREGADO'
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : s.estado === 'VERIFICADO'
                                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                                  : s.estado === 'RECHAZADO'
                                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              }`}>
                                {s.estado}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-2">
                              <span>Recibo: <strong className="text-amber-300 font-mono">{s.codigo_recibo}</strong></span>
                              <span>·</span>
                              <span>Ref: <strong className="text-white font-mono">{s.numero_transferencia}</strong></span>
                              <span>·</span>
                              <span>{s.fecha_pago}</span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-bold text-emerald-400 text-xs block">
                              Bs. {Number(s.total_bs).toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ${Number(s.total_usd).toFixed(2)} USD ({s.total_unidades} cil.)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Aportes de Documentos */}
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-blue-400" />
                    <span>Aportes por Trámites de Constancias ({historialData.documentos.length})</span>
                  </h4>

                  {historialData.documentos.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-3 rounded-xl bg-slate-950 border border-slate-850">
                      No se registran trámites de constancias con esta cédula.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {historialData.documentos.map((d) => (
                        <div
                          key={d.id}
                          className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-xs">{d.tipo_documento}</span>
                              <span className="text-[10px] font-mono text-blue-400">{d.codigo_qr}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {d.es_exonerado ? (
                                <span className="text-emerald-400 font-semibold">Exonerado 100% ({d.motivo_exoneracion || 'Caso Social'})</span>
                              ) : (
                                <span>Ref: {d.numero_transferencia || 'N/A'} · {d.fecha_pago || d.fecha_emision}</span>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {d.es_exonerado ? (
                              <span className="text-emerald-400 font-bold text-xs">$0.00 (Gratis)</span>
                            ) : (
                              <>
                                <span className="font-bold text-emerald-400 text-xs block">
                                  Bs. {Number(d.monto_bs || 0).toFixed(2)}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  ${Number(d.monto_usd || 1).toFixed(2)} USD
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

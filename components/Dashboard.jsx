'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Users, FileText, ClipboardList, DollarSign,
  PenTool, Sliders, ShieldCheck, History, BarChart3, Settings,
  LogOut, Plus, Search, Filter, Download, Upload, Check, X,
  AlertTriangle, RefreshCw, Eye, EyeOff, Edit, Trash2, Key, CheckCircle2,
  Calendar, Clock, UserCheck, ShieldAlert, Sun, Moon, Image as ImageIcon,
  ListPlus, Store, FileCheck, Printer
} from 'lucide-react';
import { 
  VEREDAS, CASAS_POR_VEREDA, getCasasPorVereda, BANCOS_VENEZUELA, CALIDADES_TENENCIA,
  MAPEO_PARENTESCO, MAPEO_INSTRUCCION, MAPEO_SALUD
} from '@/lib/territory';
import { generarDocumentoPdf, generarReporteGestionPdf } from '@/lib/pdfGenerator';
import SvgCanvasEditor from '@/components/SvgCanvasEditor';
import { toast } from '@/lib/toast';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts';

export default function Dashboard({ user, onLogout }) {
  // Hash routing
  const [currentTab, setCurrentTab] = useState('dashboard');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') || 'dashboard';
      if (['dashboard', 'vecinos', 'documentos', 'censo', 'pagos', 'firmas', 'modelador', 'usuarios', 'auditoria', 'estadisticas', 'configuracion'].includes(hash)) {
        setCurrentTab(hash);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (tab) => {
    window.location.hash = `#${tab}`;
    setCurrentTab(tab);
  };

  // Estados de datos generales
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [tasaBcv, setTasaBcv] = useState(875.65);

  // Estados de Reporte de Gestión en PDF por Rango de Fechas
  const [fechaInicioReporte, setFechaInicioReporte] = useState('');
  const [fechaFinReporte, setFechaFinReporte] = useState('');
  const [generandoReportePdf, setGenerandoReportePdf] = useState(false);

  // Estados para Crear Nuevo Documento en Modelador
  const [modalNuevaPlantilla, setModalNuevaPlantilla] = useState(false);
  const [nuevaPlantillaForm, setNuevaPlantillaForm] = useState({
    id: '',
    titulo: '',
    subtitulo: 'NRO: {codigo_qr}',
    cuerpo_template: '',
  });

  // Estados para Costos y Gratuidad por Tipo de Documento
  const [docCostos, setDocCostos] = useState({});

  // Estados de módulo Vecinos
  const [vecinos, setVecinos] = useState([]);
  const [filtroVereda, setFiltroVereda] = useState('');
  const [filtroCasa, setFiltroCasa] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [loadingVecinos, setLoadingVecinos] = useState(false);
  const [modalNuevoVecino, setModalNuevoVecino] = useState(false);
  const [modalImportarCsv, setModalImportarCsv] = useState(false);
  const [csvPreviewData, setCsvPreviewData] = useState(null);

  // Estados de módulo Documentos
  const [documentos, setDocumentos] = useState([]);
  const [filtroDocTipo, setFiltroDocTipo] = useState('');
  const [filtroDocEstado, setFiltroDocEstado] = useState('');
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Estados de módulo Censo
  const [planillasCenso, setPlanillasCenso] = useState([]);
  const [modalCenso, setModalCenso] = useState(false);
  const [planillaActiva, setPlanillaActiva] = useState(null);
  const [censoForm, setCensoForm] = useState({
    numero_planilla: '',
    fecha: new Date().toISOString().split('T')[0],
    empadronador_nombre: user?.nombre || '',
    calle_vereda_av: 'A',
    numero_casa: '',
    telefono_contacto: '',
    tenencia_vivienda: 'Propia',
    anos_residiendo: '',
    tiempo_residencia_desde: '',
    total_familias: 1,
    total_habitantes: 1,
    observaciones: '',
    habitantes: []
  });
  const [vecinoNuevoForm, setVecinoNuevoForm] = useState({
    cedula: '',
    nombres: '',
    apellidos: '',
    vereda: 'A',
    casa: '',
    tiempo_residencia: '',
    calidad_tenencia: 'Propia',
    telefono: '',
    email: '',
    sexo: 'M',
    fecha_nacimiento: ''
  });

  // Estados de módulo Firmas
  const [firmas, setFirmas] = useState([]);
  const [modalFirma, setModalFirma] = useState(null); // null o { ...firma }
  const [selloPrincipalUrl, setSelloPrincipalUrl] = useState('https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/sello.png');
  const [selloTamanoMm, setSelloTamanoMm] = useState(34);
  const [selloForma, setSelloForma] = useState('rectangular'); // 'rectangular' | 'cuadrado' | 'redondo' | 'ovalado'
  const [selloAnchoMm, setSelloAnchoMm] = useState(48);
  const [selloAltoMm, setSelloAltoMm] = useState(26);
  const [guardandoSello, setGuardandoSello] = useState(false);
  const [mensajeSello, setMensajeSello] = useState('');
  const selloFileInputRef = useRef(null);

  // Estados de módulo Presets Oficiales (Logos e Imágenes Institucionales)
  const [presetsImagenes, setPresetsImagenes] = useState([]);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [modalPreset, setModalPreset] = useState(false);
  const [presetEditando, setPresetEditando] = useState(null);
  const [presetForm, setPresetForm] = useState({
    nombre: '',
    url: '',
    ancho: 60,
    alto: 60,
    bloquear_proporcion: true,
    categoria: 'OFICIAL',
  });
  const [subiendoImagenPreset, setSubiendoImagenPreset] = useState(false);
  const presetFileInputRef = useRef(null);

  // Estados de módulo Catálogos Oficiales (Parentesco, Instrucción, Salud)
  const [catalogos, setCatalogos] = useState({
    parentesco: Object.entries(MAPEO_PARENTESCO).map(([codigo, descripcion], i) => ({ id: `p_${codigo}`, tipo: 'parentesco', codigo, descripcion, orden: i + 1 })),
    instruccion: Object.entries(MAPEO_INSTRUCCION).map(([codigo, descripcion], i) => ({ id: `i_${codigo}`, tipo: 'instruccion', codigo, descripcion, orden: i + 1 })),
    salud: Object.entries(MAPEO_SALUD).map(([codigo, descripcion], i) => ({ id: `s_${codigo}`, tipo: 'salud', codigo, descripcion, orden: i + 1 })),
  });
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);
  const [modalCatalogo, setModalCatalogo] = useState(false);
  const [catalogoEditando, setCatalogoEditando] = useState(null);
  const [catalogoForm, setCatalogoForm] = useState({
    tipo: 'parentesco',
    codigo: '',
    descripcion: '',
    orden: 1,
  });

  // Estados de módulo Modelador
  const [plantillas, setPlantillas] = useState([]);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState(null);
  const [modeladorSubTab, setModeladorSubTab] = useState('cabecera'); // 'cabecera' | 'cuerpo' | 'pie' | 'previsualizacion'

  // Estados de módulo Usuarios (Super Admin) y Permisos Granulares
  const [usuarios, setUsuarios] = useState([]);
  const [modalUsuario, setModalUsuario] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [presetSeleccionado, setPresetSeleccionado] = useState('CENSISTA');
  const [permisosForm, setPermisosForm] = useState({
    vecinos: true,
    vecinos_crear: true,
    censo_masivo: true,
    vecinos_editar: true,
    vecinos_aprobar: false,
    vecinos_eliminar: false,
    censo: true,
    documentos: false,
    docs_emitir: false,
    docs_anular: false,
    pagos: false,
    firmas: false,
    firmas_edit: false,
    modelador: false,
    modelador_edit: false,
    estadisticas: false,
    auditoria: false,
  });

  const checkPermiso = (key) => {
    if (!user) return false;
    if (user.rol === 'SUPER_ADMIN') return true;
    const perms = typeof user.permisos === 'string' ? JSON.parse(user.permisos || '{}') : (user.permisos || {});
    if (perms[key] !== undefined) return Boolean(perms[key]);
    if (user.rol === 'ADMIN') {
      return ['vecinos', 'censo', 'documentos', 'pagos', 'estadisticas', 'auditoria', 'vecinos_crear', 'censo_masivo', 'vecinos_editar', 'vecinos_aprobar', 'docs_emitir'].includes(key);
    }
    return ['vecinos', 'censo'].includes(key);
  };

  const aplicarPreset = (presetName) => {
    setPresetSeleccionado(presetName);
    if (presetName === 'CENSISTA') {
      setPermisosForm({
        vecinos: true,
        censo: true,
        vecinos_crear: true,
        censo_masivo: true,
        vecinos_editar: true,
        vecinos_aprobar: false,
        vecinos_eliminar: false,
        documentos: false,
        docs_emitir: false,
        docs_anular: false,
        pagos: false,
        firmas: false,
        firmas_edit: false,
        modelador: false,
        modelador_edit: false,
        estadisticas: false,
        auditoria: false,
      });
    } else if (presetName === 'DOCUMENTAL') {
      setPermisosForm({
        vecinos: true,
        censo: true,
        documentos: true,
        docs_emitir: true,
        docs_anular: false,
        vecinos_crear: false,
        censo_masivo: false,
        vecinos_editar: false,
        vecinos_aprobar: false,
        vecinos_eliminar: false,
        pagos: false,
        firmas: false,
        firmas_edit: false,
        modelador: false,
        modelador_edit: false,
        estadisticas: false,
        auditoria: false,
      });
    } else if (presetName === 'ADMIN') {
      setPermisosForm({
        vecinos: true,
        censo: true,
        documentos: true,
        pagos: true,
        firmas: false,
        firmas_edit: false,
        modelador: false,
        modelador_edit: false,
        estadisticas: true,
        auditoria: true,
        vecinos_crear: true,
        censo_masivo: true,
        vecinos_editar: true,
        vecinos_aprobar: true,
        vecinos_eliminar: false,
        docs_emitir: true,
        docs_anular: false,
      });
    }
  };

  const abrirModalCrearUsuario = () => {
    setUsuarioEditando(null);
    aplicarPreset('CENSISTA');
    setModalUsuario(true);
  };

  const abrirModalEditarUsuario = (u) => {
    setUsuarioEditando(u);
    const uPerms = typeof u.permisos === 'string' ? JSON.parse(u.permisos || '{}') : (u.permisos || {});
    setPermisosForm({
      vecinos: uPerms.vecinos ?? true,
      vecinos_crear: uPerms.vecinos_crear ?? false,
      censo_masivo: uPerms.censo_masivo ?? false,
      vecinos_editar: uPerms.vecinos_editar ?? false,
      vecinos_aprobar: uPerms.vecinos_aprobar ?? false,
      vecinos_eliminar: uPerms.vecinos_eliminar ?? false,
      censo: uPerms.censo ?? true,
      documentos: uPerms.documentos ?? false,
      docs_emitir: uPerms.docs_emitir ?? false,
      docs_anular: uPerms.docs_anular ?? false,
      pagos: uPerms.pagos ?? false,
      firmas: uPerms.firmas ?? false,
      firmas_edit: uPerms.firmas_edit ?? false,
      modelador: uPerms.modelador ?? false,
      modelador_edit: uPerms.modelador_edit ?? false,
      estadisticas: uPerms.estadisticas ?? false,
      auditoria: uPerms.auditoria ?? false,
    });
    setPresetSeleccionado('CUSTOM');
    setModalUsuario(true);
  };

  // Estados de módulo Auditoría
  const [auditorias, setAuditorias] = useState([]);
  const [loadingAuditoria, setLoadingAuditoria] = useState(false);

  // Estados de módulo Configuración
  const [config, setConfig] = useState({});
  const [modalResetProd, setModalResetProd] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetCheckVecinos, setResetCheckVecinos] = useState(true);
  const [resetCheckCenso, setResetCheckCenso] = useState(true);
  const [resetCheckDocs, setResetCheckDocs] = useState(true);
  const [resetCheckAudit, setResetCheckAudit] = useState(true);
  const [resetCargando, setResetCargando] = useState(false);
  const [mostrarPasswordUsuario, setMostrarPasswordUsuario] = useState(false);

  // Estado de Tema Claro / Oscuro
  const [theme, setTheme] = useState('dark');

  // Cargar estadísticas, configuración y firmas al inicio
  useEffect(() => {
    fetch('/api/dolar').then(r => r.json()).then(d => setTasaBcv(d.promedio || 875.65)).catch(() => {});
    cargarEstadisticas();
    cargarConfiguracion();
    cargarFirmas();
    cargarModelador();
    const isLight = document.documentElement.classList.contains('light');
    setTheme(isLight ? 'light' : 'dark');
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
    try {
      localStorage.setItem('cc_theme', nextTheme);
    } catch (e) {}
  };

  const cargarEstadisticas = async (fIni = fechaInicioReporte, fFin = fechaFinReporte) => {
    setLoadingStats(true);
    try {
      const p = new URLSearchParams();
      if (fIni) p.append('fechaInicio', fIni);
      if (fFin) p.append('fechaFin', fFin);
      const url = p.toString() ? `/api/estadisticas?${p.toString()}` : '/api/estadisticas';
      const res = await fetch(url);
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleGenerarReportePdf = async () => {
    setGenerandoReportePdf(true);
    try {
      // 1. Obtener datos actualizados para el rango seleccionado
      const p = new URLSearchParams();
      if (fechaInicioReporte) p.append('fechaInicio', fechaInicioReporte);
      if (fechaFinReporte) p.append('fechaFin', fechaFinReporte);
      const url = p.toString() ? `/api/estadisticas?${p.toString()}` : '/api/estadisticas';
      
      const [statsRes, firmasRes] = await Promise.all([
        fetch(url).then(r => r.json()).catch(() => ({})),
        fetch('/api/firmas').then(r => r.json()).catch(() => ({ firmas: [] })),
      ]);

      const statData = statsRes.resumen ? statsRes : stats;

      await generarReporteGestionPdf({
        rango: { fechaInicio: fechaInicioReporte, fechaFin: fechaFinReporte },
        resumen: statData?.resumen || {},
        tiposDocs: statData?.graficos?.tiposDocs || [],
        veredasData: statData?.graficos?.veredasData || [],
        firmas: firmasRes.firmas || firmas || [],
        config: config || {},
        usuarioGenerador: user?.nombre || user?.username || 'Vocería Ejecutiva'
      });

      toast.success('Informe de gestión y auditoría descargado exitosamente');
    } catch (err) {
      console.error('Error generando reporte PDF:', err);
      toast.error('Error al generar reporte: ' + err.message);
    } finally {
      setGenerandoReportePdf(false);
    }
  };

  // Cargas por tab y eventos de catálogos
  useEffect(() => {
    cargarCatalogosSistema();
    const handleCatalogosUpdate = () => {
      cargarCatalogosSistema();
    };
    window.addEventListener('catalogos_updated', handleCatalogosUpdate);
    return () => {
      window.removeEventListener('catalogos_updated', handleCatalogosUpdate);
    };
  }, []);

  useEffect(() => {
    if (currentTab === 'vecinos') { cargarVecinos(); cargarCatalogosSistema(); }
    if (currentTab === 'documentos') cargarDocumentos();
    if (currentTab === 'censo') { cargarCenso(); cargarCatalogosSistema(); }
    if (currentTab === 'firmas') cargarFirmas();
    if (currentTab === 'modelador') cargarModelador();
    if (currentTab === 'usuarios' && user?.rol === 'SUPER_ADMIN') cargarUsuarios();
    if (currentTab === 'auditoria') cargarAuditoria();
    if (currentTab === 'configuracion') cargarConfiguracion();
    if (currentTab === 'estadisticas') cargarEstadisticas();
  }, [currentTab, filtroVereda, filtroCasa, filtroEstado, filtroBusqueda]);

  const cargarVecinos = async () => {
    setLoadingVecinos(true);
    try {
      const params = new URLSearchParams();
      if (filtroVereda) params.append('vereda', filtroVereda);
      if (filtroCasa) params.append('casa', filtroCasa);
      if (filtroEstado) params.append('estado', filtroEstado);
      if (filtroBusqueda) params.append('q', filtroBusqueda);

      const res = await fetch(`/api/vecinos?${params.toString()}`);
      const data = await res.json();
      setVecinos(data.vecinos || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingVecinos(false);
    }
  };

  const aprobarVecino = async (vecinoId) => {
    if (!confirm('¿Confirmas autorizar y certificar a este vecino en la comunidad? Esta acción quedará auditada con tu nombre.')) return;
    try {
      const res = await fetch('/api/vecinos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', vecinoId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message || 'Vecino aprobado con éxito');
      cargarVecinos();
      cargarEstadisticas();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const cargarDocumentos = async () => {
    setLoadingDocs(true);
    try {
      const params = new URLSearchParams();
      if (filtroDocTipo) params.append('tipo', filtroDocTipo);
      if (filtroDocEstado) params.append('estado', filtroDocEstado);
      const res = await fetch(`/api/documentos?${params.toString()}`);
      const data = await res.json();
      setDocumentos(data.documentos || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDocs(false);
    }
  };

  const revocarDocumento = async (codigo) => {
    const motivo = prompt('Ingresa el motivo de la revocación:');
    if (!motivo) return;
    try {
      const res = await fetch('/api/documentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revocar', codigo, motivo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message || 'Documento revocado');
      cargarDocumentos();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const cargarCenso = async () => {
    try {
      const res = await fetch('/api/censo');
      const data = await res.json();
      setPlanillasCenso(data.planillas || []);
    } catch (e) {
      console.error(e);
    }
  };

  const cargarFirmas = async () => {
    try {
      const res = await fetch('/api/firmas');
      const data = await res.json();
      setFirmas(data.firmas || []);
      if (data.sello_principal_url) setSelloPrincipalUrl(data.sello_principal_url);
      if (data.sello_forma) setSelloForma(data.sello_forma);
      if (data.sello_ancho_mm) setSelloAnchoMm(parseFloat(data.sello_ancho_mm) || 48);
      if (data.sello_alto_mm) setSelloAltoMm(parseFloat(data.sello_alto_mm) || 26);
      if (data.sello_tamano_mm) setSelloTamanoMm(parseFloat(data.sello_tamano_mm) || 34);
    } catch (e) {
      console.error(e);
    }
  };

  const guardarConfiguracionSello = async () => {
    setGuardandoSello(true);
    try {
      const res = await fetch('/api/configuracion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            ...config,
            sello_forma: selloForma,
            sello_ancho_mm: String(selloAnchoMm),
            sello_alto_mm: String(selloAltoMm),
            sello_tamano_mm: String(selloAnchoMm),
            sello_principal_url: selloPrincipalUrl,
          },
        }),
      });
      if (res.ok) {
        setConfig((prev) => ({
          ...prev,
          sello_forma: selloForma,
          sello_ancho_mm: String(selloAnchoMm),
          sello_alto_mm: String(selloAltoMm),
          sello_tamano_mm: String(selloAnchoMm),
          sello_principal_url: selloPrincipalUrl,
        }));
        setMensajeSello('¡Forma y dimensiones del sello guardadas correctamente!');
        toast.success('¡Forma y dimensiones del sello guardadas correctamente!');
        setTimeout(() => setMensajeSello(''), 3500);
      } else {
        toast.error('Error al guardar la configuración del sello');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error de conexión');
    } finally {
      setGuardandoSello(false);
    }
  };

  const subirArchivoAStorage = async (file, folder = 'firmas_sellos', customName = 'archivo') => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
      formData.append('filename', customName);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.r2_configured) {
          toast.success('✓ Imagen subida a Cloudflare R2');
        } else if (data.warning) {
          toast.info('Aviso: R2 sin claves en .env.local. Almacenado temporalmente en Base64');
        }
        return data.url;
      } else {
        toast.error(data.error || 'Error subiendo imagen');
        return null;
      }
    } catch (err) {
      console.error(err);
      toast.error('Error de conexión al subir imagen');
      return null;
    }
  };

  const handleSubirSelloPrincipal = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const urlSubida = await subirArchivoAStorage(file, 'firmas_sellos', 'sello_principal_oficial');
    if (urlSubida) {
      setSelloPrincipalUrl(urlSubida);
    }
    e.target.value = '';
  };

  const eliminarFirma = async (id, nombre) => {
    if (!confirm(`¿Estás seguro de eliminar la firma autorizada de ${nombre}?`)) return;
    try {
      const res = await fetch(`/api/firmas?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success('Firma eliminada exitosamente');
        cargarFirmas();
      } else {
        toast.error(data.error || 'Error al eliminar firma');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error al conectar con el servidor');
    }
  };

  const guardarPlantilla = async (plantillaToSave) => {
    const p = plantillaToSave || plantillaSeleccionada;
    if (!p) return;
    try {
      const res = await fetch('/api/modelador', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Plantilla guardada exitosamente');
        cargarModelador();
      } else {
        toast.error(data.error || 'Error al guardar plantilla');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error de conexión con el servidor');
    }
  };

  const descargarMuestraPdf = async (plantilla) => {
    try {
      const docMuestra = {
        codigo_qr: 'MUESTRA999',
        tipo_documento: plantilla.id,
        cedula: 'V-12.345.678',
        nombres_apellidos: 'CIUDADANO EJEMPLAR DE PRUEBA',
        vereda: 'A',
        casa: 'A-8',
        tiempo_residencia: '15',
        fecha_emision: new Date().toISOString().split('T')[0],
        fecha_vencimiento: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        vigencia_dias: 60,
      };
      await generarDocumentoPdf({
        documento: docMuestra,
        firmas,
        config: {
          ...config,
          sello_forma: selloForma,
          sello_ancho_mm: String(selloAnchoMm),
          sello_alto_mm: String(selloAltoMm),
          sello_tamano_mm: String(selloAnchoMm),
          sello_principal_url: selloPrincipalUrl,
        },
        plantilla,
      });
      toast.success('PDF de muestra generado');
    } catch (e) {
      console.error(e);
      toast.error('Error al generar PDF de muestra');
    }
  };

  const cargarModelador = async () => {
    try {
      const res = await fetch('/api/modelador');
      const data = await res.json();
      setPlantillas(data.plantillas || []);
      if (data.plantillas?.length > 0 && !plantillaSeleccionada) {
        setPlantillaSeleccionada(data.plantillas[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const cargarUsuarios = async () => {
    try {
      const res = await fetch('/api/auth?list=1');
      const data = await res.json();
      setUsuarios(data.users || []);
    } catch (e) {
      console.error(e);
    }
  };

  const cargarAuditoria = async () => {
    setLoadingAuditoria(true);
    try {
      const res = await fetch('/api/auditoria');
      const data = await res.json();
      setAuditorias(data.logs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAuditoria(false);
    }
  };

  const cargarConfiguracion = async () => {
    try {
      const res = await fetch('/api/configuracion');
      const data = await res.json();
      const cfg = data.config || {};
      setConfig(cfg);
      if (cfg.sello_forma) setSelloForma(cfg.sello_forma);
      if (cfg.sello_ancho_mm) setSelloAnchoMm(parseFloat(cfg.sello_ancho_mm) || 48);
      if (cfg.sello_alto_mm) setSelloAltoMm(parseFloat(cfg.sello_alto_mm) || 26);
      if (cfg.doc_costos_json) {
        try {
          const parsed = JSON.parse(cfg.doc_costos_json);
          setDocCostos(parsed);
        } catch (e) {
          console.warn('Error parsing doc_costos_json:', e);
        }
      }
      cargarModelador();
      cargarPresetsImagenes();
      cargarCatalogosSistema();
    } catch (e) {
      console.error(e);
    }
  };

  const guardarCostosDocumentos = async (nuevosCostos) => {
    try {
      const updatedStr = JSON.stringify(nuevosCostos);
      const res = await fetch('/api/configuracion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            doc_costos_json: updatedStr
          }
        })
      });
      if (res.ok) {
        setDocCostos(nuevosCostos);
        toast.success('Costos y gratuidades por documento actualizados exitosamente');
        window.dispatchEvent(new CustomEvent('config_updated', { detail: { doc_costos_json: updatedStr } }));
      } else {
        const d = await res.json();
        toast.error(d.error || 'Error al guardar costos');
      }
    } catch (e) {
      toast.error('Error de conexión: ' + e.message);
    }
  };

  const crearNuevaPlantilla = async (e) => {
    e.preventDefault();
    if (!nuevaPlantillaForm.id || !nuevaPlantillaForm.titulo) {
      toast.error('Identificador único y Título son requeridos');
      return;
    }
    try {
      const res = await fetch('/api/modelador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaPlantillaForm),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('¡Nueva plantilla documental creada!');
        setModalNuevaPlantilla(false);
        setNuevaPlantillaForm({
          id: '',
          titulo: '',
          subtitulo: 'NRO: {codigo_qr}',
          cuerpo_template: '',
        });
        await cargarModelador();
        if (data.plantilla) setPlantillaSeleccionada(data.plantilla);
      } else {
        toast.error(data.error || 'Error al crear plantilla');
      }
    } catch (err) {
      toast.error('Error de conexión: ' + err.message);
    }
  };

  const eliminarPlantillaDocumental = async (plantilla) => {
    if (!confirm(`¿Estás seguro de eliminar permanentemente la plantilla "${plantilla.titulo}" (${plantilla.id})?`)) return;
    try {
      const res = await fetch(`/api/modelador?id=${encodeURIComponent(plantilla.id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success('Plantilla eliminada exitosamente');
        setPlantillaSeleccionada(null);
        cargarModelador();
      } else {
        toast.error(data.error || 'Error al eliminar plantilla');
      }
    } catch (err) {
      toast.error('Error de conexión: ' + err.message);
    }
  };

  const cargarCatalogosSistema = async () => {
    setLoadingCatalogos(true);
    try {
      const res = await fetch('/api/catalogos');
      if (res.ok) {
        const data = await res.json();
        if (data.catalogos) {
          setCatalogos({
            parentesco: data.catalogos.parentesco || [],
            instruccion: data.catalogos.instruccion || [],
            salud: data.catalogos.salud || [],
          });
        }
      }
    } catch (e) {
      console.error('Error cargando catálogos:', e);
    } finally {
      setLoadingCatalogos(false);
    }
  };

  const abrirModalCrearCatalogo = (tipoDefecto = 'parentesco') => {
    setCatalogoEditando(null);
    const lista = catalogos[tipoDefecto] || [];
    const maxOrden = lista.reduce((max, it) => Math.max(max, Number(it.orden) || 0), 0);
    // Sugerir la siguiente letra del alfabeto si es posible
    const letrasUsadas = lista.map(it => (it.codigo || '').toLowerCase());
    let sigLetra = 'g';
    for (const l of 'abcdefghijklmnopqrstuvwxyz'.split('')) {
      if (!letrasUsadas.includes(l)) {
        sigLetra = l;
        break;
      }
    }

    setCatalogoForm({
      tipo: tipoDefecto,
      codigo: sigLetra,
      descripcion: '',
      orden: maxOrden + 1,
    });
    setModalCatalogo(true);
  };

  const abrirModalEditarCatalogo = (item) => {
    setCatalogoEditando(item);
    setCatalogoForm({
      tipo: item.tipo,
      codigo: item.codigo,
      descripcion: item.descripcion,
      orden: item.orden || 1,
    });
    setModalCatalogo(true);
  };

  const guardarCatalogoItem = async (e) => {
    e.preventDefault();
    if (!catalogoForm.codigo || !catalogoForm.descripcion) {
      toast.error('Código / Literal y Descripción son obligatorios');
      return;
    }

    try {
      const method = catalogoEditando?.id && !String(catalogoEditando.id).includes('_') ? 'PUT' : 'POST';
      const payload = {
        ...catalogoForm,
        ...(catalogoEditando?.id && !String(catalogoEditando.id).includes('_') ? { id: catalogoEditando.id } : {}),
      };

      const res = await fetch('/api/catalogos', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Ítem guardado con éxito');
        setModalCatalogo(false);
        setCatalogoEditando(null);
        await cargarCatalogosSistema();
        try {
          window.dispatchEvent(new CustomEvent('catalogos_updated'));
        } catch (err) {}
      } else {
        toast.error(data.error || 'Error al guardar ítem de catálogo');
      }
    } catch (err) {
      toast.error('Error de red al guardar ítem de catálogo');
    }
  };

  const eliminarCatalogoItem = async (item) => {
    if (!confirm(`¿Eliminar la opción "${item.codigo.toUpperCase()} = ${item.descripcion}" del catálogo ${item.tipo}?`)) return;
    try {
      if (String(item.id).includes('_')) {
        // En caso de que no haya sido persistido en DB, llamar DELETE por tipo y codigo
        toast.info('Sincronizando catálogo con base de datos...');
      }
      const res = await fetch(`/api/catalogos?id=${item.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Ítem eliminado con éxito');
        await cargarCatalogosSistema();
        try {
          window.dispatchEvent(new CustomEvent('catalogos_updated'));
        } catch (err) {}
      } else {
        toast.error(data.error || 'Error al eliminar ítem');
      }
    } catch (err) {
      toast.error('Error de conexión al eliminar ítem');
    }
  };

  const cargarPresetsImagenes = async () => {
    setLoadingPresets(true);
    try {
      const res = await fetch('/api/presets');
      if (res.ok) {
        const data = await res.json();
        setPresetsImagenes(data.presets || []);
      }
    } catch (e) {
      console.error('Error cargando presets:', e);
    } finally {
      setLoadingPresets(false);
    }
  };

  const abrirModalCrearPreset = () => {
    setPresetEditando(null);
    setPresetForm({
      nombre: '',
      url: '',
      ancho: 60,
      alto: 60,
      bloquear_proporcion: true,
      categoria: 'OFICIAL',
    });
    setModalPreset(true);
  };

  const abrirModalEditarPreset = (p) => {
    setPresetEditando(p);
    setPresetForm({
      nombre: p.name || p.nombre || '',
      url: p.url || '',
      ancho: p.defaultW || p.ancho || 60,
      alto: p.defaultH || p.alto || 60,
      bloquear_proporcion: p.lockRatio !== undefined ? Boolean(p.lockRatio) : true,
      categoria: p.categoria || 'OFICIAL',
    });
    setModalPreset(true);
  };

  const guardarPresetOficial = async (e) => {
    e.preventDefault();
    if (!presetForm.nombre || !presetForm.url) {
      toast.error('Nombre y URL de la imagen son obligatorios');
      return;
    }

    try {
      const method = presetEditando?.id ? 'PUT' : 'POST';
      const bodyPayload = {
        ...presetForm,
        ...(presetEditando?.id ? { id: presetEditando.id } : {}),
      };

      const res = await fetch('/api/presets', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Preset guardado con éxito');
        setModalPreset(false);
        setPresetEditando(null);
        cargarPresetsImagenes();
      } else {
        toast.error(data.error || 'Error al guardar preset');
      }
    } catch (err) {
      toast.error('Error de conexión al guardar preset');
    }
  };

  const eliminarPresetOficial = async (preset) => {
    if (!confirm(`¿Estás seguro de eliminar el preset "${preset.name || preset.nombre}"?`)) return;
    try {
      const res = await fetch(`/api/presets?id=${preset.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success('Preset eliminado exitosamente');
        cargarPresetsImagenes();
      } else {
        toast.error(data.error || 'Error al eliminar preset');
      }
    } catch (err) {
      toast.error('Error de red al eliminar preset');
    }
  };

  // Descarga de plantillas CSV con las 15 columnas homologadas (únicamente cabecera y datos)
  const descargarPlantillaCsv = () => {
    const cabecera = "CEDULA,NOMBRES,APELLIDOS,NUMERO_FAMILIA,VEREDA,CASA,TIEMPO_RESIDENCIA_ANOS,CALIDAD_TENENCIA,SEXO,PARENTESCO,NIVEL_INSTRUCCION,PROFESION_OCUPACION,CONDICION_SALUD,TELEFONO,EMAIL\n";
    const ejemplos = 
      "V-15432198,MARIA ELENA,RODRIGUEZ PEREZ,1,A,A-8,12,Propia,F,a,e,Docente,e,04129876543,maria@ejemplo.com\n" +
      "V-12345678,PEDRO JOSE,PEREZ GOMEZ,1,A,A-8,12,Propia,M,b,d,Comerciante,e,04141234567,pedro@ejemplo.com\n" +
      "V-28123456,ANA SOFIA,PEREZ RODRIGUEZ,1,A,A-8,12,Propia,F,c,c,Estudiante,e,04245551234,ana@ejemplo.com\n" +
      "V-14555888,JOSE LUIS,PEREZ GOMEZ,2,A,A-8,4,Familia Adjunta / Agregada,M,a,c,Mecánico,e,04169998877,joseluis@ejemplo.com\n";

    const blob = new Blob([cabecera + ejemplos], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_censo_vecinos_oficial_las_llaves.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Menú lateral dinámico filtrado según permisos del usuario activo
  const menuItems = [
    { id: 'dashboard', label: 'Resumen General', icon: LayoutDashboard },
    ...(checkPermiso('vecinos') ? [{ id: 'vecinos', label: 'Padrón de Vecinos', icon: Users }] : []),
    ...(checkPermiso('documentos') ? [{ id: 'documentos', label: 'Gestor Documental', icon: FileText }] : []),
    ...(checkPermiso('censo') ? [{ id: 'censo', label: 'Censo Familiar', icon: ClipboardList }] : []),
    ...(checkPermiso('pagos') ? [{ id: 'pagos', label: 'Aportes Comunitarios', icon: DollarSign }] : []),
    ...(checkPermiso('firmas') ? [{ id: 'firmas', label: 'Firmas y Sellos', icon: PenTool }] : []),
    ...(checkPermiso('modelador') ? [{ id: 'modelador', label: 'Modelador Documentos', icon: Sliders }] : []),
    ...(user?.rol === 'SUPER_ADMIN' ? [{ id: 'usuarios', label: 'Usuarios y Permisos', icon: ShieldCheck }] : []),
    ...(checkPermiso('auditoria') ? [{ id: 'auditoria', label: 'Bitácora y Accesos', icon: History }] : []),
    ...(checkPermiso('estadisticas') ? [{ id: 'estadisticas', label: 'Estadísticas Visuales', icon: BarChart3 }] : []),
    ...(user?.rol === 'SUPER_ADMIN' ? [{ id: 'configuracion', label: 'Configuración', icon: Settings }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col md:flex-row">
      
      {/* Sidebar Lateral */}
      <aside className="w-full md:w-64 bg-slate-950 border-r border-slate-800/80 p-4 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo y Encabezado Sidebar */}
          <div className="flex items-center gap-3 px-2 py-3 mb-6 border-b border-slate-850">
            <img
              src="https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/logo.png"
              alt="Logo"
              className="w-10 h-10 object-contain"
            />
            <div>
              <h2 className="text-xs font-extrabold text-white leading-tight">CONSEJO COMUNAL</h2>
              <span className="text-[11px] font-bold text-blue-400">LAS LLAVES</span>
            </div>
          </div>

          {/* Menú de Navegación por Hash */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Perfil del Usuario y Salir */}
        <div className="pt-4 border-t border-slate-850">
          <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 mb-2">
            <span className="text-[10px] text-slate-400 block font-medium">Sesión activa como:</span>
            <span className="text-xs font-bold text-white block truncate">{user?.nombre || user?.username}</span>
            <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-extrabold bg-blue-500/15 text-blue-400 border border-blue-500/20">
              {user?.rol}
            </span>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Área de Contenido Principal */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
        
        {/* Barra Superior Global del Dashboard */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800/80">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Consejo Comunal Las Llaves</span>
            <span>/</span>
            <span className="text-blue-400 font-bold uppercase tracking-wider">{currentTab}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="hidden sm:inline-flex text-xs px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 font-semibold shadow-sm">
              BCV Oficial: <strong>Bs. {Number(tasaBcv).toFixed(2)}</strong>
            </span>

            {/* Selector de Modo Claro / Modo Oscuro */}
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-400 hover:text-amber-300 hover:bg-slate-850 transition text-xs font-semibold shadow-sm"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline text-slate-300 text-[11px]">Modo Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-blue-500" />
                  <span className="hidden sm:inline text-slate-700 text-[11px]">Modo Oscuro</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* TAB: DASHBOARD */}
        {currentTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-white">Panel de Control Comunal</h1>
                <p className="text-xs text-slate-400">Resumen operativo y métricas en tiempo real</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 font-semibold">
                  Tasa BCV Oficial: <strong>Bs. {Number(tasaBcv).toFixed(2)}</strong>
                </span>
                <button
                  onClick={cargarEstadisticas}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
                  title="Refrescar métricas"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl glass-panel">
                <span className="text-xs font-bold text-slate-400 block mb-1">Vecinos Censados</span>
                <span className="text-2xl sm:text-3xl font-extrabold text-white">
                  {stats?.resumen?.vecinos_total || 0}
                </span>
                <div className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{stats?.resumen?.vecinos_aprobados || 0} aprobados</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl glass-panel">
                <span className="text-xs font-bold text-slate-400 block mb-1">Pendientes por Aprobar</span>
                <span className="text-2xl sm:text-3xl font-extrabold text-amber-400">
                  {stats?.resumen?.vecinos_pendientes || 0}
                </span>
                <button
                  onClick={() => { setFiltroEstado('PENDIENTE'); navigateTo('vecinos'); }}
                  className="mt-2 text-[11px] text-blue-400 hover:underline block"
                >
                  Ver pendientes &rarr;
                </button>
              </div>

              <div className="p-5 rounded-2xl glass-panel">
                <span className="text-xs font-bold text-slate-400 block mb-1">Documentos Emitidos</span>
                <span className="text-2xl sm:text-3xl font-extrabold text-blue-400">
                  {stats?.resumen?.documentos_total || 0}
                </span>
                <span className="mt-2 text-[11px] text-slate-400 block">
                  {stats?.resumen?.documentos_vigentes || 0} vigentes · {stats?.resumen?.documentos_vencidos || 0} vencidos
                </span>
              </div>

              <div className="p-5 rounded-2xl glass-panel">
                <span className="text-xs font-bold text-slate-400 block mb-1">Aportes Recaudados</span>
                <span className="text-xl sm:text-2xl font-extrabold text-emerald-400">
                  Bs. {Number(stats?.resumen?.recaudado_bs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                </span>
                <span className="mt-2 text-[11px] text-slate-400 block">
                  Equiv: ${Number(stats?.resumen?.recaudado_usd || 0).toFixed(2)} USD
                </span>
              </div>
            </div>

            {/* Accesos Rápidos */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-4">Acciones Comunes de Gestión</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => { setModalNuevoVecino(true); navigateTo('vecinos'); }}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/40 text-left transition"
                >
                  <Plus className="w-5 h-5 text-blue-400 mb-2" />
                  <span className="text-xs font-bold text-white block">Registrar Nuevo Vecino</span>
                  <span className="text-[11px] text-slate-400">Incorporación manual al padrón</span>
                </button>

                <button
                  onClick={() => { setModalImportarCsv(true); navigateTo('vecinos'); }}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 text-left transition"
                >
                  <Upload className="w-5 h-5 text-emerald-400 mb-2" />
                  <span className="text-xs font-bold text-white block">Carga Masiva CSV</span>
                  <span className="text-[11px] text-slate-400">Importar familias desde censo</span>
                </button>

                <button
                  onClick={() => navigateTo('documentos')}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-left transition"
                >
                  <FileText className="w-5 h-5 text-amber-400 mb-2" />
                  <span className="text-xs font-bold text-white block">Auditar Constancias</span>
                  <span className="text-[11px] text-slate-400">Ver constancias con QR emitidas</span>
                </button>
              </div>
            </div>
          </div>
        )}

        
        {/* PANTALLA DE ACCESO RESTRINGIDO */}
        {currentTab !== "dashboard" && (
          (["usuarios", "configuracion"].includes(currentTab) && user?.rol !== "SUPER_ADMIN") ||
          (!["usuarios", "configuracion"].includes(currentTab) && !checkPermiso(currentTab))
        ) && (
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center max-w-md mx-auto my-16 animate-in fade-in space-y-4 shadow-2xl">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white">Módulo Restringido</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tu perfil de vocero actual no cuenta con permisos autorizados para acceder a este módulo. Si necesitas acceso, comunícate con la coordinación del Consejo Comunal.
            </p>
            <button
              onClick={() => navigateTo(checkPermiso("vecinos") ? "vecinos" : "dashboard")}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md shadow-blue-600/30"
            >
              Ir a mi módulo asignado
            </button>
          </div>
        )}

        {/* TAB: PADRÓN DE VECINOS */}
        {currentTab === 'vecinos' && checkPermiso('vecinos') && (
          <div className="space-y-5 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-white">Padrón de Vecinos de la Comunidad</h1>
                <p className="text-xs text-slate-400">Gestión de habitantes, validación de residencia y asignación territorial</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {checkPermiso("censo_masivo") && (
                  <button
                    onClick={() => setModalImportarCsv(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-xs font-semibold text-emerald-400 hover:bg-slate-800 transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Carga Masiva (CSV)</span>
                  </button>
                )}

                {checkPermiso("vecinos_crear") && (
                  <button
                    onClick={() => setModalNuevoVecino(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition shadow-md shadow-blue-600/30"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nuevo Registro Vecino</span>
                  </button>
                )}
              </div>
            </div>

            {/* Barra de Filtros en Tiempo Real */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Buscar (Cédula o Nombre)</label>
                <input
                  type="text"
                  value={filtroBusqueda}
                  onChange={(e) => setFiltroBusqueda(e.target.value)}
                  placeholder="Ej: 12345678 o Pérez"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-750 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Filtrar por Vereda</label>
                <select
                  value={filtroVereda}
                  onChange={(e) => { setFiltroVereda(e.target.value); setFiltroCasa(''); }}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-750 text-white text-xs"
                >
                  <option value="">Todas las Veredas</option>
                  {VEREDAS.map((v) => (
                    <option key={v} value={v}>Vereda {v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Filtrar por Casa</label>
                <select
                  value={filtroCasa}
                  onChange={(e) => setFiltroCasa(e.target.value)}
                  disabled={!filtroVereda}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-750 text-white text-xs disabled:opacity-50"
                >
                  <option value="">Todas las Casas</option>
                  {filtroVereda && getCasasPorVereda(filtroVereda).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Estado de Aprobación</label>
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-750 text-white text-xs"
                >
                  <option value="">Todos los Estados</option>
                  <option value="APROBADO">Aprobados</option>
                  <option value="PENDIENTE">Pendientes de Aprobación</option>
                  <option value="RECHAZADO">Rechazados</option>
                </select>
              </div>
            </div>

            {/* Tabla de Vecinos */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Cédula</th>
                      <th className="px-4 py-3">Nombre Completo</th>
                      <th className="px-4 py-3">Ubicación</th>
                      <th className="px-4 py-3">Tiempo Residencia</th>
                      <th className="px-4 py-3">Tenencia</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Autorizado Por</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {vecinos.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-4 py-8 text-center text-slate-500">
                          {loadingVecinos ? 'Cargando vecinos...' : 'No se encontraron vecinos con los filtros seleccionados.'}
                        </td>
                      </tr>
                    ) : (
                      vecinos.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-850/50 transition">
                          <td className="px-4 py-3 font-mono font-bold text-white whitespace-nowrap">{v.cedula}</td>
                          <td className="px-4 py-3 font-semibold text-slate-200">{v.nombres} {v.apellidos}</td>
                          <td className="px-4 py-3 text-slate-300">Vereda {v.vereda}, Casa {v.casa}</td>
                          <td className="px-4 py-3 text-slate-400">{v.tiempo_residencia} años</td>
                          <td className="px-4 py-3 text-slate-400">{v.calidad_tenencia}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {v.estado_aprobacion === 'APROBADO' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                APROBADO
                              </span>
                            ) : v.estado_aprobacion === 'PENDIENTE' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                PENDIENTE
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                RECHAZADO
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[11px] text-slate-400">
                            {v.aprobado_por_nombre ? (
                              <span title={`Aprobado el ${v.aprobado_en}`}>
                                {v.aprobado_por_nombre}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {v.estado_aprobacion === 'PENDIENTE' && checkPermiso('vecinos_aprobar') && (
                              <button
                                onClick={() => aprobarVecino(v.id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition shadow"
                              >
                                Aprobar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: GESTOR DOCUMENTAL */}
        {currentTab === 'documentos' && checkPermiso('documentos') && (
          <div className="space-y-5 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-white">Gestor de Documentos Comunitarios</h1>
                <p className="text-xs text-slate-400">Control de constancias emitidas, códigos QR de validación y estados de vigencia</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={cargarDocumentos}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Actualizar</span>
                </button>
              </div>
            </div>

            {/* Filtros de Documentos */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Tipo de Documento</label>
                <select
                  value={filtroDocTipo}
                  onChange={(e) => setFiltroDocTipo(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-750 text-white text-xs"
                >
                  <option value="">Todos los Tipos</option>
                  <option value="RESIDENCIA">Carta de Residencia</option>
                  <option value="BUENA_CONDUCTA">Constancia de Buena Conducta</option>
                  <option value="FALLECIMIENTO">Notificación de Fallecimiento</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Estado de Vigencia</label>
                <select
                  value={filtroDocEstado}
                  onChange={(e) => setFiltroDocEstado(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-750 text-white text-xs"
                >
                  <option value="">Todos los Estados</option>
                  <option value="VIGENTE">Vigentes</option>
                  <option value="VENCIDO">Vencidos</option>
                  <option value="REVOCADO">Revocados</option>
                </select>
              </div>
            </div>

            {/* Tabla de Documentos Emitidos */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Código QR</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Titular</th>
                      <th className="px-4 py-3">Cédula</th>
                      <th className="px-4 py-3">Emisión</th>
                      <th className="px-4 py-3">Vencimiento</th>
                      <th className="px-4 py-3">Vigencia</th>
                      <th className="px-4 py-3">Aporte</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {documentos.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="px-4 py-8 text-center text-slate-500">
                          {loadingDocs ? 'Cargando documentos...' : 'No hay documentos registrados.'}
                        </td>
                      </tr>
                    ) : (
                      documentos.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-850/50 transition">
                          <td className="px-4 py-3 font-mono font-bold text-blue-400 whitespace-nowrap">{d.codigo_qr}</td>
                          <td className="px-4 py-3 font-medium text-slate-200">{d.tipo_documento}</td>
                          <td className="px-4 py-3 font-semibold text-white">{d.nombres_apellidos}</td>
                          <td className="px-4 py-3 font-mono text-slate-300">{d.cedula}</td>
                          <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{d.fecha_emision}</td>
                          <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{d.fecha_vencimiento}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {d.estado_calculado === 'VIGENTE' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {d.dias_restantes}d restantes
                              </span>
                            ) : d.estado_calculado === 'VENCIDO' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                VENCIDO
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                REVOCADO
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[11px] text-slate-300 whitespace-nowrap">
                            {d.es_exonerado ? (
                              <span className="text-emerald-400 font-semibold">Exonerado</span>
                            ) : (
                              <span>Bs. {Number(d.monto_bs || 0).toFixed(2)}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap space-x-1.5">
                            <button
                              onClick={() => {
                                window.open(`/#validar?codigo=${d.codigo_qr}`, '_blank');
                              }}
                              title="Ver en Validador"
                              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={async () => {
                                let plant = plantillas.find((p) => p.id === d.tipo_documento);
                                if (!plant) {
                                  try {
                                    const resPl = await fetch(`/api/modelador?id=${encodeURIComponent(d.tipo_documento)}`);
                                    const dataPl = await resPl.json();
                                    plant = dataPl.plantilla;
                                  } catch (e) {}
                                }
                                await generarDocumentoPdf({
                                  documento: d,
                                  firmas,
                                  config,
                                  plantilla: plant,
                                });
                              }}
                              title="Descargar PDF Oficial"
                              className="p-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-400"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            {d.estado_calculado === 'VIGENTE' && (
                              <button
                                onClick={() => revocarDocumento(d.codigo_qr)}
                                title="Revocar Documento"
                                className="p-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: CENSO SOCIODEMOGRÁFICO Y FAMILIAR */}
        {currentTab === 'censo' && checkPermiso('censo') && (
          <div className="space-y-5 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-white">Instrumento de Censo Sociodemográfico y Familiar</h1>
                <p className="text-xs text-slate-400">Planillas oficiales por vivienda, registro de familias y habitantes</p>
              </div>

              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/censo?proximo_numero=1').then(r => r.json());
                    const nextNum = res.sugerido || `PLC-${String(Date.now()).slice(-4)}`;
                    setPlanillaActiva({
                      planilla: {
                        numero_planilla: nextNum,
                        fecha: new Date().toISOString().split('T')[0],
                        empadronador_nombre: user?.nombre || '',
                        calle_vereda_av: 'A',
                        numero_casa: '',
                        telefono_contacto: '',
                        tenencia_vivienda: 'Propia',
                        tiempo_residencia_desde: '',
                        total_familias: 1,
                        total_habitantes: 1,
                        observaciones: ''
                      },
                      habitantes: [
                        {
                          numero_familia: 1,
                          nombres_apellidos: '',
                          cedula: '',
                          sexo: 'M',
                          fecha_nacimiento: '',
                          parentesco: 'a',
                          instruccion: 'c',
                          profesion_ocupacion: '',
                          salud: 'e',
                          telefono_movil: ''
                        }
                      ]
                    });
                    setModalCenso(true);
                  } catch (e) {
                    setPlanillaActiva(null);
                    setModalCenso(true);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition shadow-md shadow-blue-600/30"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nueva Planilla de Censo</span>
              </button>
            </div>

            {/* Listado de Planillas de Censo */}
            {planillasCenso.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-400">
                <ClipboardList className="w-12 h-12 text-blue-400 mx-auto mb-3 opacity-60" />
                <h3 className="text-base font-bold text-white mb-1">Aún no hay planillas registradas</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                  Registra la primera vivienda con sus respectivos núcleos familiares y habitantes.
                </p>
                <button
                  onClick={async () => {
                    const res = await fetch('/api/censo?proximo_numero=1').then(r => r.json()).catch(() => ({}));
                    setPlanillaActiva({
                      planilla: {
                        numero_planilla: res.sugerido || 'PLC-0001',
                        fecha: new Date().toISOString().split('T')[0],
                        empadronador_nombre: user?.nombre || '',
                        calle_vereda_av: 'A',
                        numero_casa: '',
                        telefono_contacto: '',
                        tenencia_vivienda: 'Propia',
                        total_familias: 1,
                        total_habitantes: 1,
                      },
                      habitantes: [{ numero_familia: 1, nombres_apellidos: '', cedula: '', sexo: 'M', parentesco: 'a', instruccion: 'c', salud: 'e' }]
                    });
                    setModalCenso(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-1.5 mx-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear Planilla</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {planillasCenso.map((p) => (
                  <div key={p.id} className="p-5 rounded-2xl glass-panel relative border border-slate-800 hover:border-blue-500/30 transition flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                          PLANILLA N° {p.numero_planilla}
                        </span>
                        <span className="text-[11px] text-slate-400">{p.fecha}</span>
                      </div>

                      <h3 className="font-bold text-base text-white mb-1">
                        Vereda {p.calle_vereda_av}, Casa {p.numero_casa}
                      </h3>
                      <p className="text-xs text-slate-400 mb-3">
                        Empadronador: <strong className="text-slate-300">{p.empadronador_nombre || 'No asignado'}</strong>
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 border-t border-slate-800/80 pt-3 mb-4">
                        <div>Familias: <strong className="text-white">{p.total_familias}</strong></div>
                        <div>Habitantes: <strong className="text-white">{p.total_habitantes}</strong></div>
                        <div>Tenencia: <strong className="text-white">{p.tenencia_vivienda}</strong></div>
                        <div>Teléfono: <strong className="text-white">{p.telefono_contacto || 'N/A'}</strong></div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                      <button
                        onClick={async () => {
                          const res = await fetch(`/api/censo?id=${p.id}`).then(r => r.json());
                          setPlanillaActiva(res);
                          setModalCenso(true);
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-blue-600/15 hover:bg-blue-600/30 text-blue-300 border border-blue-500/20 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Ver / Editar</span>
                      </button>

                      {checkPermiso('censo') && (
                        <button
                          onClick={async () => {
                            if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente la Planilla N° ${p.numero_planilla} (Vereda ${p.calle_vereda_av}, Casa ${p.numero_casa}) y todos sus habitantes?`)) {
                              return;
                            }
                            try {
                              const res = await fetch(`/api/censo?id=${p.id}`, { method: 'DELETE' });
                              const d = await res.json();
                              if (res.ok) {
                                toast.success(d.message || 'Planilla eliminada exitosamente');
                                cargarCenso();
                              } else {
                                toast.error(d.error || 'Error al eliminar la planilla');
                              }
                            } catch (e) {
                              toast.error('Error de conexión al eliminar');
                            }
                          }}
                          title="Eliminar Planilla"
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: FIRMAS Y SELLOS AUTORIZADOS */}
        {currentTab === 'firmas' && checkPermiso('firmas') && (
          <div className="space-y-5 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-white">Firmas y Sellos Autorizados</h1>
                <p className="text-xs text-slate-400">Gestión de voceros firmantes, subida de firmas transparentes (PNG) y sellos oficiales</p>
              </div>

              {(user?.rol === 'SUPER_ADMIN' || user?.rol === 'ADMIN') && (
                <button
                  onClick={() =>
                    setModalFirma({
                      comision: '',
                      nombre: '',
                      cedula: '',
                      telefono: '',
                      orden: firmas.length + 1,
                      url_firma: null,
                      url_sello: null,
                      usar_sello_principal: 1,
                      activo: 1,
                    })
                  }
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/30"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar Firma Autorizada</span>
                </button>
              )}
            </div>

            {/* PANEL DE CONTROL DEL SELLO PRINCIPAL OFICIAL */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-white">Sello Principal Oficial del Consejo Comunal</h2>
                    <p className="text-xs text-slate-400">
                      Configuración de perspectiva y forma geométrica (Rectangular oficial, Cuadrado, Redondo u Ovalado) y tamaño en PDF
                    </p>
                  </div>
                </div>

                {mensajeSello && (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 animate-in fade-in">
                    <Check className="w-4 h-4" /> {mensajeSello}
                  </span>
                )}
              </div>

              {/* Selector de Perspectiva / Forma Geométrica */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  Selecciona la Perspectiva / Forma del Sello Físico Oficial:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'rectangular', label: 'Rectangular', badge: 'Oficial Actual', desc: 'Ancho > Alto (p. ej. 48×26 mm)' },
                    { id: 'redondo', label: 'Redondo', badge: '1:1 Circular', desc: 'Diámetro simétrico (p. ej. 34 mm)' },
                    { id: 'cuadrado', label: 'Cuadrado', badge: '1:1 Equilátero', desc: 'Lados iguales (p. ej. 34 mm)' },
                    { id: 'ovalado', label: 'Ovalado', badge: 'Elíptico', desc: 'Curvatura suave (p. ej. 45×28 mm)' },
                  ].map((formaItem) => {
                    const isSelected = selloForma === formaItem.id;
                    return (
                      <button
                        key={formaItem.id}
                        type="button"
                        onClick={() => {
                          setSelloForma(formaItem.id);
                          if (formaItem.id === 'rectangular') {
                            setSelloAnchoMm(48);
                            setSelloAltoMm(26);
                          } else if (formaItem.id === 'ovalado') {
                            setSelloAnchoMm(45);
                            setSelloAltoMm(28);
                          } else if (formaItem.id === 'redondo' || formaItem.id === 'cuadrado') {
                            const dim = Math.round((selloAnchoMm + selloAltoMm) / 2) || 34;
                            setSelloAnchoMm(dim);
                            setSelloAltoMm(dim);
                          }
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500 shadow-md shadow-blue-500/10'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className={`text-xs font-extrabold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                            {formaItem.label}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {formaItem.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">
                          {formaItem.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Vista Previa y Controles de Tamaño */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center pt-2">
                {/* Vista Previa Adaptada a la Geometría Elegida */}
                <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-950 border border-slate-850 text-center space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Vista Previa Perspectiva ({selloForma.toUpperCase()})
                  </span>
                  
                  <div
                    style={{
                      width: `${Math.min(140, Math.max(70, Math.round(selloAnchoMm * 2.3)))}px`,
                      height: `${Math.min(120, Math.max(50, Math.round(selloAltoMm * 2.3)))}px`,
                    }}
                    className={`relative p-2 flex items-center justify-center bg-white/5 transition-all shadow-inner ${
                      selloForma === 'redondo'
                        ? 'rounded-full aspect-square border-2 border-dashed border-blue-500/50'
                        : selloForma === 'cuadrado'
                        ? 'rounded-xl aspect-square border-2 border-dashed border-blue-500/50'
                        : selloForma === 'ovalado'
                        ? 'rounded-[50%] border-2 border-dashed border-blue-500/50'
                        : 'rounded-2xl border-2 border-dashed border-blue-500/50'
                    }`}
                    title={`Perspectiva: ${selloForma}`}
                  >
                    <img
                      src={selloPrincipalUrl}
                      alt="Sello Principal Comunal"
                      className="w-full h-full object-contain select-none pointer-events-none drop-shadow"
                    />
                  </div>

                  <div className="flex flex-col items-center gap-0.5 text-[11px] font-mono text-blue-400 font-bold">
                    <span>{selloAnchoMm} mm ancho × {selloAltoMm} mm alto</span>
                    <span className="text-[10px] text-emerald-400 font-sans font-semibold">
                      {selloForma === 'rectangular' && '✓ Rectángulo Proporcional Oficial'}
                      {selloForma === 'redondo' && '✓ Círculo 1:1 Simétrico'}
                      {selloForma === 'cuadrado' && '✓ Cuadrado 1:1 Simétrico'}
                      {selloForma === 'ovalado' && '✓ Óvalo Elíptico'}
                    </span>
                  </div>
                </div>

                {/* Controles de Dimensiones en mm */}
                <div className="md:col-span-2 space-y-4">
                  {/* Si es Rectangular u Ovalado: Controles independientes de Ancho y Alto */}
                  {(selloForma === 'rectangular' || selloForma === 'ovalado') ? (
                    <div className="space-y-3.5">
                      {/* Control de Ancho */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-200">
                            Ancho Horizontal del Sello en PDF (mm):
                          </label>
                          <span className="text-xs font-mono font-bold text-blue-400 px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800/50">
                            {selloAnchoMm} mm
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="25"
                            max="70"
                            step="1"
                            value={selloAnchoMm}
                            onChange={(e) => setSelloAnchoMm(parseInt(e.target.value, 10))}
                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          />
                          <input
                            type="number"
                            min="25"
                            max="70"
                            value={selloAnchoMm}
                            onChange={(e) => setSelloAnchoMm(Math.max(25, Math.min(70, parseInt(e.target.value, 10) || 48)))}
                            className="w-16 px-2 py-1 rounded-lg bg-slate-950 border border-slate-750 text-white font-mono text-center text-xs"
                          />
                          <span className="text-xs text-slate-400 font-semibold">mm</span>
                        </div>
                      </div>

                      {/* Control de Alto */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-200">
                            Alto Vertical del Sello en PDF (mm):
                          </label>
                          <span className="text-xs font-mono font-bold text-blue-400 px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800/50">
                            {selloAltoMm} mm
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="15"
                            max="50"
                            step="1"
                            value={selloAltoMm}
                            onChange={(e) => setSelloAltoMm(parseInt(e.target.value, 10))}
                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          />
                          <input
                            type="number"
                            min="15"
                            max="50"
                            value={selloAltoMm}
                            onChange={(e) => setSelloAltoMm(Math.max(15, Math.min(50, parseInt(e.target.value, 10) || 26)))}
                            className="w-16 px-2 py-1 rounded-lg bg-slate-950 border border-slate-750 text-white font-mono text-center text-xs"
                          />
                          <span className="text-xs text-slate-400 font-semibold">mm</span>
                        </div>
                      </div>

                      {/* Presets Rectangulares / Ovalados */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[11px] text-slate-400 font-semibold">Presets:</span>
                        {[
                          { label: '48 × 26 mm (Estándar Oficial)', w: 48, h: 26 },
                          { label: '52 × 28 mm (Grande)', w: 52, h: 28 },
                          { label: '42 × 22 mm (Compacto)', w: 42, h: 22 },
                          { label: '45 × 30 mm (Proporción 3:2)', w: 45, h: 30 },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              setSelloAnchoMm(preset.w);
                              setSelloAltoMm(preset.h);
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition ${
                              selloAnchoMm === preset.w && selloAltoMm === preset.h
                                ? 'bg-blue-600 text-white font-bold'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Si es Cuadrado o Redondo: Control Simétrico 1:1 */
                    <div className="space-y-3.5">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-slate-200">
                            {selloForma === 'redondo' ? 'Diámetro Simétrico del Sello Circular (mm):' : 'Lado Simétrico del Sello Cuadrado (mm):'}
                          </label>
                          <span className="text-xs font-mono font-bold text-blue-400 px-2.5 py-0.5 rounded bg-blue-950/60 border border-blue-800/50">
                            {selloAnchoMm} mm
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <input
                            type="range"
                            min="22"
                            max="50"
                            step="1"
                            value={selloAnchoMm}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setSelloAnchoMm(val);
                              setSelloAltoMm(val);
                            }}
                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          />
                          <input
                            type="number"
                            min="22"
                            max="50"
                            value={selloAnchoMm}
                            onChange={(e) => {
                              const val = Math.max(22, Math.min(50, parseInt(e.target.value, 10) || 34));
                              setSelloAnchoMm(val);
                              setSelloAltoMm(val);
                            }}
                            className="w-16 px-2 py-1 rounded-lg bg-slate-950 border border-slate-750 text-white font-mono text-center text-xs"
                          />
                          <span className="text-xs text-slate-400 font-semibold">mm</span>
                        </div>

                        {/* Botones de Ajuste Rápido Simétrico */}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[11px] text-slate-400">Presets 1:1:</span>
                          {[
                            { label: '28 mm (Compacto)', val: 28 },
                            { label: '34 mm (Estándar)', val: 34 },
                            { label: '40 mm (Grande)', val: 40 },
                            { label: '45 mm (Destacado)', val: 45 },
                          ].map((preset) => (
                            <button
                              key={preset.val}
                              type="button"
                              onClick={() => {
                                setSelloAnchoMm(preset.val);
                                setSelloAltoMm(preset.val);
                              }}
                              className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition ${
                                selloAnchoMm === preset.val
                                  ? 'bg-blue-600 text-white font-bold'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                    <div className="flex items-center gap-2">
                      <input
                        ref={selloFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleSubirSelloPrincipal}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => selloFileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
                      >
                        <Upload className="w-3.5 h-3.5" /> Reemplazar Imagen del Sello
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={guardandoSello}
                      onClick={guardarConfiguracionSello}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition"
                    >
                      <Check className="w-4 h-4" /> {guardandoSello ? 'Guardando...' : 'Guardar Ajustes del Sello'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {firmas.map((f) => (
                <div key={f.id} className="p-5 rounded-3xl glass-panel space-y-4 border border-slate-800 shadow-xl relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-950/60 border border-blue-800/40">
                      Firma #{f.orden}
                    </span>
                    <div className="flex items-center gap-1">
                      {(user?.rol === 'SUPER_ADMIN' || user?.rol === 'ADMIN') && (
                        <>
                          <button
                            onClick={() => setModalFirma({ ...f })}
                            title="Editar Datos y Archivos"
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => eliminarFirma(f.id, f.nombre)}
                            title="Eliminar Firma"
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div><span className="text-slate-400">Comisión:</span> <strong className="text-white block font-medium">{f.comision}</strong></div>
                    <div><span className="text-slate-400">Nombre:</span> <strong className="text-white block text-sm">{f.nombre}</strong></div>
                    <div><span className="text-slate-400">Cédula:</span> <strong className="text-white block font-mono">{f.cedula}</strong></div>
                    <div><span className="text-slate-400">Teléfono:</span> <strong className="text-white block">{f.telefono}</strong></div>
                  </div>

                  {/* Visualización de la Firma */}
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-850 text-center space-y-1">
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">Firma Digital PNG</span>
                    {f.url_firma ? (
                      <div className="bg-white/5 rounded-xl p-2 border border-slate-800 flex items-center justify-center min-h-[50px]">
                        <img src={f.url_firma} alt={`Firma ${f.nombre}`} className="max-h-12 max-w-full object-contain" />
                      </div>
                    ) : (
                      <div className="py-2.5 text-center">
                        <span className="text-[11px] text-slate-500 italic block">Sin firma digital</span>
                        <span className="text-[9px] text-slate-600 block">(Línea limpia para firma física manuscrita)</span>
                      </div>
                    )}
                  </div>

                  {/* Visualización del Sello */}
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-850 text-center space-y-1">
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">Sello Asignado</span>
                    {f.usar_sello_principal ? (
                      <div className="flex items-center justify-center gap-2 py-1">
                        <img src={selloPrincipalUrl} alt="Sello Comunal" className="w-8 h-8 object-contain opacity-80" />
                        <span className="text-[11px] text-blue-400 font-semibold text-left">Sello Principal Oficial del Consejo Comunal</span>
                      </div>
                    ) : f.url_sello ? (
                      <div className="bg-white/5 rounded-xl p-2 border border-slate-800 flex items-center justify-center min-h-[50px]">
                        <img src={f.url_sello} alt={`Sello ${f.comision}`} className="max-h-12 max-w-full object-contain" />
                      </div>
                    ) : (
                      <div className="py-2 text-center">
                        <span className="text-[11px] text-slate-500 italic block">Sin sello asignado</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: MODELADOR DE DOCUMENTOS */}
        {currentTab === 'modelador' && checkPermiso('modelador') && (
          <div className="space-y-5 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-white">Modelador de Plantillas Documentales</h1>
                <p className="text-xs text-slate-400">Editor visual SVG para Cabecera, Redacción Legal y Footer interactivo</p>
              </div>

              {plantillaSeleccionada && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => descargarMuestraPdf(plantillaSeleccionada)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition"
                  >
                    <Download className="w-4 h-4 text-blue-400" /> Descargar Muestra PDF
                  </button>
                  <button
                    onClick={() => guardarPlantilla(plantillaSeleccionada)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition"
                  >
                    <Check className="w-4 h-4" /> Guardar Todo
                  </button>
                </div>
              )}
            </div>

            {/* Selector de Plantilla */}
            <div className="flex flex-wrap items-center gap-2.5">
              {plantillas.map((p) => (
                <div key={p.id} className="relative group">
                  <button
                    onClick={() => setPlantillaSeleccionada(p)}
                    className={`px-4 py-2.5 rounded-2xl text-left transition border ${
                      plantillaSeleccionada?.id === p.id
                        ? 'bg-blue-600/20 border-blue-500 text-white font-bold shadow-md shadow-blue-600/20'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs block">{p.titulo}</span>
                    <span className="text-[10px] text-slate-500 font-mono">ID: {p.id}</span>
                  </button>
                  {/* Botón de eliminar si no es una de las plantillas base */}
                  {!['RESIDENCIA', 'BUENA_CONDUCTA', 'FALLECIMIENTO', 'FUNCIONAMIENTO'].includes(p.id) && user?.rol === 'SUPER_ADMIN' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        eliminarPlantillaDocumental(p);
                      }}
                      className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow opacity-0 group-hover:opacity-100 transition"
                      title="Eliminar plantilla"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}

              {/* Botón para Crear Nuevo Documento */}
              {(user?.rol === 'SUPER_ADMIN' || user?.rol === 'ADMIN') && (
                <button
                  type="button"
                  onClick={() => {
                    setNuevaPlantillaForm({
                      id: '',
                      titulo: '',
                      subtitulo: 'NRO: {codigo_qr}',
                      cuerpo_template: 'Quien suscribe, voceros del Consejo Comunal de la Urbanización Dr. Alfredo Travieso Paul "LAS LLAVES", por medio de la presente hacemos constar que el ciudadano (a): {nombre_completo}, portador (a) de la cédula de identidad N°: {cedula}, habitante de la Vereda {vereda}, Casa N° {casa}.\n\nConstancia que se expide a solicitud de parte interesada, en la ciudad de Puerto Cabello, a los {dias} días del mes de {mes} del año {ano}.',
                    });
                    setModalNuevaPlantilla(true);
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-md shadow-indigo-600/20 flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Nuevo Documento</span>
                </button>
              )}
            </div>

            {plantillaSeleccionada && (
              <div className="space-y-4">
                {/* Sub-pestañas del Modelador */}
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
                  <button
                    onClick={() => setModeladorSubTab('cabecera')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                      modeladorSubTab === 'cabecera'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <Sliders className="w-4 h-4" /> 1. Cabecera Institucional (Editor SVG)
                  </button>

                  <button
                    onClick={() => setModeladorSubTab('cuerpo')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                      modeladorSubTab === 'cuerpo'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <FileText className="w-4 h-4" /> 2. Redacción Legal y Variables
                  </button>

                  <button
                    onClick={() => setModeladorSubTab('pie')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                      modeladorSubTab === 'pie'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <Sliders className="w-4 h-4" /> 3. Pie de Página / Footer (Editor SVG)
                  </button>

                  <button
                    onClick={() => setModeladorSubTab('previsualizacion')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                      modeladorSubTab === 'previsualizacion'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <Eye className="w-4 h-4" /> 4. Vista Previa Hoja Completa
                  </button>
                </div>

                {/* Subtab 1: Cabecera SVG */}
                {modeladorSubTab === 'cabecera' && (
                  <SvgCanvasEditor
                    key={`header-${plantillaSeleccionada.id}`}
                    mode="header"
                    initialData={plantillaSeleccionada.encabezado_svg}
                    onSave={async (jsonString) => {
                      const updated = { ...plantillaSeleccionada, encabezado_svg: jsonString };
                      setPlantillaSeleccionada(updated);
                      await guardarPlantilla(updated);
                    }}
                    title={`Editor SVG de Cabecera (${plantillaSeleccionada.titulo})`}
                  />
                )}

                {/* Subtab 2: Cuerpo Legal & Redacción */}
                {modeladorSubTab === 'cuerpo' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Título del Documento</label>
                        <input
                          type="text"
                          value={plantillaSeleccionada.titulo}
                          onChange={(e) => setPlantillaSeleccionada({ ...plantillaSeleccionada, titulo: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-white text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Subtítulo Oficial (Opcional)</label>
                        <input
                          type="text"
                          value={plantillaSeleccionada.subtitulo || ''}
                          onChange={(e) => setPlantillaSeleccionada({ ...plantillaSeleccionada, subtitulo: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-white text-xs"
                          placeholder="Ej: Para trámites legales y bancarios"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Cuerpo Legal y Redacción</label>
                        <textarea
                          rows="10"
                          value={plantillaSeleccionada.cuerpo_template}
                          onChange={(e) => setPlantillaSeleccionada({ ...plantillaSeleccionada, cuerpo_template: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-white text-xs font-mono leading-relaxed"
                        />
                      </div>

                      <button
                        onClick={() => guardarPlantilla(plantillaSeleccionada)}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md shadow-blue-600/30"
                      >
                        Guardar Cambios de Redacción
                      </button>
                    </div>

                    <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-2.5">
                      <span className="font-bold text-white block mb-1 text-sm">Variables Dinámicas Disponibles:</span>
                      <p className="text-[11px] text-slate-400">Inserta estas etiquetas en el texto para que se reemplacen automáticamente con los datos del vecino al emitir:</p>
                      <div className="space-y-1.5 pt-2">
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800"><code className="text-blue-400 font-mono font-bold">{'{nombre_completo}'}</code> - Nombres y apellidos</div>
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800"><code className="text-blue-400 font-mono font-bold">{'{cedula}'}</code> - Cédula con formato</div>
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800"><code className="text-blue-400 font-mono font-bold">{'{vereda}'}</code> - Vereda de residencia</div>
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800"><code className="text-blue-400 font-mono font-bold">{'{casa}'}</code> - Número de casa</div>
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800"><code className="text-blue-400 font-mono font-bold">{'{tiempo_residencia}'}</code> - Años viviendo en la comunidad</div>
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800"><code className="text-blue-400 font-mono font-bold">{'{codigo_qr}'}</code> - Código alfanumérico único</div>
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800"><code className="text-blue-400 font-mono font-bold">{'{dias}'}</code>, <code className="text-blue-400 font-mono">{'{mes}'}</code>, <code className="text-blue-400 font-mono">{'{ano}'}</code> - Fecha actual</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Subtab 3: Pie de Página SVG */}
                {modeladorSubTab === 'pie' && (
                  <SvgCanvasEditor
                    key={`footer-${plantillaSeleccionada.id}`}
                    mode="footer"
                    initialData={plantillaSeleccionada.pie_svg}
                    onSave={async (jsonString) => {
                      const updated = { ...plantillaSeleccionada, pie_svg: jsonString };
                      setPlantillaSeleccionada(updated);
                      await guardarPlantilla(updated);
                    }}
                    title={`Editor SVG de Pie de Página (${plantillaSeleccionada.titulo})`}
                  />
                )}

                {/* Subtab 4: Previsualización de Hoja Completa */}
                {modeladorSubTab === 'previsualizacion' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-300">
                        Esta es la vista previa de cómo quedará el documento impreso en tamaño Carta con la cabecera, redacción legal, firmas y pie configurados.
                      </span>
                      <button
                        onClick={() => descargarMuestraPdf(plantillaSeleccionada)}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition"
                      >
                        <Download className="w-4 h-4" /> Generar y Descargar PDF
                      </button>
                    </div>

                    <div className="flex justify-center p-6 bg-slate-950 rounded-3xl border border-slate-800 overflow-x-auto">
                      <div className="w-[680px] min-h-[850px] bg-white text-slate-900 p-10 shadow-2xl rounded-lg font-serif relative flex flex-col justify-between">
                        {/* Cabecera Mockup */}
                        <div>
                          <div className="text-center border-b border-slate-300 pb-4 mb-6 relative">
                            <img src="https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/mppcomunas.png" alt="Comunas" className="absolute left-0 top-0 h-10 object-contain" />
                            <img src="https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/logo.png" alt="CC" className="absolute right-0 top-0 h-12 object-contain" />
                            <h4 className="text-xs font-bold text-slate-900 tracking-wider">REPÚBLICA BOLIVARIANA DE VENEZUELA</h4>
                            <p className="text-[10px] text-slate-700">MINISTERIO DEL PODER POPULAR PARA LAS COMUNAS</p>
                            <p className="text-[10px] font-bold text-slate-800">CONSEJO COMUNAL &quot;LAS LLAVES&quot;</p>
                            <p className="text-[9px] text-slate-600">Urbanización {config?.urbanizacion || 'Dr. Alfredo Travieso Paúl'} - Parroquia {config?.parroquia || 'Goaigoaza'}</p>
                            <p className="text-[9px] text-slate-500">Municipio {config?.municipio || 'Puerto Cabello'}, Estado {config?.estado || 'Carabobo'} | RIF: {config?.rif || 'C299916862'} | SITUR: {config?.situr_codigo || '08-11-04-001-0033'}</p>
                          </div>

                          <div className="text-right text-[11px] font-mono font-bold text-slate-700 mb-4">
                            NRO: CCLL-MUESTRA999
                          </div>

                          <div className="text-center text-base font-extrabold text-slate-900 tracking-wide mb-6 uppercase">
                            {plantillaSeleccionada.titulo}
                          </div>

                          <div className="text-xs text-slate-800 leading-relaxed text-justify mb-8 whitespace-pre-line">
                            {plantillaSeleccionada.cuerpo_template
                              .replace(/{nombre_completo}/g, 'JUAN CARLOS PÉREZ')
                              .replace(/{cedula}/g, 'V-15.892.450')
                              .replace(/{vereda}/g, 'B')
                              .replace(/{casa}/g, 'B-12')
                              .replace(/{tiempo_residencia}/g, '18')
                              .replace(/{codigo_qr}/g, 'MUESTRA999')
                              .replace(/{dias}/g, String(new Date().getDate()))
                              .replace(/{mes}/g, 'octubre')
                              .replace(/{ano}/g, String(new Date().getFullYear()))}
                          </div>

                          <div className="text-center text-xs text-slate-800 mb-10">
                            <p>Atentamente.</p>
                            <p className="font-bold">Por Consejo Comunal &quot;LAS LLAVES&quot;</p>
                          </div>
                        </div>

                        {/* Firmas y Footer Mockup */}
                        <div>
                          <div className="grid grid-cols-2 gap-8 text-center text-[10px] border-t border-slate-200 pt-6 mb-6">
                            {firmas.slice(0, 2).map((f) => (
                              <div key={f.id} className="space-y-0.5">
                                <div className="h-10 flex items-center justify-center">
                                  {f.url_firma && <img src={f.url_firma} alt="Firma" className="max-h-10 object-contain" />}
                                </div>
                                <div className="border-t border-slate-400 pt-1 font-bold">{f.comision}</div>
                                <div>{f.nombre}</div>
                                <div>C.I.: {f.cedula}</div>
                              </div>
                            ))}
                          </div>

                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
                            <img src="https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/favicon.svg" alt="QR" className="w-12 h-12 object-contain" />
                            <div className="text-[9px] text-slate-600">
                              <span className="font-bold text-slate-900 block">CERTIFICACIÓN Y VALIDACIÓN DIGITAL DE CONSTANCIA</span>
                              <span>Código Único: <strong className="text-blue-600 font-mono">CCLL-MUESTRA999</strong> | Vigencia: 60 Días</span>
                              <span className="block text-slate-400">Verifique en: https://lasllaves.org/#validar</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB: ESTADÍSTICAS VISUALES */}
        {currentTab === 'estadisticas' && checkPermiso('estadisticas') && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h1 className="text-2xl font-extrabold text-white">Estadísticas y Reportes de Gestión</h1>
                <p className="text-xs text-slate-400">Análisis demográfico, horas de descarga, emisión de documentos y auditoría contralora</p>
              </div>

              {/* Botón y Rango para Generación de Reporte PDF */}
              <div className="flex flex-wrap items-center gap-2.5 p-2 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-semibold text-[11px]">Desde:</span>
                  <input
                    type="date"
                    value={fechaInicioReporte}
                    onChange={(e) => {
                      setFechaInicioReporte(e.target.value);
                      cargarEstadisticas(e.target.value, fechaFinReporte);
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-750 text-white text-[11px] focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-slate-400">
                  <span className="font-semibold text-[11px]">Hasta:</span>
                  <input
                    type="date"
                    value={fechaFinReporte}
                    onChange={(e) => {
                      setFechaFinReporte(e.target.value);
                      cargarEstadisticas(fechaInicioReporte, e.target.value);
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-750 text-white text-[11px] focus:outline-none focus:border-blue-500"
                  />
                </div>

                {(fechaInicioReporte || fechaFinReporte) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFechaInicioReporte('');
                      setFechaFinReporte('');
                      cargarEstadisticas('', '');
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition"
                  >
                    Limpiar
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleGenerarReportePdf}
                  disabled={generandoReportePdf}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition shadow-md shadow-emerald-600/20"
                >
                  {generandoReportePdf ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generando PDF...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-3.5 h-3.5" />
                      <span>Generar Reporte de Gestión (PDF)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Tarjetas Resumen */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Vecinos</span>
                <span className="text-xl font-extrabold text-white block">{stats?.resumen?.vecinos_total || 0}</span>
                <span className="text-[10px] text-emerald-400">{stats?.resumen?.vecinos_aprobados || 0} aprobados</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Censo Familias</span>
                <span className="text-xl font-extrabold text-white block">{stats?.resumen?.total_planillas_censo || 0}</span>
                <span className="text-[10px] text-blue-400">{stats?.resumen?.total_habitantes_censo || 0} habitantes</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Locales en Alquiler</span>
                <span className="text-xl font-extrabold text-indigo-400 block">{stats?.resumen?.total_locales_comerciales || 0}</span>
                <span className="text-[10px] text-slate-400">En viviendas</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Documentos</span>
                <span className="text-xl font-extrabold text-white block">{stats?.resumen?.documentos_total || 0}</span>
                <span className="text-[10px] text-emerald-400">{stats?.resumen?.documentos_vigentes || 0} vigentes</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Aporte en Bs.</span>
                <span className="text-lg font-extrabold text-emerald-400 block truncate">Bs. {Number(stats?.resumen?.recaudado_bs || 0).toFixed(2)}</span>
                <span className="text-[10px] text-slate-400">Total recaudado</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Aporte en USD</span>
                <span className="text-lg font-extrabold text-blue-400 block truncate">${Number(stats?.resumen?.recaudado_usd || 0).toFixed(2)}</span>
                <span className="text-[10px] text-purple-400">{stats?.resumen?.documentos_exonerados || 0} exonerados</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Gráfico NUEVO: Trámites por Tipo de Documento */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-1 flex items-center justify-between">
                  <span>Trámites Emitidos por Tipo de Documento</span>
                  <span className="text-[11px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    Total: {stats?.resumen?.documentos_total || 0}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mb-4">Volumen comparativo de constancias y cartas tramitadas</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.graficos?.tiposDocs || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="tipo" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                        {stats?.graficos?.tiposDocs?.map((entry, index) => (
                          <Cell key={`cell-doc-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico NUEVO: Estados y Tipología de Documentos */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-1">Estatus Legal de las Constancias Emitidas</h3>
                <p className="text-xs text-slate-400 mb-4">Relación entre vigentes, vencidos, revocados y exonerados</p>
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats?.graficos?.estadosDocs || []}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {stats?.graficos?.estadosDocs?.map((entry, index) => (
                          <Cell key={`cell-est-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico 1: Horas a las que más descargan */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-1">Horas con Mayor Afluencia de Descargas</h3>
                <p className="text-xs text-slate-400 mb-4">Registro horario (00:00 a 23:00) de tramitación en la plataforma</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.graficos?.horasDescargas || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="hora" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      <Bar dataKey="cantidad" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico 2: Distribución por Género */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-1">Distribución Demográfica por Género</h3>
                <p className="text-xs text-slate-400 mb-4">Población empadronada en el Consejo Comunal</p>
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats?.graficos?.generoData || []}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {stats?.graficos?.generoData?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico 3: Grupos de Edad */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-1">Habitantes Agrupados por Rango de Edad</h3>
                <p className="text-xs text-slate-400 mb-4">Segmentación generacional de la urbanización</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.graficos?.edadesData || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="rango" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      <Bar dataKey="habitantes" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico 4: Habitantes por Vereda */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-1">Cobertura Territorial por Vereda (A a O)</h3>
                <p className="text-xs text-slate-400 mb-4">Total de vecinos registrados por sector</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.graficos?.veredasData || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="vereda" stroke="#64748b" fontSize={9} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      <Bar dataKey="vecinos" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB: BITÁCORA Y AUDITORÍA */}
        {currentTab === 'auditoria' && checkPermiso('auditoria') && (
          <div className="space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-extrabold text-white">Bitácora de Auditoría del Sistema</h1>
                <p className="text-xs text-slate-400">Registro inalterable de accesos al dashboard, descargas de constancias y autorizaciones</p>
              </div>
              <button
                onClick={cargarAuditoria}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300"
              >
                Refrescar
              </button>
            </div>

            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Fecha y Hora</th>
                      <th className="px-4 py-3">Evento</th>
                      <th className="px-4 py-3">Usuario / Vecino</th>
                      <th className="px-4 py-3">Cédula</th>
                      <th className="px-4 py-3">Documento / Código</th>
                      <th className="px-4 py-3">IP / Origen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {auditorias.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-850/50 transition">
                        <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{a.created_at}</td>
                        <td className="px-4 py-2.5 font-bold text-blue-400">{a.tipo_evento}</td>
                        <td className="px-4 py-2.5 text-slate-200">{a.usuario_nombre || 'Público'}</td>
                        <td className="px-4 py-2.5 text-slate-300">{a.cedula || '—'}</td>
                        <td className="px-4 py-2.5 text-emerald-400">{a.codigo_documento || a.tipo_documento || '—'}</td>
                        <td className="px-4 py-2.5 text-slate-500">{a.ip || 'Local'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: USUARIOS Y PERMISOS (SUPER ADMIN) */}
        {currentTab === 'usuarios' && user?.rol === 'SUPER_ADMIN' && (
          <div className="space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-extrabold text-white">Gestión de Usuarios y Vocerías</h1>
                <p className="text-xs text-slate-400">Control de acceso administrado por SUPER_ADMIN (CIENCIA_TECNOLOGIA)</p>
              </div>
              <button
                onClick={abrirModalCrearUsuario}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-lg shadow-blue-600/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Vocero / Administrador</span>
              </button>
            </div>

            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Usuario</th>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Rol</th>
                    <th className="px-4 py-3">Comisión</th>
                    <th className="px-4 py-3">Perfil de Acceso</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {usuarios.map((u) => {
                    const uPerms = typeof u.permisos === 'string' ? JSON.parse(u.permisos || '{}') : (u.permisos || {});
                    const esCensista = uPerms.censo_masivo && !uPerms.firmas && !uPerms.modelador;
                    const esEmisorDocs = uPerms.docs_emitir && !uPerms.firmas && !uPerms.censo_masivo;
                    
                    return (
                      <tr key={u.id} className="hover:bg-slate-850/40 transition">
                        <td className="px-4 py-3 font-mono font-bold text-white">{u.username}</td>
                        <td className="px-4 py-3 font-semibold text-slate-300">{u.nombre}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.rol === 'SUPER_ADMIN' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                            u.rol === 'ADMIN' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' :
                            'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                          }`}>
                            {u.rol}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{u.comision || 'Comisión General'}</td>
                        <td className="px-4 py-3">
                          {u.rol === 'SUPER_ADMIN' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-300">
                              <ShieldCheck className="w-3 h-3 text-purple-400" /> Control Total
                            </span>
                          ) : esCensista ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                              <ClipboardList className="w-3 h-3" /> Digitalizador Censo
                            </span>
                          ) : esEmisorDocs ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/20">
                              <FileText className="w-3 h-3" /> Emisor de Constancias
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                              Personalizado
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {u.activo ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> Inactivo
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={() => abrirModalEditarUsuario(u)}
                            className="px-2.5 py-1 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-bold transition inline-flex items-center gap-1"
                            title="Editar vocero y permisos"
                          >
                            <Sliders className="w-3 h-3" />
                            <span>Permisos</span>
                          </button>
                          {u.username !== 'CIENCIA_TECNOLOGIA' && (
                            <button
                              onClick={async () => {
                                if (!confirm(`¿Confirmas que deseas eliminar el acceso al vocero ${u.username} (${u.nombre})?`)) return;
                                const res = await fetch(`/api/auth?userId=${u.id}`, { method: 'DELETE' });
                                if (res.ok) {
                                  toast.success('Vocero eliminado exitosamente');
                                  cargarUsuarios();
                                } else {
                                  const d = await res.json();
                                  toast.error(d.error || 'Error al eliminar');
                                }
                              }}
                              className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition inline-flex items-center"
                              title="Eliminar usuario"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: CONFIGURACIÓN GENERAL */}
        {currentTab === 'configuracion' && user?.rol === 'SUPER_ADMIN' && (
          <div className="space-y-5 animate-in fade-in max-w-2xl">
            <div>
              <h1 className="text-2xl font-extrabold text-white">Configuración del Sistema Comunal</h1>
              <p className="text-xs text-slate-400">Parámetros institucionales, vigencia de constancias y aportes</p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre del Consejo Comunal</label>
                <input
                  type="text"
                  value={config.comunidad_nombre || ''}
                  onChange={(e) => setConfig({ ...config, comunidad_nombre: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Código SITUR</label>
                  <input
                    type="text"
                    value={config.situr_codigo || ''}
                    onChange={(e) => setConfig({ ...config, situr_codigo: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">RIF Institucional</label>
                  <input
                    type="text"
                    value={config.rif || ''}
                    onChange={(e) => setConfig({ ...config, rif: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Vigencia por Defecto (Días)</label>
                  <select
                    value={config.vigencia_dias_default || '60'}
                    onChange={(e) => setConfig({ ...config, vigencia_dias_default: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white"
                  >
                    <option value="30">30 días</option>
                    <option value="60">60 días</option>
                    <option value="90">90 días</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Aporte Comunitario ($ USD)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={config.aporte_usd || '1.00'}
                    onChange={(e) => setConfig({ ...config, aporte_usd: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Geometría / Perspectiva del Sello Oficial
                  </label>
                  <p className="text-xs text-slate-400 mb-2">
                    Selecciona si el sello físico del Consejo Comunal es rectangular, redondo, cuadrado u ovalado.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'rectangular', label: 'Rectangular' },
                      { id: 'redondo', label: 'Redondo' },
                      { id: 'cuadrado', label: 'Cuadrado' },
                      { id: 'ovalado', label: 'Ovalado' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelloForma(item.id);
                          setConfig((prev) => ({ ...prev, sello_forma: item.id }));
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          selloForma === item.id
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 text-sm font-semibold mb-1">
                      {selloForma === 'redondo'
                        ? 'Diámetro (mm)'
                        : selloForma === 'cuadrado'
                        ? 'Lado Simétrico (mm)'
                        : 'Ancho (mm)'}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="20"
                        max="80"
                        value={selloAnchoMm}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 20;
                          setSelloAnchoMm(val);
                          if (selloForma === 'redondo' || selloForma === 'cuadrado') {
                            setSelloAltoMm(val);
                          }
                          setConfig((prev) => ({
                            ...prev,
                            sello_ancho_mm: String(val),
                            sello_tamano_mm: String(val),
                            ...(selloForma === 'redondo' || selloForma === 'cuadrado'
                              ? { sello_alto_mm: String(val) }
                              : {}),
                          }));
                        }}
                        className="w-28 px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white font-mono text-sm"
                      />
                      <span className="text-slate-400 text-xs font-mono">mm</span>
                    </div>
                  </div>

                  {selloForma !== 'redondo' && selloForma !== 'cuadrado' && (
                    <div>
                      <label className="block text-slate-300 text-sm font-semibold mb-1">
                        Alto (mm)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="15"
                          max="60"
                          value={selloAltoMm}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 15;
                            setSelloAltoMm(val);
                            setConfig((prev) => ({ ...prev, sello_alto_mm: String(val) }));
                          }}
                          className="w-28 px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white font-mono text-sm"
                        />
                        <span className="text-slate-400 text-xs font-mono">mm</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={async () => {
                  const updatedConfig = {
                    ...config,
                    sello_forma: selloForma,
                    sello_ancho_mm: String(selloAnchoMm),
                    sello_alto_mm: String(selloAltoMm),
                    sello_tamano_mm: String(selloAnchoMm),
                  };
                  const res = await fetch('/api/configuracion', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ settings: updatedConfig }),
                  });
                  if (res.ok) {
                    setConfig(updatedConfig);
                    try {
                      window.dispatchEvent(new CustomEvent('config_updated', { detail: updatedConfig }));
                    } catch (e) {}
                    toast.success('Configuraciones guardadas');
                  } else {
                    toast.error('Error guardando configuraciones');
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow"
              >
                Guardar Parámetros
              </button>
            </div>

            {/* SECCIÓN: VALORES Y GRATUIDAD POR TIPO DE DOCUMENTO */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-amber-600/20 text-amber-400">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Tarifas y Gratuidad por Documento Oficial</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {plantillas.length} Documentos
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Establece el valor en dólares ($ USD) por trámite o márcalo como <strong>100% Gratuito</strong> para eximir de pago y pasarela bancaria.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {plantillas.map((p) => {
                  const cfgActual = docCostos[p.id] || { gratuito: false, monto_usd: 1.0 };
                  const esGratuito = Boolean(cfgActual.gratuito);
                  const monto = cfgActual.monto_usd !== undefined ? cfgActual.monto_usd : 1.0;

                  return (
                    <div
                      key={p.id}
                      className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-750 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl border ${
                          esGratuito
                            ? 'bg-emerald-550/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-blue-600/10 border-blue-500/30 text-blue-400'
                        }`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-white">{p.titulo}</h4>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                              {p.id}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {esGratuito ? (
                              <span className="text-emerald-400 font-semibold">Exonerado de aporte solidario (Trámite Gratuito)</span>
                            ) : (
                              <span className="text-slate-300 font-medium">Aporte sugerido: <strong className="text-amber-400 font-mono">${Number(monto).toFixed(2)} USD</strong></span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <label className="flex items-center gap-2 cursor-pointer select-none px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
                          <input
                            type="checkbox"
                            checked={esGratuito}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const updated = {
                                ...docCostos,
                                [p.id]: {
                                  gratuito: checked,
                                  monto_usd: checked ? 0 : (monto > 0 ? monto : 1.0),
                                },
                              };
                              setDocCostos(updated);
                            }}
                            className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-950 w-4 h-4"
                          />
                          <span className={`text-xs font-bold ${esGratuito ? 'text-emerald-400' : 'text-slate-400'}`}>
                            Gratuito
                          </span>
                        </label>

                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 text-xs font-mono font-bold">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            disabled={esGratuito}
                            value={esGratuito ? '0.00' : monto}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const updated = {
                                ...docCostos,
                                [p.id]: {
                                  gratuito: false,
                                  monto_usd: val,
                                },
                              };
                              setDocCostos(updated);
                            }}
                            className={`w-24 px-3 py-1.5 rounded-xl bg-slate-950 border text-white font-mono text-xs focus:outline-none transition ${
                              esGratuito
                                ? 'opacity-40 cursor-not-allowed border-slate-800 text-slate-500'
                                : 'border-slate-750 focus:border-amber-500 text-amber-300 font-bold'
                            }`}
                          />
                          <span className="text-slate-400 text-[10px] font-mono">USD</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => guardarCostosDocumentos(docCostos)}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition shadow-lg shadow-amber-600/30 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Tarifas de Documentos</span>
                </button>
              </div>
            </div>

            {/* SECCIÓN: PRESETS OFICIALES (LOGOS E IMÁGENES DEL SISTEMA & MODELADOR) */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-blue-600/20 text-blue-400">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Presets Oficiales de Imágenes y Logos</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {presetsImagenes.length} Registrados
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Catálogo centralizado de logos, escudos y sellos vinculados automáticamente al <strong>Modelador SVG</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={abrirModalCrearPreset}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuevo Preset</span>
                </button>
              </div>

              {loadingPresets ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-400" />
                  <span>Cargando catálogo de presets...</span>
                </div>
              ) : presetsImagenes.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-950/60 rounded-2xl border border-slate-800">
                  No hay presets registrados en la base de datos.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {presetsImagenes.map((preset) => (
                    <div
                      key={preset.id}
                      className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-blue-500/30 transition flex flex-col justify-between group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-750 flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
                          <img
                            src={preset.url}
                            alt={preset.name}
                            className="w-full h-full object-contain"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-white truncate" title={preset.name}>
                            {preset.name}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            Dim: {preset.defaultW}x{preset.defaultH} px
                          </span>
                          <span className="inline-block mt-1 text-[9px] font-semibold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {preset.lockRatio ? 'Proporción 1:1' : 'Libre'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-3 mt-3 border-t border-slate-850">
                        <button
                          type="button"
                          onClick={() => abrirModalEditarPreset(preset)}
                          className="flex-1 py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-850 text-blue-400 text-[11px] font-semibold border border-slate-800 transition flex items-center justify-center gap-1"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminarPresetOficial(preset)}
                          className="py-1.5 px-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-semibold border border-rose-500/20 transition flex items-center justify-center"
                          title="Eliminar preset"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECCIÓN: CATÁLOGOS OFICIALES Y SISTEMA DE SELECCIONES (PARENTESCO, INSTRUCCIÓN, SALUD) */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-400">
                    <ListPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Catálogos Oficiales y Sistema de Selecciones</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        {catalogos.parentesco.length + catalogos.instruccion.length + catalogos.salud.length} Ítems Activos
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Configura los literales y descripciones de <strong>Parentesco</strong>, <strong>Nivel de Instrucción</strong> y <strong>Condición de Salud</strong> para el Censo y Carga Masiva (CSV).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => abrirModalCrearCatalogo('parentesco')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Parentesco</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => abrirModalCrearCatalogo('instruccion')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Instrucción</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => abrirModalCrearCatalogo('salud')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition shadow shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Salud</span>
                  </button>
                </div>
              </div>

              {loadingCatalogos ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                  <span>Cargando catálogos del sistema...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Columna 1: Parentesco */}
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Parentesco</h4>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {catalogos.parentesco.length} opciones
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                      {catalogos.parentesco.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-900/90 border border-slate-800/80 hover:border-blue-500/30 transition text-xs group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-400 font-mono font-bold flex items-center justify-center text-xs shrink-0 border border-blue-500/20">
                              {item.codigo}
                            </span>
                            <span className="text-slate-200 font-medium truncate">{item.descripcion}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => abrirModalEditarCatalogo(item)}
                              className="p-1 rounded-md text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
                              title="Editar opción"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => eliminarCatalogoItem(item)}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                              title="Eliminar opción"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Columna 2: Nivel Instrucción */}
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Nivel Instrucción</h4>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {catalogos.instruccion.length} opciones
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                      {catalogos.instruccion.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-900/90 border border-slate-800/80 hover:border-emerald-500/30 transition text-xs group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono font-bold flex items-center justify-center text-xs shrink-0 border border-emerald-500/20">
                              {item.codigo}
                            </span>
                            <span className="text-slate-200 font-medium truncate">{item.descripcion}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => abrirModalEditarCatalogo(item)}
                              className="p-1 rounded-md text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
                              title="Editar opción"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => eliminarCatalogoItem(item)}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                              title="Eliminar opción"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Columna 3: Condición Salud */}
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Condición Salud</h4>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {catalogos.salud.length} opciones
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                      {catalogos.salud.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-900/90 border border-slate-800/80 hover:border-amber-500/30 transition text-xs group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 font-mono font-bold flex items-center justify-center text-xs shrink-0 border border-amber-500/20">
                              {item.codigo}
                            </span>
                            <span className="text-slate-200 font-medium truncate">{item.descripcion}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => abrirModalEditarCatalogo(item)}
                              className="p-1 rounded-md text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                              title="Editar opción"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => eliminarCatalogoItem(item)}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                              title="Eliminar opción"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ZONA DE PELIGRO / PASE A PRODUCCIÓN */}
            <div className="p-6 rounded-3xl bg-red-950/20 border border-red-500/30 space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-red-500/10 rounded-xl text-red-400 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Zona Crítica: Limpieza y Pase a Producción</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-red-500/20 text-red-400 border border-red-500/30">
                      Super Admin
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Si ya terminaste de probar el sistema y vas a iniciar la recolección oficial y real del censo y constancias, utiliza esta herramienta para <strong className="text-red-300">purgar todos los registros de prueba</strong>. 
                    El correlativo de planillas volverá a iniciar limpiamente en <span className="font-mono text-white bg-slate-900 px-1.5 py-0.5 rounded border border-slate-750">PLC-0001</span>.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-red-500/20 text-xs">
                <span className="text-slate-400">
                  Las cuentas de voceros, configuraciones y firmas oficiales <strong className="text-emerald-400 font-semibold">permanecerán intactas</strong>.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setResetConfirmText('');
                    setResetCheckVecinos(true);
                    setResetCheckCenso(true);
                    setResetCheckDocs(true);
                    setResetCheckAudit(true);
                    setModalResetProd(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition shadow-lg shadow-red-600/30 flex items-center gap-1.5 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Limpiar Datos y Pasar a Producción</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Modal para Crear / Editar Preset Oficial de Imagen */}
      {modalPreset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => { setModalPreset(false); setPresetEditando(null); }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {presetEditando?.id ? 'Editar Preset Oficial' : 'Nuevo Preset de Imagen'}
                </h3>
                <p className="text-xs text-slate-400">Disponible inmediatamente en el Modelador SVG</p>
              </div>
            </div>

            <form onSubmit={guardarPresetOficial} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre Descriptivo *</label>
                <input
                  type="text"
                  required
                  value={presetForm.nombre}
                  onChange={(e) => setPresetForm({ ...presetForm, nombre: e.target.value })}
                  placeholder="Ej: Sello de Finanzas, Logo Alcaldía, etc."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">URL de la Imagen o Logo *</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    required
                    value={presetForm.url}
                    onChange={(e) => setPresetForm({ ...presetForm, url: e.target.value })}
                    placeholder="https://... o /img/..."
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white font-mono text-[11px] focus:outline-none focus:border-blue-500"
                  />
                  <input
                    ref={presetFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setSubiendoImagenPreset(true);
                      const urlSubida = await subirArchivoAStorage(file, 'presets', presetForm.nombre || 'preset_oficial');
                      if (urlSubida) {
                        setPresetForm((prev) => ({
                          ...prev,
                          url: urlSubida,
                          nombre: prev.nombre || file.name.replace(/\.[^/.]+$/, ''),
                        }));
                      }
                      setSubiendoImagenPreset(false);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={subiendoImagenPreset}
                    onClick={() => presetFileInputRef.current?.click()}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold flex items-center gap-1.5 shrink-0 transition"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                    <span>{subiendoImagenPreset ? 'Subiendo...' : 'Subir'}</span>
                  </button>
                </div>
              </div>

              {/* Vista previa de imagen */}
              {presetForm.url && (
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-750 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      src={presetForm.url}
                      alt="Vista previa"
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-400 overflow-hidden">
                    <span className="font-bold text-white block">Vista previa activa</span>
                    <span className="truncate block font-mono text-[10px] text-slate-500">{presetForm.url}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Ancho por defecto (px)</label>
                  <input
                    type="number"
                    min="20"
                    max="400"
                    value={presetForm.ancho}
                    onChange={(e) => setPresetForm({ ...presetForm, ancho: parseInt(e.target.value, 10) || 60 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Alto por defecto (px)</label>
                  <input
                    type="number"
                    min="20"
                    max="400"
                    value={presetForm.alto}
                    onChange={(e) => setPresetForm({ ...presetForm, alto: parseInt(e.target.value, 10) || 60 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chkBloquearProporcion"
                  checked={presetForm.bloquear_proporcion}
                  onChange={(e) => setPresetForm({ ...presetForm, bloquear_proporcion: e.target.checked })}
                  className="rounded border-slate-750 bg-slate-950 text-blue-600 focus:ring-0"
                />
                <label htmlFor="chkBloquearProporcion" className="text-slate-300 cursor-pointer select-none">
                  Bloquear proporción de aspecto al redimensionar (simétrico 1:1)
                </label>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setModalPreset(false); setPresetEditando(null); }}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{presetEditando?.id ? 'Actualizar Preset' : 'Guardar Preset'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Crear / Editar Ítem de Catálogo Oficial */}
      {modalCatalogo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => { setModalCatalogo(false); setCatalogoEditando(null); }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                <ListPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {catalogoEditando ? 'Editar Opción de Selección' : 'Nueva Opción de Selección'}
                </h3>
                <p className="text-xs text-slate-400">
                  Catálogo: <strong className="text-indigo-400 uppercase">{catalogoForm.tipo}</strong>
                </p>
              </div>
            </div>

            <form onSubmit={guardarCatalogoItem} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Catálogo Destino *</label>
                <select
                  disabled={Boolean(catalogoEditando)}
                  value={catalogoForm.tipo}
                  onChange={(e) => setCatalogoForm({ ...catalogoForm, tipo: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white font-medium focus:outline-none focus:border-indigo-500 disabled:opacity-70"
                >
                  <option value="parentesco">Parentesco (con Jefe de Hogar)</option>
                  <option value="instruccion">Nivel de Instrucción Educativa</option>
                  <option value="salud">Condición de Salud</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-slate-300 font-semibold mb-1">Literal / Código *</label>
                  <input
                    type="text"
                    required
                    maxLength={3}
                    value={catalogoForm.codigo}
                    onChange={(e) => setCatalogoForm({ ...catalogoForm, codigo: e.target.value.toLowerCase() })}
                    placeholder="Ej: g"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white font-mono text-center text-sm font-bold focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Letra para CSV</span>
                </div>

                <div className="col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Descripción Completa *</label>
                  <input
                    type="text"
                    required
                    value={catalogoForm.descripcion}
                    onChange={(e) => setCatalogoForm({ ...catalogoForm, descripcion: e.target.value })}
                    placeholder="Ej: Sobrino(a), Diplomado..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Texto mostrado en el sistema</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Orden de Presentación</label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={catalogoForm.orden}
                  onChange={(e) => setCatalogoForm({ ...catalogoForm, orden: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setModalCatalogo(false); setCatalogoEditando(null); }}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{catalogoEditando ? 'Actualizar Opción' : 'Guardar Opción'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Crear Nueva Plantilla Documental */}
      {modalNuevaPlantilla && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setModalNuevaPlantilla(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Nueva Plantilla Documental</h3>
                <p className="text-xs text-slate-400">
                  Crea una nueva constancia o documento oficial para el modelador SVG y trámites
                </p>
              </div>
            </div>

            <form onSubmit={crearNuevaPlantilla} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Identificador Único (Código del Documento) *
                </label>
                <input
                  type="text"
                  required
                  value={nuevaPlantillaForm.id}
                  onChange={(e) => setNuevaPlantillaForm({ ...nuevaPlantillaForm, id: e.target.value.toUpperCase() })}
                  placeholder="Ej: CARTA_AVAL, AVAL_COMUNAL, TRABAJO"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white font-mono uppercase focus:outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Sin espacios ni caracteres especiales. Solo letras y guiones bajos.
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Título Oficial del Documento *</label>
                <input
                  type="text"
                  required
                  value={nuevaPlantillaForm.titulo}
                  onChange={(e) => setNuevaPlantillaForm({ ...nuevaPlantillaForm, titulo: e.target.value })}
                  placeholder="Ej: Carta Comunal de Aval Ciudadano"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Subtítulo / Referencia</label>
                <input
                  type="text"
                  value={nuevaPlantillaForm.subtitulo}
                  onChange={(e) => setNuevaPlantillaForm({ ...nuevaPlantillaForm, subtitulo: e.target.value })}
                  placeholder="Ej: NRO: {codigo_qr} / AVAL COMUNITARIO"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white font-mono focus:outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Puedes incluir etiquetas dinámicas como <code>{'{codigo_qr}'}</code>
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Cuerpo / Redacción Legal Inicial</label>
                <textarea
                  rows={4}
                  value={nuevaPlantillaForm.cuerpo_template}
                  onChange={(e) => setNuevaPlantillaForm({ ...nuevaPlantillaForm, cuerpo_template: e.target.value })}
                  placeholder="Quien suscribe, Vocería Ejecutiva del Consejo Comunal... hace constar que el ciudadano(a) {nombre_completo}, C.I. {cedula}..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white font-mono text-[11px] focus:outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Variables admitidas: <code>{'{nombre_completo}'}</code>, <code>{'{cedula}'}</code>, <code>{'{vereda}'}</code>, <code>{'{casa}'}</code>, <code>{'{fecha_emision}'}</code>
                </span>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalNuevaPlantilla(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear Plantilla</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Importación Masiva CSV con Previsualización */}
      {modalImportarCsv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => { setModalImportarCsv(false); setCsvPreviewData(null); }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Carga Masiva de Vecinos y Censo (CSV)</h3>
            <p className="text-xs text-slate-400 mb-3">
              Importa vecinos y grupos familiares de forma masiva según la estructura oficial de 15 columnas.
            </p>

            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={descargarPlantillaCsv}
                className="px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-xs font-bold text-blue-400 border border-blue-500/30 flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar Plantilla CSV Oficial (15 Columnas)</span>
              </button>
            </div>

            {/* Leyenda visible con Guía de Códigos en pantalla */}
            <div className="mb-4 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
              <span className="font-bold text-slate-200 block text-xs">
                Guía de códigos admitidos para llenado rápido (letra única):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <div>
                  <strong className="text-blue-400">Parentesco:</strong>
                  <ul className="pl-1 text-[10px] space-y-0.5 mt-0.5">
                    {catalogos.parentesco.map(item => (
                      <li key={item.id}><span className="font-mono text-white font-bold">{item.codigo}</span> = {item.descripcion}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong className="text-emerald-400">Nivel Instrucción:</strong>
                  <ul className="pl-1 text-[10px] space-y-0.5 mt-0.5">
                    {catalogos.instruccion.map(item => (
                      <li key={item.id}><span className="font-mono text-white font-bold">{item.codigo}</span> = {item.descripcion}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong className="text-amber-400">Condición Salud:</strong>
                  <ul className="pl-1 text-[10px] space-y-0.5 mt-0.5">
                    {catalogos.salud.map(item => (
                      <li key={item.id}><span className="font-mono text-white font-bold">{item.codigo}</span> = {item.descripcion}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async (evt) => {
                  const text = evt.target.result;
                  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#'));
                  // Omitir cabecera (primera fila)
                  const dataLines = lines.slice(1);
                  const rows = dataLines.map(line => {
                    const cols = line.split(',');
                    return cols.map(c => c.trim().replace(/^"|"$/g, ''));
                  });

                  // Previsualización interactiva
                  const res = await fetch('/api/vecinos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'import_csv',
                      previewOnly: true,
                      rows,
                    })
                  });
                  const pData = await res.json();
                  setCsvPreviewData({ ...pData, rawRows: rows });
                };
                reader.readAsText(file);
              }}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 mb-4"
            />

            {csvPreviewData && (
              <div className="space-y-4">
                {/* Resumen con Badges de Estado */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Leídos</span>
                    <span className="text-xl font-black text-white">{csvPreviewData.totalFilasRecibidas || 0}</span>
                    <span className="text-[10px] text-slate-500">Filas en archivo</span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col">
                    <span className="text-[10px] text-emerald-400 font-semibold uppercase">Nuevos a Ingresar</span>
                    <span className="text-xl font-black text-emerald-400">{csvPreviewData.totalNuevos || 0}</span>
                    <span className="text-[10px] text-emerald-300/80">Serán procesados</span>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col">
                    <span className="text-[10px] text-amber-400 font-semibold uppercase">Ya Registrados</span>
                    <span className="text-xl font-black text-amber-400">{csvPreviewData.totalExistentes || 0}</span>
                    <span className="text-[10px] text-amber-300/80">Se omitirán (duplicados)</span>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col">
                    <span className="text-[10px] text-rose-400 font-semibold uppercase">Errores de Formato</span>
                    <span className="text-xl font-black text-rose-400">{csvPreviewData.totalErrores || 0}</span>
                    <span className="text-[10px] text-rose-300/80">Inconsistencias</span>
                  </div>
                </div>

                {/* Notificación si hay cédulas existentes */}
                {csvPreviewData.duplicados?.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-400">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{csvPreviewData.duplicados.length} vecinos ya existen en el sistema y no serán procesados:</span>
                    </div>
                    <div className="max-h-28 overflow-y-auto space-y-1 pl-6 text-[11px]">
                      {csvPreviewData.duplicados.map((dup, idx) => (
                        <div key={idx} className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono font-bold text-white bg-slate-900 px-1.5 py-0.5 rounded border border-amber-500/30">
                            {dup.cedula}
                          </span>
                          <span className="text-slate-200">{dup.nombres}</span>
                          <span className="text-slate-400">({dup.ubicacion})</span>
                          <span className="text-amber-400/90 italic">— {dup.motivo}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notificación si hay errores de sintaxis o casa inválida */}
                {csvPreviewData.errores?.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-rose-400">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{csvPreviewData.errores.length} inconsistencias detectadas (serán omitidas):</span>
                    </div>
                    <ul className="list-disc pl-6 space-y-1 text-[11px] max-h-28 overflow-y-auto">
                      {csvPreviewData.errores.map((err, idx) => (
                        <li key={idx}>
                          Fila {err.fila} {err.cedula ? `[${err.cedula}]` : ''}: {err.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tabla de Previsualización de Datos Homogeneizada */}
                {csvPreviewData.muestras && csvPreviewData.muestras.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-300">
                        Previsualización de Datos ({Math.min(csvPreviewData.muestras.length, 100)} registros analizados):
                      </span>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Nuevo
                        </span>
                        <span className="inline-flex items-center gap-1 text-amber-400">
                          <span className="w-2 h-2 rounded-full bg-amber-400"></span> Ya Existe (Omitir)
                        </span>
                      </div>
                    </div>
                    <div className="border border-slate-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto overflow-x-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0 whitespace-nowrap">
                          <tr>
                            <th className="px-3 py-2">Estado</th>
                            <th className="px-3 py-2">Fam.</th>
                            <th className="px-3 py-2">Cédula</th>
                            <th className="px-3 py-2">Nombres y Apellidos</th>
                            <th className="px-3 py-2">Ubicación (Vereda/Casa)</th>
                            <th className="px-3 py-2">Sexo</th>
                            <th className="px-3 py-2">Parentesco</th>
                            <th className="px-3 py-2">Nivel Instrucción</th>
                            <th className="px-3 py-2">Ocupación</th>
                            <th className="px-3 py-2">Salud</th>
                            <th className="px-3 py-2">Teléfono / Contacto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 whitespace-nowrap">
                          {csvPreviewData.muestras.map((m, idx) => (
                            <tr key={idx} className={m.yaExiste ? "bg-amber-500/5 hover:bg-amber-500/10" : "hover:bg-slate-800/40"}>
                              <td className="px-3 py-2 font-bold">
                                {m.yaExiste ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                    Ya Existe
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    Nuevo
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 font-mono text-blue-400 font-bold">{m.numero_familia || 1}</td>
                              <td className="px-3 py-2 font-mono font-bold text-white">{m.cedula}</td>
                              <td className="px-3 py-2 font-medium text-slate-200">{m.nombres} {m.apellidos}</td>
                              <td className="px-3 py-2 text-slate-300">Vereda {m.vereda}, {m.casa}</td>
                              <td className="px-3 py-2 text-slate-400">{m.sexo || 'M'}</td>
                              <td className="px-3 py-2 text-blue-300 font-medium">{m.parentesco}</td>
                              <td className="px-3 py-2 text-emerald-300">{m.instruccion}</td>
                              <td className="px-3 py-2 text-slate-300">{m.profesion_ocupacion || '—'}</td>
                              <td className="px-3 py-2 text-amber-300">{m.salud}</td>
                              <td className="px-3 py-2 text-slate-400">{m.telefono || m.email || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setCsvPreviewData(null)}
                    className="w-full sm:w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs transition"
                  >
                    Cancelar / Reintentar
                  </button>
                  <button
                    onClick={async () => {
                      if ((csvPreviewData.totalNuevos || 0) === 0) {
                        toast.error('No hay vecinos nuevos para procesar en este archivo.');
                        return;
                      }
                      try {
                        const res = await fetch('/api/vecinos', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            action: 'import_csv',
                            previewOnly: false,
                            rows: csvPreviewData.rawRows,
                            autoApprove: true,
                          })
                        });
                        const resData = await res.json();
                        if (res.ok) {
                          toast.success(resData.message || 'Importación completada con éxito');
                          setModalImportarCsv(false);
                          setCsvPreviewData(null);
                          cargarVecinos();
                          cargarEstadisticas();
                        } else {
                          toast.error(resData.error || 'Error al procesar la importación');
                        }
                      } catch (e) {
                        toast.error('Error de red al importar');
                      }
                    }}
                    disabled={(csvPreviewData.totalNuevos || 0) === 0}
                    className="w-full sm:w-2/3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {(csvPreviewData.totalNuevos || 0) > 0 
                        ? `Confirmar y Procesar ${csvPreviewData.totalNuevos} Vecinos Nuevos`
                        : 'Sin Vecinos Nuevos por Procesar'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Ficha Censo Familiar Fiel al Instrumento Oficial */}
      {modalCenso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl relative my-6 max-h-[94vh] overflow-y-auto">
            <button
              onClick={() => { setModalCenso(false); setPlanillaActiva(null); }}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabecera del Instrumento Oficial */}
            <div className="border-b border-slate-800 pb-4 mb-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
                  Consejo Comunal Las Llaves • RIF: C299916862
                </span>
                <span className="text-xs text-slate-400">
                  Puerto Cabello, Carabobo
                </span>
              </div>
              <h2 className="text-xl font-black text-white">
                {planillaActiva?.planilla?.id ? `Editar Planilla N° ${planillaActiva.planilla.numero_planilla}` : 'Instrumento de Censo Sociodemográfico y Familiar'}
              </h2>
              <p className="text-xs text-slate-400">
                1 Planilla física por Vivienda • Permite registrar múltiples familias y hasta 15 integrantes por casa
              </p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                
                // Recopilar habitantes desde el formulario
                const totalHab = Math.max(1, (planillaActiva?.habitantes?.length || 1));
                const habList = [];
                for (let i = 0; i < totalHab; i++) {
                  const nroFam = formData.get(`hab_${i}_fam`) || '1';
                  const nom = formData.get(`hab_${i}_nombre`);
                  if (!nom || !nom.trim()) continue;

                  habList.push({
                    numero_familia: Number(nroFam) || 1,
                    nombres_apellidos: nom.trim(),
                    cedula: (formData.get(`hab_${i}_cedula`) || '').trim(),
                    sexo: formData.get(`hab_${i}_sexo`) || 'M',
                    fecha_nacimiento: (formData.get(`hab_${i}_fecha_nac`) || '').trim(),
                    parentesco: formData.get(`hab_${i}_parentesco`) || 'a',
                    instruccion: formData.get(`hab_${i}_instruccion`) || 'c',
                    profesion_ocupacion: (formData.get(`hab_${i}_ocupacion`) || '').trim(),
                    salud: formData.get(`hab_${i}_salud`) || 'e',
                    telefono_movil: (formData.get(`hab_${i}_telefono`) || '').trim(),
                  });
                }

                const payload = {
                  numero_planilla: (formData.get('numero_planilla') || '').trim(),
                  fecha: formData.get('fecha') || new Date().toISOString().split('T')[0],
                  empadronador_nombre: (formData.get('empadronador_nombre') || user?.nombre || '').trim(),
                  calle_vereda_av: formData.get('calle_vereda_av'),
                  numero_casa: (formData.get('numero_casa') || '').trim().toUpperCase(),
                  telefono_contacto: (formData.get('telefono_contacto') || '').trim(),
                  tenencia_vivienda: formData.get('tenencia_vivienda') || 'Propia',
                  tiempo_residencia_desde: (formData.get('tiempo_residencia_desde') || '').trim(),
                  total_familias: Number(formData.get('total_familias')) || 1,
                  total_habitantes: habList.length > 0 ? habList.length : (Number(formData.get('total_habitantes')) || 1),
                  observaciones: (formData.get('observaciones') || '').trim(),
                  habitantes: habList,
                };

                try {
                  const res = await fetch('/api/censo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                  });
                  const d = await res.json();
                  if (res.ok) {
                    toast.success(d.message || 'Planilla de censo y habitantes guardados correctamente');
                    setModalCenso(false);
                    setPlanillaActiva(null);
                    cargarCenso();
                    cargarVecinos();
                    cargarEstadisticas();
                  } else {
                    toast.error(d.error || 'Error al guardar la planilla');
                  }
                } catch (err) {
                  toast.error('Error de conexión al guardar el censo');
                }
              }}
              className="space-y-6 text-xs"
            >
              {/* ENCABEZADO: Planilla N°, Fecha, Empadronador */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Planilla N° *</label>
                  <input
                    type="text"
                    name="numero_planilla"
                    required
                    defaultValue={planillaActiva?.planilla?.numero_planilla || ''}
                    placeholder="Ej: PLC-0001"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white font-mono font-bold tracking-wide focus:border-blue-500 outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Identificador correlativo único</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Fecha de Aplicación *</label>
                  <input
                    type="date"
                    name="fecha"
                    required
                    defaultValue={planillaActiva?.planilla?.fecha || new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Empadronador / Censador *</label>
                  <input
                    type="text"
                    name="empadronador_nombre"
                    required
                    defaultValue={planillaActiva?.planilla?.empadronador_nombre || user?.nombre || ''}
                    placeholder="Nombre del vocero censista"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* SECCIÓN I: UBICACIÓN Y TENENCIA DE LA VIVIENDA */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800 pb-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center text-xs">I</span>
                  <span>SECCIÓN I: UBICACIÓN Y TENENCIA DE LA VIVIENDA</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Calle / Vereda / Av *</label>
                    <select
                      name="calle_vereda_av"
                      defaultValue={planillaActiva?.planilla?.calle_vereda_av || 'A'}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white font-semibold focus:border-blue-500 outline-none"
                    >
                      {VEREDAS.map(v => <option key={v} value={v}>Vereda {v}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">N° Casa *</label>
                    <input
                      type="text"
                      name="numero_casa"
                      required
                      defaultValue={planillaActiva?.planilla?.numero_casa || ''}
                      placeholder="Ej: A-8"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white uppercase font-bold focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Teléfono Principal de Contacto</label>
                    <input
                      type="text"
                      name="telefono_contacto"
                      defaultValue={planillaActiva?.planilla?.telefono_contacto || ''}
                      placeholder="0414-1234567"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Tenencia de Vivienda</label>
                    <select
                      name="tenencia_vivienda"
                      defaultValue={planillaActiva?.planilla?.tenencia_vivienda || 'Propia'}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white focus:border-blue-500 outline-none"
                    >
                      <option value="Propia">Propia</option>
                      <option value="Alquilada">Alquilada</option>
                      <option value="En Cuido">En Cuido</option>
                      <option value="Familia Adjunta / Agregada">Familia Adjunta / Agregada</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Tiempo de Residencia</label>
                    <input
                      type="text"
                      name="tiempo_residencia_desde"
                      defaultValue={planillaActiva?.planilla?.tiempo_residencia_desde || ''}
                      placeholder="Ej: 12 años (Desde 2014)"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Total Familias en Vivienda</label>
                    <input
                      type="number"
                      name="total_familias"
                      min="1"
                      max="10"
                      defaultValue={planillaActiva?.planilla?.total_familias || 1}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white font-bold focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Total Habitantes en Vivienda</label>
                    <input
                      type="number"
                      name="total_habitantes"
                      min="1"
                      max="20"
                      defaultValue={planillaActiva?.planilla?.total_habitantes || (planillaActiva?.habitantes?.length || 1)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white font-bold focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN II: REGISTRO SOCIODEMOGRÁFICO POR HABITANTE */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <span className="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center text-xs">II</span>
                    <span>SECCIÓN II: REGISTRO SOCIODEMOGRÁFICO POR HABITANTE (HASTA 15)</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const actuales = planillaActiva?.habitantes || [{ numero_familia: 1, nombres_apellidos: '', sexo: 'M' }];
                        if (actuales.length >= 15) {
                          toast.error('Capacidad máxima por planilla alcanzada (15 habitantes)');
                          return;
                        }
                        const nuevoHab = {
                          numero_familia: actuales[actuales.length - 1]?.numero_familia || 1,
                          nombres_apellidos: '',
                          cedula: '',
                          sexo: 'M',
                          fecha_nacimiento: '',
                          parentesco: 'c',
                          instruccion: 'c',
                          profesion_ocupacion: '',
                          salud: 'e',
                          telefono_movil: ''
                        };
                        setPlanillaActiva({
                          ...planillaActiva,
                          habitantes: [...actuales, nuevoHab]
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Habitante</span>
                    </button>
                  </div>
                </div>

                {/* Leyenda de Referencia Rápida Dinámica según Catálogos del Sistema */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <strong className="text-blue-400 block mb-0.5">Parentesco:</strong>
                    <div className="text-slate-300 leading-relaxed">
                      {catalogos?.parentesco && catalogos.parentesco.length > 0
                        ? catalogos.parentesco.map(item => `${item.codigo}-${item.descripcion}`).join(', ')
                        : 'a-Jefe(a), b-Cónyuge, c-Hijo(a), d-Madre/Padre, e-Abuelo(a), f-Tíos/Tías'}
                    </div>
                  </div>
                  <div>
                    <strong className="text-emerald-400 block mb-0.5">Instrucción:</strong>
                    <div className="text-slate-300 leading-relaxed">
                      {catalogos?.instruccion && catalogos.instruccion.length > 0
                        ? catalogos.instruccion.map(item => `${item.codigo}-${item.descripcion}`).join(', ')
                        : 'a-Ninguno, b-Primaria, c-Secundaria, d-TSU, e-Universitario, f-Postgrado'}
                    </div>
                  </div>
                  <div>
                    <strong className="text-amber-400 block mb-0.5">Salud:</strong>
                    <div className="text-slate-300 leading-relaxed">
                      {catalogos?.salud && catalogos.salud.length > 0
                        ? catalogos.salud.map(item => `${item.codigo}-${item.descripcion}`).join(', ')
                        : 'a-Discapacidad, b-En cama, c-Crónica, d-Silla de Ruedas, e-Ninguna'}
                    </div>
                  </div>
                </div>

                {/* Lista / Tabla de Habitantes Responsive */}
                <div className="space-y-3">
                  {(planillaActiva?.habitantes && planillaActiva.habitantes.length > 0
                    ? planillaActiva.habitantes
                    : [{ numero_familia: 1, nombres_apellidos: '', sexo: 'M', parentesco: 'a', instruccion: 'c', salud: 'e' }]
                  ).map((hab, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 transition space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-mono font-black text-xs">
                            #{idx + 1}
                          </span>
                          <span>Habitante N° {idx + 1}</span>
                        </div>

                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const lista = [...(planillaActiva.habitantes || [])];
                              lista.splice(idx, 1);
                              setPlanillaActiva({ ...planillaActiva, habitantes: lista });
                            }}
                            className="text-rose-400 hover:text-rose-300 text-[11px] font-semibold flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Quitar</span>
                          </button>
                        )}
                      </div>

                      {/* Campos del habitante */}
                      <div className="grid grid-cols-2 sm:grid-cols-6 lg:grid-cols-12 gap-2 text-xs">
                        {/* Fam N° */}
                        <div className="col-span-1 sm:col-span-1 lg:col-span-1">
                          <label className="block text-[10px] text-slate-400 mb-0.5">Fam N°</label>
                          <input
                            type="number"
                            name={`hab_${idx}_fam`}
                            min="1"
                            max="9"
                            defaultValue={hab.numero_familia || 1}
                            className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-center font-bold"
                          />
                        </div>

                        {/* Nombres y Apellidos */}
                        <div className="col-span-2 sm:col-span-3 lg:col-span-3">
                          <label className="block text-[10px] text-slate-400 mb-0.5">Nombres y Apellidos *</label>
                          <input
                            type="text"
                            name={`hab_${idx}_nombre`}
                            defaultValue={hab.nombres_apellidos || ''}
                            placeholder="Nombre completo"
                            required={idx === 0}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white uppercase font-semibold"
                          />
                        </div>

                        {/* Cédula */}
                        <div className="col-span-1 sm:col-span-2 lg:col-span-2">
                          <label className="block text-[10px] text-slate-400 mb-0.5">Cédula</label>
                          <input
                            type="text"
                            name={`hab_${idx}_cedula`}
                            defaultValue={hab.cedula || ''}
                            placeholder="V-12345678"
                            className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
                          />
                        </div>

                        {/* Sexo */}
                        <div className="col-span-1 sm:col-span-1 lg:col-span-1">
                          <label className="block text-[10px] text-slate-400 mb-0.5">Sexo</label>
                          <select
                            name={`hab_${idx}_sexo`}
                            defaultValue={hab.sexo || 'M'}
                            className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-center font-bold"
                          >
                            <option value="M">M</option>
                            <option value="F">F</option>
                          </select>
                        </div>

                        {/* Fecha Nac */}
                        <div className="col-span-1 sm:col-span-2 lg:col-span-2">
                          <label className="block text-[10px] text-slate-400 mb-0.5">Fecha Nac.</label>
                          <input
                            type="text"
                            name={`hab_${idx}_fecha_nac`}
                            defaultValue={hab.fecha_nacimiento || ''}
                            placeholder="DD/MM/AAAA"
                            className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
                          />
                        </div>

                        {/* Parentesco */}
                        <div className="col-span-1 sm:col-span-2 lg:col-span-2">
                          <label className="block text-[10px] text-slate-400 mb-0.5">Parentesco</label>
                          <select
                            name={`hab_${idx}_parentesco`}
                            defaultValue={hab.parentesco || (idx === 0 ? 'a' : 'c')}
                            className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-[11px]"
                          >
                            {catalogos.parentesco.map((item) => (
                              <option key={item.id} value={item.codigo}>
                                {item.codigo} - {item.descripcion}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Instrucción */}
                        <div className="col-span-1 sm:col-span-2 lg:col-span-2">
                          <label className="block text-[10px] text-slate-400 mb-0.5">Instrucción</label>
                          <select
                            name={`hab_${idx}_instruccion`}
                            defaultValue={hab.instruccion || 'c'}
                            className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-[11px]"
                          >
                            {catalogos.instruccion.map((item) => (
                              <option key={item.id} value={item.codigo}>
                                {item.codigo} - {item.descripcion}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Profesión / Ocupación */}
                        <div className="col-span-2 sm:col-span-3 lg:col-span-3">
                          <label className="block text-[10px] text-slate-400 mb-0.5">Profesión / Ocupación</label>
                          <input
                            type="text"
                            name={`hab_${idx}_ocupacion`}
                            defaultValue={hab.profesion_ocupacion || ''}
                            placeholder="Ej: Docente, Estudiante"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
                          />
                        </div>

                        {/* Salud */}
                        <div className="col-span-1 sm:col-span-2 lg:col-span-2">
                          <label className="block text-[10px] text-slate-400 mb-0.5">Salud</label>
                          <select
                            name={`hab_${idx}_salud`}
                            defaultValue={hab.salud || 'e'}
                            className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-[11px]"
                          >
                            {catalogos.salud.map((item) => (
                              <option key={item.id} value={item.codigo}>
                                {item.codigo} - {item.descripcion}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Teléfono Móvil */}
                        <div className="col-span-1 sm:col-span-2 lg:col-span-2">
                          <label className="block text-[10px] text-slate-400 mb-0.5">Teléfono Móvil</label>
                          <input
                            type="text"
                            name={`hab_${idx}_telefono`}
                            defaultValue={hab.telefono_movil || ''}
                            placeholder="0412-1234567"
                            className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Observaciones Generales */}
              <div>
                <label className="block text-slate-400 mb-1">Observaciones / Notas Comunitarias</label>
                <textarea
                  name="observaciones"
                  rows={2}
                  defaultValue={planillaActiva?.planilla?.observaciones || ''}
                  placeholder="Detalles sobre las familias, condiciones especiales de la vivienda o requerimientos de atención social"
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-blue-500 outline-none"
                />
              </div>

              {/* Botón de Guardado */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setModalCenso(false); setPlanillaActiva(null); }}
                  className="w-full sm:w-1/3 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs transition"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-2/3 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Planilla Oficial de Censo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Registro de Vecino Individual */}
      {modalNuevoVecino && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalNuevoVecino(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Registrar Nuevo Vecino</h3>
            <p className="text-xs text-slate-400 mb-4">Incorporación manual al Padrón Oficial de la Comunidad</p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const payload = {
                  action: 'create',
                  cedula: (formData.get('cedula') || '').trim(),
                  nombres: (formData.get('nombres') || '').trim(),
                  apellidos: (formData.get('apellidos') || '').trim(),
                  vereda: (formData.get('vereda') || 'A').trim().toUpperCase(),
                  casa: (formData.get('casa') || '').trim().toUpperCase(),
                  sexo: formData.get('sexo') || 'M',
                  fecha_nacimiento: (formData.get('fecha_nacimiento') || '').trim(),
                  tiempo_residencia: (formData.get('tiempo_residencia') || '').trim(),
                  calidad_tenencia: formData.get('calidad_tenencia') || 'Propia',
                  telefono: (formData.get('telefono') || '').trim(),
                  email: (formData.get('email') || '').trim(),
                };

                try {
                  const res = await fetch('/api/vecinos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                  });
                  const d = await res.json();
                  if (res.ok) {
                    toast.success(d.message || 'Vecino registrado satisfactoriamente');
                    setModalNuevoVecino(false);
                    cargarVecinos();
                    cargarEstadisticas();
                  } else {
                    toast.error(d.error || 'Error al registrar vecino');
                  }
                } catch (err) {
                  toast.error('Error de red al registrar vecino');
                }
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-slate-400 mb-1">Cédula de Identidad *</label>
                <input
                  type="text"
                  name="cedula"
                  required
                  placeholder="V-12345678"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white font-mono font-bold focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Nombres *</label>
                  <input
                    type="text"
                    name="nombres"
                    required
                    placeholder="Ej: Pedro José"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white uppercase focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Apellidos *</label>
                  <input
                    type="text"
                    name="apellidos"
                    required
                    placeholder="Ej: Pérez Gómez"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white uppercase focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Vereda *</label>
                  <select
                    name="vereda"
                    defaultValue="A"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white focus:border-blue-500 outline-none"
                  >
                    {VEREDAS.map(v => <option key={v} value={v}>Vereda {v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">N° Casa *</label>
                  <input
                    type="text"
                    name="casa"
                    required
                    placeholder="Ej: A-8"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white uppercase font-bold focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Sexo</label>
                  <select
                    name="sexo"
                    defaultValue="M"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white focus:border-blue-500 outline-none"
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Fecha de Nacimiento</label>
                  <input
                    type="text"
                    name="fecha_nacimiento"
                    placeholder="DD/MM/AAAA"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Calidad de Tenencia</label>
                  <select
                    name="calidad_tenencia"
                    defaultValue="Propia"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white focus:border-blue-500 outline-none"
                  >
                    {CALIDADES_TENENCIA.map(ct => <option key={ct} value={ct}>{ct}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Tiempo de Residencia (Años)</label>
                  <input
                    type="text"
                    name="tiempo_residencia"
                    placeholder="Ej: 10"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Teléfono</label>
                  <input
                    type="text"
                    name="telefono"
                    placeholder="0414-1234567"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="correo@ejemplo.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Registrar Vecino en Padrón</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Agregar / Editar Firma Autorizada con Subida de Archivos */}
      {modalFirma && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setModalFirma(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-white mb-1">
              {modalFirma.id ? `Editar Firma Autorizada #${modalFirma.orden}` : 'Agregar Nueva Firma Autorizada'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Configura los datos del vocero y sube los archivos de firma y sello.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const isNew = !modalFirma.id;
                const method = isNew ? 'POST' : 'PUT';
                const res = await fetch('/api/firmas', {
                  method,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(modalFirma),
                });
                const d = await res.json();
                if (res.ok) {
                  toast.success(isNew ? 'Firma autorizada creada con éxito' : 'Firma autorizada actualizada');
                  setModalFirma(null);
                  cargarFirmas();
                } else {
                  toast.error(d.error || 'Error al guardar firma');
                }
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-400 mb-1 font-semibold">Comisión / Cargo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Vocero Ejecutivo C.C., Contraloría Social, etc."
                    value={modalFirma.comision}
                    onChange={(e) => setModalFirma({ ...modalFirma, comision: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre y Apellido"
                    value={modalFirma.nombre}
                    onChange={(e) => setModalFirma({ ...modalFirma, nombre: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Cédula de Identidad *</label>
                  <input
                    type="text"
                    required
                    placeholder="V-12345678"
                    value={modalFirma.cedula}
                    onChange={(e) => setModalFirma({ ...modalFirma, cedula: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Teléfono *</label>
                  <input
                    type="text"
                    required
                    placeholder="0414-1234567"
                    value={modalFirma.telefono}
                    onChange={(e) => setModalFirma({ ...modalFirma, telefono: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Número de Orden</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={modalFirma.orden}
                    onChange={(e) => setModalFirma({ ...modalFirma, orden: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white font-mono"
                  />
                </div>
              </div>

              {/* SECCIÓN 1: SUBIR IMAGEN DE FIRMA */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-blue-400" /> Archivo de Firma (PNG transparente)
                  </span>
                  {modalFirma.url_firma && (
                    <button
                      type="button"
                      onClick={() => setModalFirma({ ...modalFirma, url_firma: null })}
                      className="text-rose-400 hover:text-rose-300 text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Quitar Firma
                    </button>
                  )}
                </div>

                {modalFirma.url_firma ? (
                  <div className="p-3 rounded-xl bg-white/5 border border-slate-800 text-center">
                    <img
                      src={modalFirma.url_firma}
                      alt="Vista previa firma"
                      className="max-h-16 mx-auto object-contain"
                    />
                    <span className="text-[10px] text-emerald-400 block mt-1 font-semibold">
                      ✓ Imagen de firma cargada
                    </span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-900 border border-dashed border-slate-800 text-center text-slate-500">
                    <span className="text-[11px] block">No hay archivo de firma cargado.</span>
                    <span className="text-[10px] text-slate-600 block">(Se dejará la línea en blanco para firma manuscrita)</span>
                  </div>
                )}

                <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-750 transition">
                  <Upload className="w-3.5 h-3.5 text-blue-400" />
                  <span>{modalFirma.url_firma ? 'Reemplazar Archivo de Firma' : 'Seleccionar Archivo de Firma'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const safeName = modalFirma.cedula
                        ? `firma_${modalFirma.cedula.replace(/[^a-zA-Z0-9]/g, '')}`
                        : 'firma_vocero';
                      const urlSubida = await subirArchivoAStorage(file, 'firmas_sellos', safeName);
                      if (urlSubida) {
                        setModalFirma((prev) => ({ ...prev, url_firma: urlSubida }));
                      }
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>

              {/* SECCIÓN 2: CONFIGURACIÓN Y SUBIDA DE SELLO */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Sello Oficial
                </span>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(modalFirma.usar_sello_principal)}
                    onChange={(e) =>
                      setModalFirma({
                        ...modalFirma,
                        usar_sello_principal: e.target.checked ? 1 : 0,
                      })
                    }
                    className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                  />
                  <span>Usar Sello Principal del Consejo Comunal Las Llaves</span>
                </label>

                {!modalFirma.usar_sello_principal && (
                  <div className="space-y-2 pt-1 border-t border-slate-850">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-semibold">Sello Propio de la Comisión:</span>
                      {modalFirma.url_sello && (
                        <button
                          type="button"
                          onClick={() => setModalFirma({ ...modalFirma, url_sello: null })}
                          className="text-rose-400 hover:text-rose-300 text-[11px] font-semibold flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Quitar Sello
                        </button>
                      )}
                    </div>

                    {modalFirma.url_sello ? (
                      <div className="p-3 rounded-xl bg-white/5 border border-slate-800 text-center">
                        <img
                          src={modalFirma.url_sello}
                          alt="Vista previa sello"
                          className="max-h-16 mx-auto object-contain"
                        />
                        <span className="text-[10px] text-emerald-400 block mt-1 font-semibold">
                          ✓ Sello de comisión cargado
                        </span>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-dashed border-slate-800 text-center text-slate-500 text-[11px]">
                        Sin imagen de sello propio.
                      </div>
                    )}

                    <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-750 transition">
                      <Upload className="w-3.5 h-3.5 text-blue-400" />
                      <span>{modalFirma.url_sello ? 'Reemplazar Sello Propio' : 'Subir Archivo de Sello Propio'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const safeName = modalFirma.cedula
                            ? `sello_${modalFirma.cedula.replace(/[^a-zA-Z0-9]/g, '')}`
                            : 'sello_comision';
                          const urlSubida = await subirArchivoAStorage(file, 'firmas_sellos', safeName);
                          if (urlSubida) {
                            setModalFirma((prev) => ({ ...prev, url_sello: urlSubida }));
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modalFirma.activo !== 0}
                    onChange={(e) =>
                      setModalFirma({
                        ...modalFirma,
                        activo: e.target.checked ? 1 : 0,
                      })
                    }
                    className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                  />
                  <span>Vocero Activo en Emisión de Constancias</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalFirma(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-lg shadow-blue-600/30"
                >
                  Guardar Firma Autorizada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Gestión y Configuración de Vocero y Permisos Granulares */}
      {modalUsuario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalUsuario(false)}
              className="absolute top-5 right-5 p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                {usuarioEditando ? `Configurar Vocero: ${usuarioEditando.username}` : 'Crear Nuevo Vocero o Administrador'}
              </h3>
              <p className="text-xs text-slate-400">
                Define el perfil y qué funciones específicas tiene permitido ver y ejecutar en la plataforma.
              </p>
            </div>

            {/* Presets Rápidos */}
            <div className="mb-5 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                ⚡ Perfiles Rápidos Preconfigurados:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => aplicarPreset('CENSISTA')}
                  className={`p-2 rounded-xl text-left border transition ${
                    presetSeleccionado === 'CENSISTA'
                      ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-bold block text-emerald-400">Digitalizador</span>
                  <span className="text-[10px] text-slate-400">Solo Censo y Vecinos (Individual y Masivo)</span>
                </button>

                <button
                  type="button"
                  onClick={() => aplicarPreset('DOCUMENTAL')}
                  className={`p-2 rounded-xl text-left border transition ${
                    presetSeleccionado === 'DOCUMENTAL'
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-bold block text-blue-400">Emisor Docs</span>
                  <span className="text-[10px] text-slate-400">Emisión de Constancias y Consulta Censo</span>
                </button>

                <button
                  type="button"
                  onClick={() => aplicarPreset('ADMIN')}
                  className={`p-2 rounded-xl text-left border transition ${
                    presetSeleccionado === 'ADMIN'
                      ? 'bg-purple-600/20 border-purple-500 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-bold block text-purple-400">Administrador</span>
                  <span className="text-[10px] text-slate-400">Aprobación, Vecinos y Constancias</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPresetSeleccionado('CUSTOM')}
                  className={`p-2 rounded-xl text-left border transition ${
                    presetSeleccionado === 'CUSTOM'
                      ? 'bg-amber-600/20 border-amber-500 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-bold block text-amber-400">Personalizado</span>
                  <span className="text-[10px] text-slate-400">Selección manual casilla por casilla</span>
                </button>
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const username = formData.get('username');
                const nombre = formData.get('nombre');
                const password = formData.get('password');
                const rol = formData.get('rol');
                const comision = formData.get('comision');
                const activo = formData.get('activo') === '1';

                if (usuarioEditando) {
                  // Actualizar usuario existente
                  const bodyPayload = {
                    action: 'update_user',
                    userId: usuarioEditando.id,
                    nombre,
                    rol,
                    comision,
                    activo,
                    permisos: permisosForm,
                  };
                  if (password && password.trim().length > 0) {
                    bodyPayload.newPassword = password.trim();
                  }

                  const res = await fetch('/api/auth', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bodyPayload),
                  });
                  const d = await res.json();
                  if (res.ok) {
                    toast.success('Vocero y permisos actualizados correctamente');
                    setModalUsuario(false);
                    cargarUsuarios();
                  } else {
                    toast.error(d.error || 'Error al actualizar usuario');
                  }
                } else {
                  // Crear nuevo usuario
                  if (!username || !password || !nombre) {
                    toast.error('Usuario, contraseña y nombre son obligatorios');
                    return;
                  }

                  const res = await fetch('/api/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'create_user',
                      username,
                      password,
                      nombre,
                      rol,
                      comision,
                      permisos: permisosForm,
                    }),
                  });
                  const d = await res.json();
                  if (res.ok) {
                    toast.success('Nuevo vocero creado y configurado con éxito');
                    setModalUsuario(false);
                    cargarUsuarios();
                  } else {
                    toast.error(d.error || 'Error al crear usuario');
                  }
                }
              }}
              className="space-y-4 text-xs"
            >
              {/* Datos de Acceso */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Usuario de Acceso *</label>
                  <input
                    name="username"
                    defaultValue={usuarioEditando?.username || ''}
                    disabled={Boolean(usuarioEditando)}
                    required={!usuarioEditando}
                    placeholder="EJ: VOCERO_CENSO"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white uppercase font-mono disabled:opacity-50"
                  />
                  {usuarioEditando && <span className="text-[10px] text-slate-500">El nombre de usuario no es editable.</span>}
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nombre Completo *</label>
                  <input
                    name="nombre"
                    defaultValue={usuarioEditando?.nombre || ''}
                    required
                    placeholder="Nombre y Apellido del vocero"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {usuarioEditando ? 'Nueva Contraseña (Opcional)' : 'Contraseña *'}
                  </label>
                  <div className="relative">
                    <input
                      type={mostrarPasswordUsuario ? 'text' : 'password'}
                      name="password"
                      required={!usuarioEditando}
                      placeholder={usuarioEditando ? 'Dejar en blanco para mantener la actual' : 'Contraseña segura'}
                      className="w-full pl-3 pr-10 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarPasswordUsuario(!mostrarPasswordUsuario)}
                      tabIndex="-1"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white transition"
                    >
                      {mostrarPasswordUsuario ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Comisión Comunal</label>
                  <input
                    name="comision"
                    defaultValue={usuarioEditando?.comision || ''}
                    placeholder="Ej: Censo y Población, Hábitat, etc."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nivel / Rol</label>
                  <select
                    name="rol"
                    defaultValue={usuarioEditando?.rol || 'VOCERO'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white"
                  >
                    <option value="VOCERO">VOCERO (Nivel estándar restringible)</option>
                    <option value="ADMIN">ADMIN (Nivel administrativo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Estado de la Cuenta</label>
                  <select
                    name="activo"
                    defaultValue={usuarioEditando ? (usuarioEditando.activo ? '1' : '0') : '1'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white"
                  >
                    <option value="1">Cuenta Activa (Permite iniciar sesión)</option>
                    <option value="0">Cuenta Deshabilitada / Inactiva</option>
                  </select>
                </div>
              </div>

              {/* Matriz Visual de Permisos Granulares */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  Matriz de Accesos y Permisos Específicos:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Tarjeta 1: Censo y Vecinos */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                      👥 Padrón y Censo Familiar
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={Boolean(permisosForm.vecinos)}
                        onChange={(e) => {
                          setPermisosForm({ ...permisosForm, vecinos: e.target.checked });
                          setPresetSeleccionado('CUSTOM');
                        }}
                        className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span>Ver Padrón de Vecinos</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={Boolean(permisosForm.vecinos_crear)}
                        onChange={(e) => {
                          setPermisosForm({ ...permisosForm, vecinos_crear: e.target.checked });
                          setPresetSeleccionado('CUSTOM');
                        }}
                        className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span className="font-semibold text-emerald-300">Registrar Vecinos (Individual)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={Boolean(permisosForm.censo_masivo)}
                        onChange={(e) => {
                          setPermisosForm({ ...permisosForm, censo_masivo: e.target.checked });
                          setPresetSeleccionado('CUSTOM');
                        }}
                        className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span className="font-semibold text-emerald-300">Cargar Censo Masivo (Excel/CSV)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={Boolean(permisosForm.vecinos_editar)}
                        onChange={(e) => {
                          setPermisosForm({ ...permisosForm, vecinos_editar: e.target.checked });
                          setPresetSeleccionado('CUSTOM');
                        }}
                        className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span>Editar Datos de Vecinos</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={Boolean(permisosForm.vecinos_aprobar)}
                        onChange={(e) => {
                          setPermisosForm({ ...permisosForm, vecinos_aprobar: e.target.checked });
                          setPresetSeleccionado('CUSTOM');
                        }}
                        className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span>Aprobar / Validar Residencia</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={Boolean(permisosForm.censo)}
                        onChange={(e) => {
                          setPermisosForm({ ...permisosForm, censo: e.target.checked });
                          setPresetSeleccionado('CUSTOM');
                        }}
                        className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span>Módulo Censo Familiar</span>
                    </label>
                  </div>

                  {/* Tarjeta 2: Documentos */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                    <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">
                      📑 Documentos y Constancias
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={Boolean(permisosForm.documentos)}
                        onChange={(e) => {
                          setPermisosForm({ ...permisosForm, documentos: e.target.checked });
                          setPresetSeleccionado('CUSTOM');
                        }}
                        className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span>Ver Gestor Documental</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={Boolean(permisosForm.docs_emitir)}
                        onChange={(e) => {
                          setPermisosForm({ ...permisosForm, docs_emitir: e.target.checked });
                          setPresetSeleccionado('CUSTOM');
                        }}
                        className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span className="font-semibold text-blue-300">Emitir Constancias Oficiales (PDF)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={Boolean(permisosForm.docs_anular)}
                        onChange={(e) => {
                          setPermisosForm({ ...permisosForm, docs_anular: e.target.checked });
                          setPresetSeleccionado('CUSTOM');
                        }}
                        className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span>Revocar / Anular Constancias</span>
                    </label>
                  </div>

                  {/* Tarjeta 3: Seguridad Institucional (Firmas y SVG) */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                    <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block">
                      🔒 Seguridad Institucional (Restringido)
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={Boolean(permisosForm.firmas)}
                        onChange={(e) => {
                          setPermisosForm({ ...permisosForm, firmas: e.target.checked, firmas_edit: e.target.checked });
                          setPresetSeleccionado('CUSTOM');
                        }}
                        className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span>Ver y Modificar Firmas / Sellos</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={Boolean(permisosForm.modelador)}
                        onChange={(e) => {
                          setPermisosForm({ ...permisosForm, modelador: e.target.checked, modelador_edit: e.target.checked });
                          setPresetSeleccionado('CUSTOM');
                        }}
                        className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span>Editar Modelador de Plantillas y SVG</span>
                    </label>
                    <p className="text-[10px] text-slate-500 italic">
                      * Por seguridad, desactiva estas opciones para voceros censistas o digitalizadores.
                    </p>
                  </div>

                  {/* Tarjeta 4: Otros Módulos */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      📊 Módulos Auxiliares
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={Boolean(permisosForm.pagos)}
                        onChange={(e) => {
                          setPermisosForm({ ...permisosForm, pagos: e.target.checked });
                          setPresetSeleccionado('CUSTOM');
                        }}
                        className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span>Aportes Comunitarios y Pagos</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={Boolean(permisosForm.estadisticas)}
                        onChange={(e) => {
                          setPermisosForm({ ...permisosForm, estadisticas: e.target.checked });
                          setPresetSeleccionado('CUSTOM');
                        }}
                        className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span>Estadísticas Visuales</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={Boolean(permisosForm.auditoria)}
                        onChange={(e) => {
                          setPermisosForm({ ...permisosForm, auditoria: e.target.checked });
                          setPresetSeleccionado('CUSTOM');
                        }}
                        className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span>Bitácora de Auditoría</span>
                    </label>
                  </div>

                </div>
              </div>

              {/* Botón Guardar */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalUsuario(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{usuarioEditando ? 'Guardar Cambios y Permisos' : 'Crear y Habilitar Vocero'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE PASE A PRODUCCIÓN / LIMPIEZA DE DATOS */}
      {modalResetProd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-red-500/40 rounded-3xl p-6 shadow-2xl relative text-xs">
            <button
              onClick={() => { if (!resetCargando) setModalResetProd(false); }}
              disabled={resetCargando}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-500/20 text-red-400 rounded-2xl border border-red-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white">¿Reiniciar Sistema a Producción?</h3>
                <p className="text-slate-400 text-xs">Esta acción eliminará de forma irreversible los datos de prueba seleccionados</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <span className="block text-slate-300 font-semibold mb-1">Módulos a purgar:</span>
                
                <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resetCheckCenso}
                    onChange={(e) => setResetCheckCenso(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-red-600 focus:ring-0"
                  />
                  <div>
                    <span className="font-bold text-white">Censo Sociodemográfico y Planillas</span>
                    <p className="text-[11px] text-slate-400">Elimina todas las planillas cargadas y reinicia el correlativo a PLC-0001</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resetCheckVecinos}
                    onChange={(e) => setResetCheckVecinos(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-red-600 focus:ring-0"
                  />
                  <div>
                    <span className="font-bold text-white">Padrón de Vecinos</span>
                    <p className="text-[11px] text-slate-400">Elimina los registros de vecinos de demostración/prueba</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resetCheckDocs}
                    onChange={(e) => setResetCheckDocs(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-red-600 focus:ring-0"
                  />
                  <div>
                    <span className="font-bold text-white">Documentos y Solicitudes Emitidas</span>
                    <p className="text-[11px] text-slate-400">Elimina constancias de prueba y pagos asociados</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resetCheckAudit}
                    onChange={(e) => setResetCheckAudit(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-red-600 focus:ring-0"
                  />
                  <div>
                    <span className="font-bold text-white">Bitácora de Auditoría</span>
                    <p className="text-[11px] text-slate-400">Limpia el historial de pruebas previas de acceso y eventos</p>
                  </div>
                </label>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-[11px]">
                🛡️ <strong>Datos protegidos que NO se borrarán:</strong> Cuentas de usuario/voceros, configuración institucional, RIF/SITUR, firmas digitales y plantillas del modelador de documentos.
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Para confirmar, escribe <strong className="text-red-400 font-mono">PRODUCCION</strong> a continuación:
                </label>
                <input
                  type="text"
                  placeholder="Escribe PRODUCCION"
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white font-mono focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalResetProd(false)}
                  disabled={resetCargando}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={resetConfirmText !== 'PRODUCCION' || resetCargando}
                  onClick={async () => {
                    try {
                      setResetCargando(true);
                      const res = await fetch('/api/configuracion', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'reset_produccion',
                          confirmacion: resetConfirmText,
                          limpiarVecinos: resetCheckVecinos,
                          limpiarCenso: resetCheckCenso,
                          limpiarDocumentos: resetCheckDocs,
                          limpiarAuditoria: resetCheckAudit,
                        }),
                      });

                      const data = await res.json();
                      if (res.ok) {
                        toast.success(data.message || 'Sistema reiniciado a producción con éxito');
                        setModalResetProd(false);
                        // Refrescar vistas del sistema
                        cargarEstadisticas();
                        cargarVecinos();
                        cargarCenso();
                        cargarSolicitudes();
                        cargarAuditoria();
                      } else {
                        toast.error(data.error || 'Error al reiniciar datos');
                      }
                    } catch (err) {
                      toast.error('Error de conexión al purgar datos');
                    } finally {
                      setResetCargando(false);
                    }
                  }}
                  className={`w-2/3 py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 shadow-lg ${
                    resetConfirmText === 'PRODUCCION' && !resetCargando
                      ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{resetCargando ? 'Purgando registros...' : 'Confirmar Pase a Producción'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Users, FileText, ClipboardList, DollarSign,
  PenTool, Sliders, ShieldCheck, History, BarChart3, Settings,
  LogOut, Plus, Search, Filter, Download, Upload, Check, X,
  AlertTriangle, RefreshCw, Eye, EyeOff, Edit, Trash2, Key, CheckCircle2,
  Calendar, Clock, UserCheck, ShieldAlert, Sun, Moon, Image as ImageIcon,
  ListPlus, Store, FileCheck, Printer, Activity, Globe, Laptop, Smartphone,
  ChevronDown, ChevronRight, User, Shield, Flame, Building2, CreditCard,
  Gift, Layers, CheckSquare, Sparkles, Hash, Copy, Database,
  UserX, Ban, Phone, Mail, Heart, GraduationCap
} from 'lucide-react';
import { 
  VEREDAS, CASAS_POR_VEREDA, getCasasPorVereda, BANCOS_VENEZUELA, CALIDADES_TENENCIA,
  MAPEO_PARENTESCO, MAPEO_INSTRUCCION, MAPEO_SALUD
} from '@/lib/territory';
import { generarDocumentoPdf, generarReporteGestionPdf } from '@/lib/pdfGenerator';
import SvgCanvasEditor from '@/components/SvgCanvasEditor';
import { toast } from '@/lib/toast';
import ConfiguradorTerritorio from '@/components/ConfiguradorTerritorio';
import SelectorVeredaCasa from '@/components/SelectorVeredaCasa';
import ModalResumenEstadistico from '@/components/ModalResumenEstadistico';
import { useTerritorio } from '@/lib/useTerritorio';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts';

export default function Dashboard({ user, onLogout }) {
  // Hash routing
  const [currentTab, setCurrentTab] = useState('dashboard');
  // Territorio dinámico (veredas/casas desde BD); re-renderiza al actualizarse
  useTerritorio();

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
    if (tab && tab !== 'auditoria') {
      const titulosModulos = {
        dashboard: 'Panel Principal',
        vecinos: 'Padrón Comunal de Vecinos',
        documentos: 'Emisión de Constancias y Validación',
        censo: 'Censo Sociodemográfico',
        pagos: 'Finanzas y Recaudación Comunitaria',
        firmas: 'Firmas y Sellos Autorizados',
        modelador: 'Modelador de Plantillas Documentales',
        usuarios: 'Gestión de Voceros y Permisos',
        estadisticas: 'Estadísticas e Indicadores',
        configuracion: 'Configuración del Sistema',
      };
      try {
        fetch('/api/auditoria', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'registrar_actividad',
            tipo_evento: 'NAVEGACION_MODULO',
            modulo: tab,
            modulo_nombre: titulosModulos[tab] || tab,
            detalles: {
              accion: `Navegó al módulo "${titulosModulos[tab] || tab}"`,
              modulo: tab,
              modulo_nombre: titulosModulos[tab] || tab,
            }
          }),
        }).catch(() => {});
      } catch (e) {}
    }
  };

  // Estados de datos generales
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [tasaBcv, setTasaBcv] = useState(875.65);

  // Estados de Reporte de Gestión en PDF por Rango de Fechas
  const [fechaInicioReporte, setFechaInicioReporte] = useState('');
  const [fechaFinReporte, setFechaFinReporte] = useState('');
  const [generandoReportePdf, setGenerandoReportePdf] = useState(false);
  const [firmanteReporteId, setFirmanteReporteId] = useState('ADMIN_ACTUAL');

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
  const [vecinoEditando, setVecinoEditando] = useState(null);
  const [modalImportarCsv, setModalImportarCsv] = useState(false);
  const [csvPreviewData, setCsvPreviewData] = useState(null);

  // Estados de módulo Documentos
  const [documentos, setDocumentos] = useState([]);
  const [filtroDocTipo, setFiltroDocTipo] = useState('');
  const [filtroDocEstado, setFiltroDocEstado] = useState('');
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [documentoEditando, setDocumentoEditando] = useState(null);

  // Estados de módulo Aportes Comunitarios
  const [filtroPagoBusqueda, setFiltroPagoBusqueda] = useState('');
  const [filtroPagoTipo, setFiltroPagoTipo] = useState('TODOS'); // 'TODOS' | 'APORTE' | 'EXONERADO'
  const [filtroPagoDoc, setFiltroPagoDoc] = useState('');

  // Estados de módulo Censo
  const [planillasCenso, setPlanillasCenso] = useState([]);
  const [vecinosCenso, setVecinosCenso] = useState([]);
  const [modalCenso, setModalCenso] = useState(false);
  const [planillaActiva, setPlanillaActiva] = useState(null);
  const [numeroPlanillaModal, setNumeroPlanillaModal] = useState('');
  const [guardandoCenso, setGuardandoCenso] = useState(false);

  // Generador cliente de códigos alfanuméricos aleatorios únicos (ej: PLC-A0A0A0)
  const generarNumeroPlanillaAlfanumericoClient = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let rand = '';
    for (let i = 0; i < 6; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `PLC-${rand}`;
  };
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
  const [modalResumenVisual, setModalResumenVisual] = useState(false);
  const [catalogoEditando, setCatalogoEditando] = useState(null);
  const [catalogoForm, setCatalogoForm] = useState({
    tipo: 'parentesco',
    codigo: '',
    descripcion: '',
    orden: 1,
  });

  // Estados de módulo Modelador (1 sola Cabecera Única y 1 solo Footer Único para todos los documentos)
  const [plantillas, setPlantillas] = useState([]);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState(null);
  const [cabeceraUnicaSvg, setCabeceraUnicaSvg] = useState('');
  const [footerUnicoSvg, setFooterUnicoSvg] = useState('');
  const [modeladorSubTab, setModeladorSubTab] = useState('cabecera'); // 'cabecera' | 'pie' | 'cuerpo' | 'previsualizacion'

  // Estados de módulo Usuarios (Super Admin) y Permisos Granulares
  const [usuarios, setUsuarios] = useState([]);
  const [modalUsuario, setModalUsuario] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [presetSeleccionado, setPresetSeleccionado] = useState('CENSISTA');
  const [usuarioForm, setUsuarioForm] = useState({
    username: '',
    nombre: '',
    password: '',
    comision: '',
    email: '',
    telefono: '',
    rol: 'VOCERO',
    activo: '1',
  });
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
      setUsuarioForm((prev) => ({ ...prev, rol: 'VOCERO' }));
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
      setUsuarioForm((prev) => ({ ...prev, rol: 'VOCERO' }));
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
    } else if (presetName === 'CONTRALORIA') {
      // Perfil de Contraloría Social: Supervisar y Aprobar (Sin CRUD Total)
      setUsuarioForm((prev) => ({ ...prev, rol: 'CONTRALORIA' }));
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
        vecinos_crear: false,
        censo_masivo: false,
        vecinos_editar: false,
        vecinos_aprobar: true, // Aprobar vecinos inscritos externamente
        vecinos_eliminar: false,
        docs_emitir: true,
        docs_anular: false,
      });
    } else if (presetName === 'ADMIN') {
      setUsuarioForm((prev) => ({ ...prev, rol: 'ADMIN' }));
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
    } else if (presetName === 'SUPER_ADMIN') {
      setUsuarioForm((prev) => ({ ...prev, rol: 'SUPER_ADMIN' }));
      setPermisosForm({
        vecinos: true,
        censo: true,
        documentos: true,
        pagos: true,
        firmas: true,
        firmas_edit: true,
        modelador: true,
        modelador_edit: true,
        estadisticas: true,
        auditoria: true,
        vecinos_crear: true,
        censo_masivo: true,
        vecinos_editar: true,
        vecinos_aprobar: true,
        vecinos_eliminar: true,
        docs_emitir: true,
        docs_anular: true,
      });
    }
  };

  const abrirModalCrearUsuario = () => {
    setUsuarioEditando(null);
    setUsuarioForm({
      username: '',
      nombre: '',
      password: '',
      comision: '',
      email: '',
      telefono: '',
      rol: 'VOCERO',
      activo: '1',
    });
    aplicarPreset('CENSISTA');
    setModalUsuario(true);
  };

  const abrirModalEditarUsuario = (u) => {
    setUsuarioEditando(u);
    setUsuarioForm({
      username: String(u.username || '').trim().toUpperCase(),
      nombre: String(u.nombre || '').trim().toUpperCase(),
      password: '',
      comision: u.comision ? String(u.comision).trim().toUpperCase() : '',
      email: u.email || '',
      telefono: u.telefono || '',
      rol: u.rol || 'VOCERO',
      activo: u.activo ? '1' : '0',
    });
    const uPerms = typeof u.permisos === 'string' ? JSON.parse(u.permisos || '{}') : (u.permisos || {});
    const isSuper = u.rol === 'SUPER_ADMIN';
    setPermisosForm({
      vecinos: isSuper ? true : (uPerms.vecinos ?? true),
      vecinos_crear: isSuper ? true : (uPerms.vecinos_crear ?? false),
      censo_masivo: isSuper ? true : (uPerms.censo_masivo ?? false),
      vecinos_editar: isSuper ? true : (uPerms.vecinos_editar ?? false),
      vecinos_aprobar: isSuper ? true : (uPerms.vecinos_aprobar ?? false),
      vecinos_eliminar: isSuper ? true : (uPerms.vecinos_eliminar ?? false),
      censo: isSuper ? true : (uPerms.censo ?? true),
      documentos: isSuper ? true : (uPerms.documentos ?? false),
      docs_emitir: isSuper ? true : (uPerms.docs_emitir ?? false),
      docs_anular: isSuper ? true : (uPerms.docs_anular ?? false),
      pagos: isSuper ? true : (uPerms.pagos ?? false),
      firmas: isSuper ? true : (uPerms.firmas ?? false),
      firmas_edit: isSuper ? true : (uPerms.firmas_edit ?? false),
      modelador: isSuper ? true : (uPerms.modelador ?? false),
      modelador_edit: isSuper ? true : (uPerms.modelador_edit ?? false),
      estadisticas: isSuper ? true : (uPerms.estadisticas ?? false),
      auditoria: isSuper ? true : (uPerms.auditoria ?? false),
    });
    setPresetSeleccionado(isSuper ? 'SUPER_ADMIN' : 'CUSTOM');
    setModalUsuario(true);
  };

  // Estados avanzados de Bitácora y Control Cuantitativo de Auditoría
  const [auditorias, setAuditorias] = useState([]);
  const [auditoriaCuantitativo, setAuditoriaCuantitativo] = useState(null);
  const [loadingAuditoria, setLoadingAuditoria] = useState(false);
  const [ipPublicaServidor, setIpPublicaServidor] = useState('');
  const [ipPublicaCliente, setIpPublicaCliente] = useState('');

  // Filtros de Auditoría
  const [auditFechaInicio, setAuditFechaInicio] = useState('');
  const [auditFechaFin, setAuditFechaFin] = useState('');
  const [auditFiltroTipo, setAuditFiltroTipo] = useState('');
  const [auditFiltroCategoria, setAuditFiltroCategoria] = useState('');
  const [auditFiltroPersona, setAuditFiltroPersona] = useState('');
  const [auditFiltroIp, setAuditFiltroIp] = useState('');
  const [auditBusqueda, setAuditBusqueda] = useState('');
  const [auditSubTab, setAuditSubTab] = useState('integral'); // 'integral' | 'graficos' | 'personas' | 'ips' | 'tabla'
  const [personaSeleccionadaDetalle, setPersonaSeleccionadaDetalle] = useState(null);
  const [logDetalleModal, setLogDetalleModal] = useState(null);

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

  // Estados de Respaldo Integral de Base de Datos
  const [backupStats, setBackupStats] = useState(null);
  const [loadingBackupStats, setLoadingBackupStats] = useState(false);
  const [descargandoBackup, setDescargandoBackup] = useState(false);

  // Estados de Servicios y Jornadas Comunales (Gas, CLAP, etc.)
  const [serviciosCatalogo, setServiciosCatalogo] = useState([]);
  const [jornadas, setJornadas] = useState([]);
  const [jornadaSeleccionadaId, setJornadaSeleccionadaId] = useState('');
  const [solicitudesJornada, setSolicitudesJornada] = useState([]);
  const [loadingServicios, setLoadingServicios] = useState(false);
  const [loadingJornadas, setLoadingJornadas] = useState(false);
  const [loadingSolicitudesJornada, setLoadingSolicitudesJornada] = useState(false);
  const [modalServicio, setModalServicio] = useState(false);
  const [servicioEditando, setServicioEditando] = useState(null);
  const [servicioForm, setServicioForm] = useState({
    id: '',
    nombre: '',
    categoria: 'GAS',
    costo_base_usd: 1.0,
    alicuota_autogestion_usd: 0.5,
    descripcion: '',
    activo: 1,
  });
  const [modalNuevaJornada, setModalNuevaJornada] = useState(false);
  const [jornadaEditando, setJornadaEditando] = useState(null);
  const [jornadaForm, setJornadaForm] = useState({
    titulo: '',
    descripcion: '',
    categoria: 'GAS',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: '',
    fecha_por_definir: false,
    max_unidades_por_familia: 2,
    estado: 'ACTIVA',
  });
  const [pagosSubTab, setPagosSubTab] = useState('documentos'); // 'documentos' | 'servicios'
  const [configSubTab, setConfigSubTab] = useState('todo'); // 'todo' | 'gas' | 'jornadas' | 'banco' | 'cupo' | 'general' | 'tarifas' | 'territorio'
  const [filtroServicioBusqueda, setFiltroServicioBusqueda] = useState('');
  const [filtroServicioEstado, setFiltroServicioEstado] = useState('TODOS');
  const [reciboModalServicio, setReciboModalServicio] = useState(null);

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

  const handleCambiarFirmanteReporte = async (nuevoId) => {
    setFirmanteReporteId(nuevoId);
    if (user?.rol === 'SUPER_ADMIN' || user?.rol === 'ADMIN') {
      try {
        await fetch('/api/configuracion', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            settings: { firmante_estadisticas_id: nuevoId }
          })
        });
        toast.success('Firmante del informe estadístico asignado y guardado');
      } catch (e) {
        console.error('Error guardando firmante:', e);
      }
    }
  };

  const obtenerFirmanteSeleccionado = (listaFirmas = firmas) => {
    if (firmanteReporteId && firmanteReporteId.startsWith('FIRMA_')) {
      const idNum = parseInt(firmanteReporteId.replace('FIRMA_', ''), 10);
      const firmaEncontrada = listaFirmas.find(f => f.id === idNum);
      if (firmaEncontrada) return firmaEncontrada;
    }

    // Si es ADMIN_ACTUAL o no se encontró la firma específica:
    const firmaAdminRegistrada = listaFirmas.find(f => 
      (user?.cedula && f.cedula && f.cedula.replace(/[^\d]/g, '') === String(user.cedula).replace(/[^\d]/g, '')) ||
      (f.nombre && user?.nombre && f.nombre.toUpperCase().includes(user.nombre.toUpperCase().slice(0, 8))) ||
      f.comision?.toUpperCase().includes('ADMIN') ||
      f.comision?.toUpperCase().includes('TECNOLOG')
    );

    if (firmaAdminRegistrada) {
      return {
        ...firmaAdminRegistrada,
        nombre: firmaAdminRegistrada.nombre || user?.nombre || 'ADMINISTRADOR DEL SISTEMA',
        comision: firmaAdminRegistrada.comision || 'ADMINISTRADOR DEL SISTEMA Y GESTIÓN COMUNAL',
      };
    }

    return {
      nombre: user?.nombre || 'ADMINISTRADOR DEL SISTEMA',
      cedula: user?.cedula || config?.admin_cedula || 'V-ADMIN',
      comision: 'ADMINISTRADOR DEL SISTEMA Y GESTIÓN COMUNAL',
      telefono: user?.telefono || '',
      url_firma: user?.url_firma || null,
      usar_sello_principal: 1,
    };
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
      const listaFirmas = firmasRes.firmas || firmas || [];
      const firmanteEfectivo = obtenerFirmanteSeleccionado(listaFirmas);

      await generarReporteGestionPdf({
        rango: { fechaInicio: fechaInicioReporte, fechaFin: fechaFinReporte },
        resumen: statData?.resumen || {},
        tiposDocs: statData?.graficos?.tiposDocs || [],
        veredasData: statData?.graficos?.veredasData || [],
        parentescoData: statData?.graficos?.parentescoData || [],
        instruccionData: statData?.graficos?.instruccionData || [],
        saludData: statData?.graficos?.saludData || [],
        firmas: listaFirmas,
        firmanteSeleccionado: firmanteEfectivo,
        config: config || {},
        appUrl: typeof window !== 'undefined' ? window.location.origin : 'https://lasllaves.org',
        usuarioGenerador: user?.nombre || user?.username || 'Administrador del Sistema'
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
      cargarEstadisticas();
    };
    window.addEventListener('catalogos_updated', handleCatalogosUpdate);
    return () => {
      window.removeEventListener('catalogos_updated', handleCatalogosUpdate);
    };
  }, []);

  useEffect(() => {
    if (currentTab === 'vecinos') { cargarVecinos(); cargarCatalogosSistema(); }
    if (currentTab === 'documentos' || currentTab === 'pagos') { cargarDocumentos(); cargarConfiguracion(); cargarServiciosCatalogo(); cargarJornadas(); }
    if (currentTab === 'censo') { cargarCenso(); cargarCatalogosSistema(); }
    if (currentTab === 'firmas') cargarFirmas();
    if (currentTab === 'modelador') cargarModelador();
    if (currentTab === 'usuarios' && user?.rol === 'SUPER_ADMIN') cargarUsuarios();
    if (currentTab === 'auditoria') cargarAuditoria();
    if (currentTab === 'configuracion') { cargarConfiguracion(); cargarServiciosCatalogo(); cargarJornadas(); if (user?.rol === 'SUPER_ADMIN') cargarBackupStats(); }
    if (currentTab === 'estadisticas') cargarEstadisticas();
  }, [currentTab, filtroVereda, filtroCasa, filtroEstado, filtroBusqueda]);

  useEffect(() => {
    if (jornadaSeleccionadaId) {
      cargarSolicitudesJornada(jornadaSeleccionadaId);
    }
  }, [jornadaSeleccionadaId]);

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

  const rechazarVecino = async (vecinoId) => {
    const motivo = prompt('Ingresa el motivo de rechazo o revocatoria de residencia:', 'RECHAZADO POR VALIDACIÓN COMUNAL');
    if (motivo === null) return;
    try {
      const res = await fetch('/api/vecinos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', vecinoId, motivo: motivo.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message || 'Vecino marcado como rechazado');
      cargarVecinos();
      cargarEstadisticas();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const abrirModalCrearVecino = () => {
    setVecinoEditando(null);
    setModalNuevoVecino(true);
  };

  const abrirModalEditarVecino = (v) => {
    setVecinoEditando(v);
    setModalNuevoVecino(true);
  };

  const eliminarVecino = async (v) => {
    if (!confirm(`¿Estás seguro de que deseas ELIMINAR definitivamente del Padrón Comunal al vecino ${v.nombres} ${v.apellidos} (C.I. ${v.cedula})?`)) return;
    try {
      const res = await fetch(`/api/vecinos?id=${v.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message || 'Vecino eliminado del padrón');
      cargarVecinos();
      cargarEstadisticas();
    } catch (e) {
      toast.error(e.message || 'Error al eliminar vecino');
    }
  };

  const eliminarDocumento = async (doc) => {
    if (!confirm(`¿Confirmas que deseas ELIMINAR permanentemente el documento ${doc.codigo_qr} (${doc.tipo_documento}) de ${doc.nombres_apellidos || doc.solicitante_nombre || doc.cedula}?`)) return;
    try {
      const res = await fetch(`/api/documentos?id=${doc.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message || 'Documento eliminado permanentemente');
      cargarDocumentos();
      cargarEstadisticas();
    } catch (e) {
      toast.error(e.message || 'Error al eliminar documento');
    }
  };

  const eliminarSolicitudServicio = async (sol) => {
    if (!confirm(`¿Confirmas que deseas ELIMINAR la declaración de aporte #${sol.id} de ${sol.nombres_apellidos} (Ref: ${sol.numero_referencia || 'N/A'})?`)) return;
    try {
      const res = await fetch('/api/servicios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'eliminar_solicitud', id: sol.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message || 'Declaración eliminada');
      if (jornadaSeleccionadaId) cargarSolicitudesJornada(jornadaSeleccionadaId);
    } catch (e) {
      toast.error(e.message || 'Error al eliminar declaración');
    }
  };

  const eliminarServicioCatalogo = async (serv) => {
    if (!confirm(`¿Confirmas que deseas ELIMINAR el servicio "${serv.nombre}" del catálogo?`)) return;
    try {
      const res = await fetch('/api/servicios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'eliminar_servicio', id: serv.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message || 'Servicio eliminado del catálogo');
      cargarServiciosCatalogo();
    } catch (e) {
      toast.error(e.message || 'Error al eliminar servicio');
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
      setVecinosCenso(data.vecinos_censo || []);
    } catch (e) {
      console.error(e);
    }
  };

  const abrirPlanillaPorVivienda = async (vereda, casa, silencioso = false) => {
    if (!vereda || !casa) return;
    try {
      const res = await fetch(`/api/censo?cargar_vivienda=1&vereda=${encodeURIComponent(vereda)}&casa=${encodeURIComponent(casa)}`).then((r) => r.json());
      if (res.error) {
        if (!silencioso) toast.error(res.error);
        return;
      }
      const habsNorm = normalizarHabitantesParaFormulario(res.habitantes || []);
      const numPlan = res.planilla?.numero_planilla || numeroPlanillaModal || generarNumeroPlanillaAlfanumericoClient();
      setNumeroPlanillaModal(numPlan);
      setPlanillaActiva({
        planilla: {
          ...(res.planilla || {}),
          numero_planilla: numPlan,
          empadronador_nombre: res.planilla?.empadronador_nombre || user?.nombre || '',
          calle_vereda_av: vereda.toUpperCase(),
          numero_casa: casa.toUpperCase(),
          total_habitantes: habsNorm.length,
        },
        habitantes: habsNorm,
        vecinos_casa: res.vecinos_casa || [],
      });
      setModalCenso(true);

      const vecCount = Array.isArray(res.vecinos_casa) ? res.vecinos_casa.length : 0;
      if (res.existe_planilla) {
        toast.info(`Cargada Planilla N° ${numPlan} de Vereda ${vereda}, Casa ${casa}${vecCount > 0 ? ` (${vecCount} vecino(s) de #vecinos vinculados sin duplicar)` : ''}`);
      } else if (vecCount > 0) {
        toast.success(`Se precargaron ${vecCount} vecino(s) de #vecinos en Casa ${casa}. Ajuste parentesco o datos faltantes.`);
      }
    } catch (err) {
      if (!silencioso) toast.error('No se pudo consultar la vivienda');
    }
  };

  const crearHabitanteVacio = (numeroFamilia = 1, parentesco = 'a') => ({
    _uid: `hab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    numero_familia: numeroFamilia,
    nombres_apellidos: '',
    cedula: '',
    sexo: 'M',
    fecha_nacimiento: '',
    parentesco,
    instruccion: 'c',
    profesion_ocupacion: '',
    salud: 'e',
    telefono_movil: '',
  });

  const normalizarHabitantesParaFormulario = (lista) => {
    if (!Array.isArray(lista) || lista.length === 0) {
      return [crearHabitanteVacio(1, 'a')];
    }
    const vistos = new Set();
    const unicos = [];
    lista.forEach((h, idx) => {
      const nomNorm = String(h?.nombres_apellidos || '').trim().toUpperCase().replace(/\s+/g, ' ');
      const cedNorm = String(h?.cedula || '').trim().toUpperCase();
      const clave = nomNorm ? `${nomNorm}|${cedNorm}` : `__empty_${idx}`;
      if (!vistos.has(clave)) {
        vistos.add(clave);
        unicos.push({
          ...h,
          _uid: h?._uid || `hab_${h?.id || idx}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          numero_familia: Number(h?.numero_familia) || 1,
          nombres_apellidos: nomNorm,
          cedula: cedNorm,
          sexo: h?.sexo || 'M',
          fecha_nacimiento: h?.fecha_nacimiento || '',
          parentesco: h?.parentesco || (unicos.length === 0 ? 'a' : 'c'),
          instruccion: h?.instruccion || 'c',
          profesion_ocupacion: h?.profesion_ocupacion || '',
          salud: h?.salud || 'e',
          telefono_movil: h?.telefono_movil || '',
        });
      }
    });
    return unicos.length > 0 ? unicos : [crearHabitanteVacio(1, 'a')];
  };

  const actualizarHabitanteCenso = (idx, campo, valor) => {
    setPlanillaActiva((prev) => {
      if (!prev) return prev;
      const actuales = Array.isArray(prev.habitantes) && prev.habitantes.length > 0
        ? [...prev.habitantes]
        : [crearHabitanteVacio(1, 'a')];
      actuales[idx] = {
        ...actuales[idx],
        [campo]: valor,
      };
      return {
        ...prev,
        habitantes: actuales,
      };
    });
  };

  const agregarHabitanteACenso = () => {
    let nuevoTotal = 1;
    setPlanillaActiva((prev) => {
      const actuales = Array.isArray(prev?.habitantes) && prev.habitantes.length > 0
        ? prev.habitantes.map((h) => ({ ...h }))
        : [crearHabitanteVacio(1, 'a')];

      const famAnterior = Number(actuales[actuales.length - 1]?.numero_familia) || 1;
      const nuevoHab = crearHabitanteVacio(famAnterior, 'c');
      const nuevaLista = [...actuales, nuevoHab];
      nuevoTotal = nuevaLista.length;

      return {
        ...prev,
        planilla: {
          ...(prev?.planilla || {}),
          total_habitantes: nuevaLista.length,
        },
        habitantes: nuevaLista,
      };
    });
    toast.success(`Habitante #${nuevoTotal} incorporado`);
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

  const guardarCabeceraUnica = async (jsonString) => {
    try {
      setCabeceraUnicaSvg(jsonString);
      setPlantillas((prev) => prev.map((pl) => ({ ...pl, encabezado_svg: jsonString })));
      if (plantillaSeleccionada) {
        setPlantillaSeleccionada((prev) => (prev ? { ...prev, encabezado_svg: jsonString } : prev));
      }
      const res = await fetch('/api/modelador', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'guardar_cabecera_global',
          encabezado_svg: jsonString,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('¡Cabecera de Documentos única guardada para todos los documentos!');
        cargarModelador();
      } else {
        toast.error(data.error || 'Error al guardar la Cabecera de Documentos');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error de conexión con el servidor');
    }
  };

  const guardarFooterUnico = async (jsonString) => {
    try {
      setFooterUnicoSvg(jsonString);
      setPlantillas((prev) => prev.map((pl) => ({ ...pl, pie_svg: jsonString })));
      if (plantillaSeleccionada) {
        setPlantillaSeleccionada((prev) => (prev ? { ...prev, pie_svg: jsonString } : prev));
      }
      const res = await fetch('/api/modelador', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'guardar_footer_global',
          pie_svg: jsonString,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('¡Footer de Documentos único guardado para todos los documentos!');
        cargarModelador();
      } else {
        toast.error(data.error || 'Error al guardar el Footer de Documentos');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error de conexión con el servidor');
    }
  };

  const guardarPlantilla = async (plantillaToSave) => {
    const p = plantillaToSave || plantillaSeleccionada;
    if (!p) return;
    try {
      const payload = {
        ...p,
        encabezado_svg: cabeceraUnicaSvg || p.encabezado_svg || '',
        pie_svg: footerUnicoSvg || p.pie_svg || '',
      };
      const res = await fetch('/api/modelador', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Plantilla y configuración documental guardada exitosamente');
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
    const pEfectiva = plantilla || plantillaSeleccionada || plantillas[0];
    if (!pEfectiva) return;
    try {
      const docMuestra = {
        codigo_qr: 'MUESTRA999',
        tipo_documento: pEfectiva.id,
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
          encabezado_svg_global: cabeceraUnicaSvg || pEfectiva.encabezado_svg || '',
          pie_svg_global: footerUnicoSvg || pEfectiva.pie_svg || '',
          sello_forma: selloForma,
          sello_ancho_mm: String(selloAnchoMm),
          sello_alto_mm: String(selloAltoMm),
          sello_tamano_mm: String(selloAnchoMm),
          sello_principal_url: selloPrincipalUrl,
        },
        plantilla: {
          ...pEfectiva,
          encabezado_svg: cabeceraUnicaSvg || pEfectiva.encabezado_svg || '',
          pie_svg: footerUnicoSvg || pEfectiva.pie_svg || '',
        },
      });
      toast.success('PDF de muestra generado con la Cabecera y Footer únicos');
    } catch (e) {
      console.error(e);
      toast.error('Error al generar PDF de muestra');
    }
  };

  const cargarModelador = async () => {
    try {
      const res = await fetch('/api/modelador');
      const data = await res.json();
      const lista = data.plantillas || [];
      const cabGlobal = data.cabecera_global ?? lista[0]?.encabezado_svg ?? '';
      const footGlobal = data.footer_global ?? lista[0]?.pie_svg ?? '';

      setCabeceraUnicaSvg(cabGlobal);
      setFooterUnicoSvg(footGlobal);
      setPlantillas(lista);

      if (lista.length > 0) {
        setPlantillaSeleccionada((prev) => {
          if (!prev) return lista[0];
          const encontrada = lista.find((it) => it.id === prev.id);
          return encontrada || lista[0];
        });
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

  const toggleActivoUsuario = async (u) => {
    if (Number(u.id) === Number(user?.id)) {
      toast.error('No puedes inhabilitar tu propia cuenta en uso');
      return;
    }
    const nuevoEstado = !u.activo;
    const accionTexto = nuevoEstado ? 'HABILITAR el acceso al' : 'INHABILITAR el acceso al';
    if (!confirm(`¿Estás seguro de que deseas ${accionTexto} usuario ${u.username} (${u.nombre})?`)) return;

    try {
      const res = await fetch('/api/auth', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_user',
          userId: u.id,
          activo: nuevoEstado,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success(nuevoEstado ? `Usuario ${u.username} habilitado con éxito` : `Usuario ${u.username} inhabilitado correctamente`);
        cargarUsuarios();
      } else {
        toast.error(d.error || 'Error al actualizar estado del usuario');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error de red al actualizar estado del usuario');
    }
  };

  const eliminarUsuario = async (u) => {
    if (Number(u.id) === Number(user?.id)) {
      toast.error('No puedes eliminar tu propia cuenta en sesión activa');
      return;
    }
    if (!confirm(`¿Confirmas que deseas ELIMINAR definitivamente al usuario ${u.username} (${u.nombre})? Esta acción revocará todos sus accesos de forma permanente.`)) return;

    try {
      const res = await fetch(`/api/auth?userId=${u.id}`, { method: 'DELETE' });
      const d = await res.json();
      if (res.ok) {
        toast.success(`Usuario ${u.username} eliminado exitosamente`);
        cargarUsuarios();
      } else {
        toast.error(d.error || 'Error al eliminar usuario');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error de red al eliminar usuario');
    }
  };

  const cargarAuditoria = async (
    fIni = auditFechaInicio,
    fFin = auditFechaFin,
    cat = auditFiltroCategoria,
    tip = auditFiltroTipo,
    pers = auditFiltroPersona,
    ip = auditFiltroIp,
    q = auditBusqueda
  ) => {
    setLoadingAuditoria(true);
    try {
      const params = new URLSearchParams();
      if (fIni) params.append('fechaInicio', fIni);
      if (fFin) params.append('fechaFin', fFin);
      if (cat) params.append('categoria', cat);
      if (tip) params.append('tipo', tip);
      if (pers) params.append('persona', pers);
      if (ip) params.append('ip', ip);
      if (q) params.append('cedula', q);
      params.append('limit', '800');

      const res = await fetch(`/api/auditoria?${params.toString()}`);
      const data = await res.json();
      setAuditorias(data.logs || []);
      setAuditoriaCuantitativo(data.cuantitativo || null);
      if (data.ip_publica_actual) setIpPublicaServidor(data.ip_publica_actual);
    } catch (e) {
      console.error('Error cargando auditoría:', e);
    } finally {
      setLoadingAuditoria(false);
    }
  };

  const aplicarFiltroRapidoFechaAudit = (diasAtras) => {
    const hoy = new Date();
    const hoyStr = hoy.toISOString().split('T')[0];
    if (diasAtras === 0) {
      setAuditFechaInicio(hoyStr);
      setAuditFechaFin(hoyStr);
      cargarAuditoria(hoyStr, hoyStr, auditFiltroCategoria, auditFiltroTipo, auditFiltroPersona, auditFiltroIp, auditBusqueda);
    } else if (diasAtras > 0) {
      const pasado = new Date(hoy.getTime() - diasAtras * 24 * 60 * 60 * 1000);
      const pasadoStr = pasado.toISOString().split('T')[0];
      setAuditFechaInicio(pasadoStr);
      setAuditFechaFin(hoyStr);
      cargarAuditoria(pasadoStr, hoyStr, auditFiltroCategoria, auditFiltroTipo, auditFiltroPersona, auditFiltroIp, auditBusqueda);
    } else {
      setAuditFechaInicio('');
      setAuditFechaFin('');
      cargarAuditoria('', '', auditFiltroCategoria, auditFiltroTipo, auditFiltroPersona, auditFiltroIp, auditBusqueda);
    }
  };

  const exportarAuditoriaCsv = () => {
    if (!auditorias || auditorias.length === 0) {
      toast.error('No hay registros de auditoría para exportar');
      return;
    }
    const headers = ['ID', 'Fecha_Hora', 'Evento', 'Categoria', 'Critico', 'Usuario_Operador', 'Cedula', 'Codigo_Documento', 'IP_Publica', 'Dispositivo', 'Accion_Detalle'];
    const rows = auditorias.map(a => [
      a.id,
      `"${a.created_at || a.fecha || ''}"`,
      `"${(a.etiqueta_evento || a.tipo_evento || '').replace(/"/g, '""')}"`,
      `"${a.categoria_evento || ''}"`,
      a.es_critico ? 'SI' : 'NO',
      `"${(a.usuario_nombre || 'Público').replace(/"/g, '""')}"`,
      `"${a.cedula || ''}"`,
      `"${a.codigo_documento || ''}"`,
      `"${a.ip || ''}"`,
      `"${(a.dispositivo_resumen || '').replace(/"/g, '""')}"`,
      `"${(a.resumen_accion || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bitacora_Auditoria_CCLL_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Acta de auditoría y bitácora exportada en CSV');
  };

  const exportarAportesCsv = () => {
    const aportesExportar = documentos.filter(doc => Number(doc.monto_bs) > 0 || doc.numero_transferencia || doc.es_exonerado);
    if (aportesExportar.length === 0) {
      toast.info('No hay declaraciones de aportes comunitarios para exportar');
      return;
    }
    const headers = ['Fecha_Pago', 'Codigo_Documento', 'Tipo_Documento', 'Cedula', 'Solicitante', 'Vereda_Casa', 'Banco_Origen', 'Numero_Referencia', 'Monto_Bs', 'Monto_USD', 'Tasa_BCV', 'Exonerado', 'Motivo_Exoneracion', 'Estado'];
    const rows = aportesExportar.map(d => [
      `"${d.fecha_pago || d.created_at || ''}"`,
      `"${d.codigo_qr || ''}"`,
      `"${d.tipo_documento || ''}"`,
      `"${d.cedula || d.solicitante_cedula || ''}"`,
      `"${(d.solicitante_nombre || `${d.nombres || ''} ${d.apellidos || ''}`).trim().replace(/"/g, '""')}"`,
      `"${(d.vereda ? `${d.vereda} - ${d.casa || ''}` : '').replace(/"/g, '""')}"`,
      `"${(d.banco_nombre || 'N/A').replace(/"/g, '""')}"`,
      `"${(d.numero_transferencia || 'N/A').replace(/"/g, '""')}"`,
      Number(d.monto_bs || 0).toFixed(2),
      Number(d.monto_usd || 0).toFixed(2),
      Number(d.tasa_bcv || tasaBcv || 0).toFixed(2),
      d.es_exonerado ? 'SI' : 'NO',
      `"${(d.motivo_exoneracion || 'N/A').replace(/"/g, '""')}"`,
      `"${d.estado || ''}"`
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Aportes_Comunitarios_CCLL_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Reporte de recaudación comunitaria exportado en CSV');
  };

  const cargarConfiguracion = async () => {
    try {
      const res = await fetch('/api/configuracion');
      const data = await res.json();
      const cfg = data.config || {};
      setConfig(cfg);
      if (cfg.firmante_estadisticas_id) setFirmanteReporteId(cfg.firmante_estadisticas_id);
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
      if (user?.rol === 'SUPER_ADMIN') {
        cargarBackupStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const cargarBackupStats = async () => {
    try {
      setLoadingBackupStats(true);
      const res = await fetch('/api/configuracion/backup?info=1');
      if (res.ok) {
        const d = await res.json();
        setBackupStats(d);
      }
    } catch (e) {
      console.error('Error al obtener estadísticas de la base de datos:', e);
    } finally {
      setLoadingBackupStats(false);
    }
  };

  const descargarBackup = async (formato = 'json') => {
    try {
      setDescargandoBackup(true);
      toast.info(`Generando respaldo integral de la BD (${formato.toUpperCase()})...`);
      const res = await fetch(`/api/configuracion/backup?format=${formato}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Error al generar respaldo');
      }
      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition') || '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match ? match[1] : `respaldo_cc_las_llaves_${Date.now()}.${formato}`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Respaldo descargado exitosamente: ${filename}`);
      cargarBackupStats();
    } catch (err) {
      toast.error(err.message || 'Error al descargar respaldo de la base de datos');
    } finally {
      setDescargandoBackup(false);
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

  // --- SERVICIOS COMUNALES Y JORNADAS (GAS COMUNAL) ---
  const cargarServiciosCatalogo = async () => {
    setLoadingServicios(true);
    try {
      const res = await fetch('/api/servicios?action=catalogo');
      const data = await res.json();
      setServiciosCatalogo(data.servicios || data.catalogo || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingServicios(false);
    }
  };

  const cargarJornadas = async () => {
    setLoadingJornadas(true);
    try {
      const res = await fetch('/api/servicios?action=jornadas');
      const data = await res.json();
      const list = data.jornadas || [];
      setJornadas(list);
      if (list.length > 0 && !jornadaSeleccionadaId) {
        setJornadaSeleccionadaId(list[0].id);
        cargarSolicitudesJornada(list[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingJornadas(false);
    }
  };

  const cargarSolicitudesJornada = async (jId) => {
    const targetId = jId || jornadaSeleccionadaId;
    if (!targetId) return;
    setLoadingSolicitudesJornada(true);
    try {
      const res = await fetch(`/api/servicios?action=solicitudes&jornada_id=${targetId}`);
      const data = await res.json();
      setSolicitudesJornada(data.solicitudes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSolicitudesJornada(false);
    }
  };

  const guardarServicio = async (e) => {
    if (e) e.preventDefault();
    if (!servicioForm.nombre?.trim()) {
      toast.error('El nombre del servicio es obligatorio');
      return;
    }
    const precioBase = Number(servicioForm.costo_base_usd !== undefined ? servicioForm.costo_base_usd : (servicioForm.precio_usd || 1.0));
    const alicuota = Number(servicioForm.alicuota_autogestion_usd || 0);

    try {
      const action = servicioEditando ? 'editar_servicio' : 'crear_servicio';
      const res = await fetch('/api/servicios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ...servicioForm,
          precio_usd: precioBase,
          costo_base_usd: precioBase,
          alicuota_autogestion_usd: alicuota,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(servicioEditando ? 'Cilindro / Precio actualizado exitosamente' : 'Modelo de cilindro registrado');
        setModalServicio(false);
        setServicioEditando(null);
        cargarServiciosCatalogo();
        try { window.dispatchEvent(new CustomEvent('jornada_updated')); } catch (e) {}
      } else {
        toast.error(data.error || 'Error al guardar servicio');
      }
    } catch (err) {
      toast.error('Error de conexión: ' + err.message);
    }
  };

  const toggleActivoServicio = async (serv) => {
    try {
      const nuevoActivo = serv.activo ? 0 : 1;
      const precioBase = Number(serv.costo_base_usd !== undefined ? serv.costo_base_usd : (serv.precio_usd || 1.0));
      const res = await fetch('/api/servicios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'editar_servicio',
          id: serv.id,
          nombre: serv.nombre,
          categoria: serv.categoria || 'GAS',
          precio_usd: precioBase,
          costo_base_usd: precioBase,
          alicuota_autogestion_usd: Number(serv.alicuota_autogestion_usd || 0),
          descripcion: serv.descripcion || '',
          activo: nuevoActivo,
        }),
      });
      if (res.ok) {
        toast.success(`Modelo ${nuevoActivo ? 'activado' : 'desactivado'}`);
        cargarServiciosCatalogo();
        try { window.dispatchEvent(new CustomEvent('jornada_updated')); } catch (e) {}
      }
    } catch (err) {
      toast.error('Error al actualizar servicio');
    }
  };

  const abrirModalNuevaJornada = () => {
    setJornadaEditando(null);
    setJornadaForm({
      titulo: '',
      descripcion: '',
      categoria: 'GAS',
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_fin: '',
      fecha_por_definir: false,
      max_unidades_por_familia: 2,
      estado: 'ACTIVA',
    });
    setModalNuevaJornada(true);
  };

  const abrirModalEditarJornada = (jorn) => {
    setJornadaEditando(jorn);
    const fIni = (jorn.fecha_inicio || '').trim();
    const esPorDefinir = fIni.toLowerCase().includes('definir') || fIni.toLowerCase().includes('espera') || !fIni;
    setJornadaForm({
      id: jorn.id,
      titulo: jorn.titulo || '',
      descripcion: jorn.descripcion || '',
      categoria: jorn.categoria || 'GAS',
      fecha_inicio: esPorDefinir ? '' : fIni,
      fecha_fin: jorn.fecha_cierre || jorn.fecha_fin || '',
      fecha_por_definir: esPorDefinir,
      max_unidades_por_familia: Number(jorn.max_unidades_por_familia) || 2,
      estado: jorn.estado || 'ACTIVA',
    });
    setModalNuevaJornada(true);
  };

  const guardarJornada = async (e) => {
    if (e) e.preventDefault();
    if (!jornadaForm.titulo?.trim()) {
      toast.error('El título de la jornada es obligatorio');
      return;
    }

    const fechaInicioFinal = jornadaForm.fecha_por_definir
      ? 'A la espera de asignación de fecha'
      : (jornadaForm.fecha_inicio || new Date().toISOString().split('T')[0]);

    try {
      const action = jornadaEditando ? 'editar_jornada' : 'crear_jornada';
      const payload = {
        action,
        ...(jornadaEditando ? { id: jornadaEditando.id } : {}),
        titulo: jornadaForm.titulo.trim(),
        categoria: jornadaForm.categoria || 'GAS',
        descripcion: jornadaForm.descripcion || '',
        fecha_inicio: fechaInicioFinal,
        fecha_cierre: jornadaForm.fecha_fin || '',
        fecha_fin: jornadaForm.fecha_fin || '',
        max_unidades_por_familia: Number(jornadaForm.max_unidades_por_familia) || 2,
        estado: jornadaForm.estado || 'ACTIVA',
      };

      const res = await fetch('/api/servicios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(jornadaEditando ? '¡Jornada actualizada exitosamente!' : '¡Jornada creada y activada exitosamente!');
        setModalNuevaJornada(false);
        setJornadaEditando(null);
        cargarJornadas();
        try { window.dispatchEvent(new CustomEvent('jornada_updated')); } catch (e) {}
      } else {
        toast.error(data.error || 'Error al guardar la jornada');
      }
    } catch (err) {
      toast.error('Error de conexión: ' + err.message);
    }
  };

  const eliminarJornada = async (jorn) => {
    const numSol = Number(jorn.total_solicitudes || 0);
    const mensaje = numSol > 0
      ? `ATENCIÓN: La jornada "${jorn.titulo}" tiene ${numSol} aporte(s) registrados por vecinos.\n\n¿Desea eliminarla definitivamente con todo su historial? (Si prefiere conservarla en auditoría, puede simplemente Desactivarla)`
      : `¿Está seguro de eliminar permanentemente la jornada "${jorn.titulo}"?`;

    if (!window.confirm(mensaje)) return;

    try {
      const res = await fetch('/api/servicios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'eliminar_jornada',
          id: jorn.id,
          forzar: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Jornada eliminada exitosamente');
        if (jornadaSeleccionadaId === jorn.id) {
          setJornadaSeleccionadaId(null);
        }
        cargarJornadas();
        try { window.dispatchEvent(new CustomEvent('jornada_updated')); } catch (e) {}
      } else {
        toast.error(data.error || 'Error al eliminar la jornada');
      }
    } catch (err) {
      toast.error('Error de conexión al eliminar');
    }
  };

  const cambiarEstadoJornada = async (id, estado) => {
    try {
      const res = await fetch('/api/servicios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cambiar_estado_jornada', id, estado }),
      });
      const data = await res.json();
      if (res.ok) {
        const esAct = estado === 'ACTIVA' || estado === 'ABIERTA';
        toast.success(`Jornada ${esAct ? 'ACTIVADA (Ahora visible en el portal para los vecinos)' : 'DESACTIVADA (Oculta en el portal para los vecinos)'}`);
        cargarJornadas();
        try { window.dispatchEvent(new CustomEvent('jornada_updated', { detail: { id, estado } })); } catch (e) {}
      } else {
        toast.error(data.error || 'Error al cambiar estado de jornada');
      }
    } catch (err) {
      toast.error('Error de conexión');
    }
  };

  const cambiarEstadoSolicitudServicio = async (id, estado) => {
    try {
      const res = await fetch('/api/servicios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cambiar_estado_solicitud', id, estado }),
      });
      if (res.ok) {
        toast.success(`Solicitud marcada como ${estado}`);
        cargarSolicitudesJornada(jornadaSeleccionadaId);
      } else {
        toast.error('Error al actualizar estado');
      }
    } catch (err) {
      toast.error('Error de conexión');
    }
  };

  const exportarServiciosCsv = () => {
    if (!solicitudesJornada || solicitudesJornada.length === 0) {
      toast.error('No hay solicitudes registradas en esta jornada para exportar');
      return;
    }
    const jornadaActual = jornadas.find(j => j.id === jornadaSeleccionadaId);
    const headers = [
      'Fecha',
      'Cédula',
      'Nombres y Apellidos',
      'Vereda',
      'Casa',
      'Teléfono',
      'Detalle Bombonas/Items',
      'Total Unidades',
      'Total USD',
      'Total Bs',
      'Banco Origen',
      'Nro Referencia',
      'Estado',
    ];
    const rows = solicitudesJornada.map(s => {
      let detalleTxt = '';
      try {
        const items = JSON.parse(s.items_json || '[]');
        detalleTxt = items.map(it => `${it.cantidad}x ${it.nombre}`).join(' | ');
      } catch (e) {
        detalleTxt = s.items_json || '';
      }
      return [
        `"${s.created_at?.split('T')[0] || ''}"`,
        `"${s.cedula || ''}"`,
        `"${(s.nombres_apellidos || '').replace(/"/g, '""')}"`,
        `"${s.vereda || ''}"`,
        `"${s.casa || ''}"`,
        `"${s.telefono || ''}"`,
        `"${detalleTxt.replace(/"/g, '""')}"`,
        s.total_unidades || 0,
        Number(s.monto_total_usd || 0).toFixed(2),
        Number(s.monto_total_bs || 0).toFixed(2),
        `"${(s.banco_origen || '').replace(/"/g, '""')}"`,
        `"${s.numero_referencia || ''}"`,
        `"${s.estado || ''}"`,
      ].join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const nomArchivo = `despacho_jornada_${jornadaActual?.titulo?.replace(/\s+/g, '_') || 'gas'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('download', nomArchivo);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Lista de despacho de la jornada exportada en CSV');
  };

  const guardarCoordenadasBancarias = async (bancoData) => {
    try {
      const res = await fetch('/api/configuracion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: bancoData }),
      });
      if (res.ok) {
        setConfig(prev => ({ ...prev, ...bancoData }));
        window.dispatchEvent(new CustomEvent('config_updated', { detail: bancoData }));
        toast.success('Coordenadas bancarias oficiales guardadas con éxito');
      } else {
        toast.error('Error al guardar datos bancarios');
      }
    } catch (e) {
      toast.error('Error de conexión: ' + e.message);
    }
  };

  const guardarCupoGratis = async (cupoData) => {
    try {
      const res = await fetch('/api/configuracion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: cupoData }),
      });
      if (res.ok) {
        setConfig(prev => ({ ...prev, ...cupoData }));
        window.dispatchEvent(new CustomEvent('config_updated', { detail: cupoData }));
        toast.success('Parámetros de cupo gratuito actualizados');
      } else {
        toast.error('Error al guardar cupo');
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
      
      {/* Navegación Superior Exclusiva para Móvil */}
      <header className="md:hidden sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-3 py-2 shadow-lg">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src="https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/logo.png"
              alt="Logo"
              className="w-7 h-7 object-contain shrink-0"
            />
            <div className="min-w-0">
              <h2 className="text-[11px] font-extrabold text-white leading-tight truncate">C.C. LAS LLAVES</h2>
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-bold text-blue-400 truncate max-w-[110px]">{user?.nombre || user?.username}</span>
                <span className="px-1 py-0.2 rounded text-[8px] font-extrabold bg-blue-500/15 text-blue-300 border border-blue-500/20">
                  {user?.rol}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 font-bold whitespace-nowrap">
              BCV: Bs. {Number(tasaBcv).toFixed(2)}
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-amber-400 hover:text-amber-300 transition shrink-0"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5 text-blue-500" />}
            </button>
            <button
              onClick={onLogout}
              title="Cerrar sesión"
              className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg border border-rose-500/20 transition shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Pestañas de Módulos Desplazables Horizontalmente en Móvil */}
        <nav className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth pt-1 pb-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={`mob_${item.id}`}
                onClick={() => navigateTo(item.id)}
                className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* Sidebar Lateral para Pantallas Medianas y Grandes (Desktop) */}
      <aside className="hidden md:flex md:w-64 bg-slate-950 border-r border-slate-800/80 p-4 flex-col justify-between shrink-0 min-h-screen sticky top-0">
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
      <main className="flex-1 p-2.5 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
        
        {/* Barra Superior Global del Dashboard (Desktop) */}
        <div className="hidden md:flex items-center justify-between pb-4 mb-6 border-b border-slate-800/80">
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
                  onClick={() => { abrirModalCrearVecino(); navigateTo('vecinos'); }}
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
                    onClick={abrirModalCrearVecino}
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
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {v.estado_aprobacion !== 'APROBADO' && checkPermiso('vecinos_aprobar') && (
                                <button
                                  onClick={() => aprobarVecino(v.id)}
                                  title="Aprobar y validar residencia del vecino"
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition shadow inline-flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Aprobar</span>
                                </button>
                              )}

                              {v.estado_aprobacion !== 'RECHAZADO' && checkPermiso('vecinos_aprobar') && (
                                <button
                                  onClick={() => rechazarVecino(v.id)}
                                  title="Rechazar o revocar estatus de aprobación"
                                  className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 transition"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {checkPermiso('vecinos_editar') && (
                                <button
                                  onClick={() => abrirModalEditarVecino(v)}
                                  title="Editar todos los datos del vecino"
                                  className="px-2 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-bold text-[11px] transition inline-flex items-center gap-1"
                                >
                                  <Edit className="w-3 h-3" />
                                  <span>Editar</span>
                                </button>
                              )}

                              {checkPermiso('vecinos_eliminar') && (
                                <button
                                  onClick={() => eliminarVecino(v)}
                                  title="Eliminar vecino del Padrón Comunal"
                                  className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
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
                            {d.estado_calculado === 'VIGENTE' && checkPermiso('docs_anular') && (
                              <button
                                onClick={() => revocarDocumento(d.codigo_qr)}
                                title="Revocar Documento"
                                className="p-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {user?.rol === 'SUPER_ADMIN' && (
                              <>
                                <button
                                  onClick={() => setDocumentoEditando({ ...d })}
                                  title="Editar Documento (SUPER_ADMIN)"
                                  className="p-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => eliminarDocumento(d)}
                                  title="Eliminar Documento Permanentemente (SUPER_ADMIN)"
                                  className="p-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
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

              {user?.rol !== 'CONTRALORIA' && (
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/censo?proximo_numero=1').then(r => r.json()).catch(() => ({}));
                      const nextNum = res.sugerido || generarNumeroPlanillaAlfanumericoClient();
                      setNumeroPlanillaModal(nextNum);
                      toast.info(`Número de planilla asignado: ${nextNum}. Recuerde anotarlo en la planilla física.`);
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
                        habitantes: normalizarHabitantesParaFormulario([crearHabitanteVacio(1, 'a')])
                      });
                      setModalCenso(true);
                    } catch (e) {
                      const fallbackNum = generarNumeroPlanillaAlfanumericoClient();
                      setNumeroPlanillaModal(fallbackNum);
                      setPlanillaActiva({
                        planilla: {
                          numero_planilla: fallbackNum,
                          fecha: new Date().toISOString().split('T')[0],
                          empadronador_nombre: user?.nombre || '',
                          calle_vereda_av: 'A',
                          numero_casa: '',
                          total_familias: 1,
                          total_habitantes: 1,
                        },
                        habitantes: normalizarHabitantesParaFormulario([crearHabitanteVacio(1, 'a')])
                      });
                      setModalCenso(true);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition shadow-md shadow-blue-600/30"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nueva Planilla de Censo</span>
                </button>
              )}
            </div>

            {/* Panel de Integración #vecinos ↔ #censo (Vecinos Pendientes de Aprobación o sin Planilla) */}
            {vecinosCenso.length > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-amber-500/30 shadow-lg space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                        <span>Vecinos Registrados en #vecinos y su Vinculación con Planillas de #censo</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {vecinosCenso.filter((v) => v.estado_aprobacion === 'PENDIENTE').length} pendiente(s) de aprobación
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Si un integrante se registró en el portal (aunque no sea el dueño de la vivienda), el sistema lo vincula con la planilla de su casa <strong className="text-slate-200">sin duplicarlo</strong> para que el transcriptor verifique su parentesco y complete datos faltantes.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {vecinosCenso.map((vc) => (
                    <div
                      key={vc.id}
                      className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 transition ${
                        vc.estado_aprobacion === 'PENDIENTE'
                          ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/50'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                          <span className="font-mono text-[11px] font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-750">
                            Vereda {vc.vereda} · Casa {vc.casa}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              vc.estado_aprobacion === 'PENDIENTE'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {vc.estado_aprobacion === 'PENDIENTE' ? '⏳ PENDIENTE EN #VECINOS' : '✅ APROBADO EN #VECINOS'}
                          </span>
                        </div>

                        <div className="text-xs font-bold text-white pt-0.5">{vc.nombre_completo}</div>
                        <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="font-mono text-slate-300">{vc.cedula}</span>
                          <span>• Declaró: <strong className="text-amber-300">{vc.parentesco_declarado}</strong></span>
                          {vc.telefono && <span>• Tel: {vc.telefono}</span>}
                        </div>

                        <div className="pt-1">
                          {vc.planilla_id ? (
                            vc.ya_en_planilla ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                <Check className="w-3 h-3" />
                                Ya está en Planilla {vc.numero_planilla} (No se duplica)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                                <Plus className="w-3 h-3" />
                                Se anexará a Planilla {vc.numero_planilla} al abrirla
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              Casa {vc.casa} aún sin Planilla en #censo
                            </span>
                          )}
                        </div>
                      </div>

                      {user?.rol !== 'CONTRALORIA' && (
                        <button
                          type="button"
                          onClick={() => abrirPlanillaPorVivienda(vc.vereda, vc.casa)}
                          className="w-full py-1.5 px-2.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/35 text-blue-300 border border-blue-500/30 text-[11px] font-bold transition flex items-center justify-center gap-1.5"
                        >
                          <Edit className="w-3 h-3" />
                          <span>
                            {vc.planilla_id
                              ? `Abrir Planilla ${vc.numero_planilla} y Ajustar Datos`
                              : `Crear Planilla de Casa ${vc.casa} con este Vecino`}
                          </span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Listado de Planillas de Censo */}
            {planillasCenso.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-400">
                <ClipboardList className="w-12 h-12 text-blue-400 mx-auto mb-3 opacity-60" />
                <h3 className="text-base font-bold text-white mb-1">Aún no hay planillas registradas</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                  Registra la primera vivienda con sus respectivos núcleos familiares y habitantes.
                </p>
                {user?.rol !== 'CONTRALORIA' && (
                  <button
                    onClick={async () => {
                      const res = await fetch('/api/censo?proximo_numero=1').then(r => r.json()).catch(() => ({}));
                      const nextNum = res.sugerido || generarNumeroPlanillaAlfanumericoClient();
                      setNumeroPlanillaModal(nextNum);
                      toast.info(`Número de planilla asignado: ${nextNum}. Recuerde anotarlo en la planilla física.`);
                      setPlanillaActiva({
                        planilla: {
                          numero_planilla: nextNum,
                          fecha: new Date().toISOString().split('T')[0],
                          empadronador_nombre: user?.nombre || '',
                          calle_vereda_av: 'A',
                          numero_casa: '',
                          telefono_contacto: '',
                          tenencia_vivienda: 'Propia',
                          total_familias: 1,
                          total_habitantes: 1,
                        },
                        habitantes: normalizarHabitantesParaFormulario([crearHabitanteVacio(1, 'a')])
                      });
                      setModalCenso(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-1.5 mx-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Crear Planilla</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {planillasCenso.map((p) => (
                  <div key={p.id} className="p-5 rounded-2xl glass-panel relative border border-slate-800 hover:border-blue-500/30 transition flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                        <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                          PLANILLA N° {p.numero_planilla}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {p.vecinos_pendientes_count > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              ⏳ {p.vecinos_pendientes_count} pend. en #vecinos
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400">{p.fecha}</span>
                        </div>
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
                          const habsNorm = normalizarHabitantesParaFormulario(res?.habitantes || []);
                          setNumeroPlanillaModal(res?.planilla?.numero_planilla || p.numero_planilla);
                          setPlanillaActiva({
                            planilla: {
                              ...(res?.planilla || p),
                              total_habitantes: habsNorm.length,
                            },
                            habitantes: habsNorm,
                            vecinos_casa: res?.vecinos_casa || [],
                          });
                          setModalCenso(true);
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-blue-600/15 hover:bg-blue-600/30 text-blue-300 border border-blue-500/20 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Ver / {user?.rol === 'CONTRALORIA' ? 'Detalle' : 'Editar'}</span>
                      </button>

                      {user?.rol === 'SUPER_ADMIN' && (
                        <button
                          onClick={async () => {
                            if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente la Planilla N° ${p.numero_planilla} (Vereda ${p.calle_vereda_av}, Casa ${p.numero_casa}) y todos sus habitantes? Esta acción solo puede realizarla el SUPER_ADMIN.`)) {
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
                          title="Eliminar Planilla (Exclusivo SUPER_ADMIN)"
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

        {/* TAB: APORTES COMUNITARIOS Y RECAUDACIÓN (UAFC - LOCC 2023) */}
        {currentTab === 'pagos' && checkPermiso('pagos') && (() => {
          const todosLosAportes = documentos.filter(d => 
            Number(d.monto_bs) > 0 || d.numero_transferencia || d.es_exonerado
          );
          const aportesPagados = documentos.filter(d => 
            !d.es_exonerado && (Number(d.monto_bs) > 0 || d.numero_transferencia)
          );
          const aportesExonerados = documentos.filter(d => Boolean(d.es_exonerado));

          const totalRecaudadoBs = aportesPagados.reduce((acc, d) => acc + (Number(d.monto_bs) || 0), 0);
          const totalRecaudadoUsd = aportesPagados.reduce((acc, d) => acc + (Number(d.monto_usd) || 0), 0);

          // Métricas de Servicios y Jornadas (Gas)
          const totalServiciosBs = solicitudesJornada.reduce((acc, s) => acc + (Number(s.monto_total_bs) || 0), 0);
          const totalServiciosUsd = solicitudesJornada.reduce((acc, s) => acc + (Number(s.monto_total_usd) || 0), 0);
          const totalUnidadesGas = solicitudesJornada.reduce((acc, s) => acc + (Number(s.total_unidades) || 0), 0);

          let conteo10Kg = 0;
          let conteo18Kg = 0;
          let conteo43Kg = 0;
          solicitudesJornada.forEach(s => {
            try {
              const items = JSON.parse(s.items_json || '[]');
              items.forEach(it => {
                const nom = (it.nombre || '').toLowerCase();
                const cant = Number(it.cantidad) || 0;
                if (nom.includes('10')) conteo10Kg += cant;
                else if (nom.includes('18')) conteo18Kg += cant;
                else if (nom.includes('43')) conteo43Kg += cant;
              });
            } catch (e) {}
          });

          const solicitudesFiltradasServicios = solicitudesJornada.filter(s => {
            if (filtroServicioEstado !== 'TODOS' && s.estado !== filtroServicioEstado) return false;
            if (filtroServicioBusqueda) {
              const q = filtroServicioBusqueda.toLowerCase();
              const str = `${s.cedula || ''} ${s.nombres_apellidos || ''} ${s.vereda || ''} ${s.casa || ''} ${s.telefono || ''} ${s.numero_referencia || ''} ${s.banco_origen || ''}`.toLowerCase();
              if (!str.includes(q)) return false;
            }
            return true;
          });

          const aportesFiltrados = todosLosAportes.filter(doc => {
            if (filtroPagoTipo === 'APORTE' && doc.es_exonerado) return false;
            if (filtroPagoTipo === 'EXONERADO' && !doc.es_exonerado) return false;
            if (filtroPagoDoc && doc.tipo_documento !== filtroPagoDoc) return false;
            if (filtroPagoBusqueda) {
              const q = filtroPagoBusqueda.toLowerCase();
              const str = `${doc.solicitante_nombre || ''} ${doc.nombres || ''} ${doc.apellidos || ''} ${doc.cedula || ''} ${doc.solicitante_cedula || ''} ${doc.numero_transferencia || ''} ${doc.banco_nombre || ''} ${doc.codigo_qr || ''}`.toLowerCase();
              if (!str.includes(q)) return false;
            }
            return true;
          });

          return (
            <div className="space-y-5 animate-in fade-in">
              {/* Encabezado Principal */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg sm:text-2xl font-extrabold text-white flex items-center gap-2">
                      <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                      Aportes Comunitarios y Recaudación
                    </h1>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      UAFC · LOCC 2023
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                    Autogestión comunitaria, rendición de cuentas y exoneraciones sociales (Art. 24, 30 y 51 de la Ley Orgánica de los Consejos Comunales).
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      cargarDocumentos();
                      cargarJornadas();
                      if (jornadaSeleccionadaId) cargarSolicitudesJornada(jornadaSeleccionadaId);
                      toast.success('Datos de recaudación actualizados');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                    <span>Actualizar</span>
                  </button>
                  {pagosSubTab === 'documentos' ? (
                    <button
                      onClick={exportarAportesCsv}
                      className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Exportar CSV</span>
                    </button>
                  ) : (
                    <button
                      onClick={exportarServiciosCsv}
                      className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-md shadow-amber-500/20 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Exportar Despacho (CSV)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Selector de Subpestañas de Recaudación */}
              <div className="flex border-b border-slate-800 gap-2">
                <button
                  type="button"
                  onClick={() => setPagosSubTab('documentos')}
                  className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition flex items-center gap-2 border-b-2 ${
                    pagosSubTab === 'documentos'
                      ? 'border-emerald-500 text-emerald-400 bg-slate-900/90'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Aportes por Trámites y Constancias</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                    {todosLosAportes.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPagosSubTab('servicios')}
                  className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition flex items-center gap-2 border-b-2 ${
                    pagosSubTab === 'servicios'
                      ? 'border-amber-500 text-amber-400 bg-slate-900/90'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  <Flame className="w-4 h-4" />
                  <span>Aportes de Servicios y Jornadas (Gas)</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {solicitudesJornada.length}
                  </span>
                </button>
              </div>

              {/* VISTA 1: APORTES POR TRÁMITES Y CONSTANCIAS */}
              {pagosSubTab === 'documentos' && (
                <div className="space-y-4">
                  {/* Tarjetas de Indicadores Financieros (KPIs) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Total en Bolívares */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-750 transition shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400">Total Recaudado</span>
                    <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">
                    Bs. {totalRecaudadoBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                    <span>Equiv. en Divisas:</span>
                    <strong className="text-slate-200">${totalRecaudadoUsd.toFixed(2)} USD</strong>
                  </div>
                </div>

                {/* Tasa Oficial BCV */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-750 transition shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400">Tasa Oficial BCV</span>
                    <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
                      <Globe className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Bs. {Number(tasaBcv).toFixed(2)}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                    <span>Banco Central de Vzla:</span>
                    <strong className="text-emerald-400">Referencia Legal</strong>
                  </div>
                </div>

                {/* Trámites con Aporte Realizado */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-750 transition shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400">Aportes Declarados</span>
                    <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                      <FileCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-amber-300 tracking-tight">
                    {aportesPagados.length} <span className="text-xs font-normal text-slate-400">trámites</span>
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                    <span>Colaboraciones:</span>
                    <strong className="text-slate-200">Autogestión UAFC</strong>
                  </div>
                </div>

                {/* Exoneraciones Sociales 100% Gratuitas */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-750 transition shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400">Exoneraciones Sociales</span>
                    <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-purple-300 tracking-tight">
                    {aportesExonerados.length} <span className="text-xs font-normal text-slate-400">familias</span>
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                    <span>Principio:</span>
                    <strong className="text-purple-300">100% Gratuito</strong>
                  </div>
                </div>
              </div>

              {/* Barra de Filtros y Búsqueda */}
              <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row gap-2.5 sm:gap-3 items-stretch md:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    value={filtroPagoBusqueda}
                    onChange={(e) => setFiltroPagoBusqueda(e.target.value)}
                    placeholder="Buscar por cédula, nombre de solicitante, referencia..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={filtroPagoTipo}
                    onChange={(e) => setFiltroPagoTipo(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="TODOS">Todos los Trámites</option>
                    <option value="APORTE">Solo Aportes Declarados</option>
                    <option value="EXONERADO">Solo Exoneraciones Sociales</option>
                  </select>

                  <select
                    value={filtroPagoDoc}
                    onChange={(e) => setFiltroPagoDoc(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Cualquier Constancia</option>
                    <option value="RESIDENCIA">Constancia de Residencia</option>
                    <option value="BUENA_CONDUCTA">Carta de Buena Conducta</option>
                    <option value="FALLECIMIENTO">Constancia de Fallecimiento</option>
                    <option value="FUNCIONAMIENTO">Constancia de Funcionamiento</option>
                  </select>
                </div>
              </div>

              {/* ESTADO VACÍO PROMINENTE CUANDO NO HAY APORTES REGISTRADOS */}
              {aportesFiltrados.length === 0 ? (
                <div className="p-6 sm:p-10 rounded-3xl bg-slate-900/40 border border-slate-800/80 text-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10 mx-auto mb-4 animate-pulse-subtle">
                    <DollarSign className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400" />
                  </div>
                  
                  <h3 className="text-base sm:text-xl font-extrabold text-white">
                    A la espera de declaración de aportes comunitarios
                  </h3>
                  
                  <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto mt-1.5 leading-relaxed">
                    Actualmente no se registran aportes de recaudación comunitaria ni pagos asociados a solicitudes de constancias en el sistema. Los registros aparecerán automáticamente cuando los vecinos tramiten constancias con aporte o cuando se aprueben solicitudes.
                  </p>

                  {/* Tarjetas informativas de respaldo institucional */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8 text-left max-w-4xl mx-auto">
                    <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-750 transition">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs font-bold text-white">Fondo de Autogestión (LOCC 2023)</h4>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Conforme al <strong>Art. 51 Numeral 3</strong> de la Ley Orgánica de los Consejos Comunales (2023), los aportes por tramitación ingresan a la Unidad Administrativa y Financiera Comunitaria (UAFC) para cubrir gastos de impresión, papelería y conectividad del Consejo Comunal.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-750 transition">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                          <Store className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs font-bold text-white">Coordenadas de Pago Oficial</h4>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Banco oficial receptor: <strong>Banco de Venezuela (0102)</strong> · Titular: <strong>Consejo Comunal Dr. Alfredo Travieso Paúl - Las Llaves</strong> · RIF: <strong>C-299916862</strong>. Disponible mediante Pago Móvil y Transferencia Bancaria autorizada por Asamblea.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-750 transition">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs font-bold text-white">Exoneración Social 100% Gratuita</h4>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Los vecinos <strong>Adultos Mayores, personas con discapacidad o condiciones crónicas de salud</strong> y trámites de defunción/escolares gozan de exoneración total del aporte, garantizando el acceso universal a sus certificaciones sin costo.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-750 transition">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                          <Globe className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs font-bold text-white">Transparencia y Tasa Oficial BCV</h4>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Cálculo exacto a la tasa del <strong>Banco Central de Venezuela (BCV Oficial: Bs. {Number(tasaBcv).toFixed(2)})</strong>. Toda transacción cuenta con trazabilidad inalterable en la bitácora de auditoría para la Contraloría Social.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* TABLA DE APORTES COMUNITARIOS CUANDO EXISTEN REGISTROS */
                <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/60 shadow-lg">
                  <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">
                      Mostrando {aportesFiltrados.length} aporte(s) comunitario(s)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Total listado: Bs. {aportesFiltrados.filter(d => !d.es_exonerado).reduce((acc, d) => acc + (Number(d.monto_bs) || 0), 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-3 sm:px-4">Fecha</th>
                          <th className="py-3 px-3 sm:px-4">Solicitante</th>
                          <th className="py-3 px-3 sm:px-4">Trámite / Constancia</th>
                          <th className="py-3 px-3 sm:px-4">Banco Origen</th>
                          <th className="py-3 px-3 sm:px-4">N° Transferencia / Ref</th>
                          <th className="py-3 px-3 sm:px-4 text-right">Aporte (Bs / USD)</th>
                          <th className="py-3 px-3 sm:px-4 text-center">Estado</th>
                          <th className="py-3 px-3 sm:px-4 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {aportesFiltrados.map((doc) => {
                          const solicitante = doc.solicitante_nombre || `${doc.nombres || ''} ${doc.apellidos || ''}`.trim() || 'Vecino';
                          const cedula = doc.solicitante_cedula || doc.cedula || 'N/A';
                          return (
                            <tr key={`pago_${doc.id || doc.codigo_qr}`} className="hover:bg-slate-900/50 transition">
                              <td className="py-3 px-3 sm:px-4 whitespace-nowrap text-slate-300">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                  <span>{doc.fecha_pago || doc.created_at?.split('T')[0] || 'N/A'}</span>
                                </div>
                              </td>

                              <td className="py-3 px-3 sm:px-4">
                                <div className="font-bold text-white">{solicitante}</div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                  <span>{cedula}</span>
                                  {doc.vereda && (
                                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                                      Vereda {doc.vereda} - {doc.casa}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                                <span className="font-semibold text-slate-200 block">
                                  {doc.tipo_documento?.replace(/_/g, ' ')}
                                </span>
                                <span className="text-[10px] text-blue-400 font-mono">
                                  {doc.codigo_qr}
                                </span>
                              </td>

                              <td className="py-3 px-3 sm:px-4 text-slate-300 whitespace-nowrap">
                                {doc.banco_nombre || 'N/A'}
                              </td>

                              <td className="py-3 px-3 sm:px-4 font-mono text-slate-300 whitespace-nowrap">
                                {doc.numero_transferencia ? (
                                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300">
                                    {doc.numero_transferencia}
                                  </span>
                                ) : (
                                  <span className="text-slate-500">N/A</span>
                                )}
                              </td>

                              <td className="py-3 px-3 sm:px-4 text-right whitespace-nowrap">
                                {doc.es_exonerado ? (
                                  <div>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                      100% Exonerado
                                    </span>
                                    <div className="text-[9px] text-slate-400 mt-0.5">{doc.motivo_exoneracion || 'Caso Social'}</div>
                                  </div>
                                ) : (
                                  <div>
                                    <span className="font-bold text-emerald-400">
                                      Bs. {Number(doc.monto_bs || 0).toFixed(2)}
                                    </span>
                                    <div className="text-[10px] text-slate-400">
                                      ${Number(doc.monto_usd || 1).toFixed(2)} USD
                                    </div>
                                  </div>
                                )}
                              </td>

                              <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  doc.estado === 'EMITIDO' || doc.estado === 'APROBADO'
                                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                    : doc.estado === 'REVOCADO'
                                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                }`}>
                                  {doc.estado || 'REGISTRADO'}
                                </span>
                              </td>

                              <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      window.open(`/#validar?codigo=${doc.codigo_qr}`, '_blank');
                                    }}
                                    title="Ver en Validador QR"
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      let plant = plantillas.find((p) => p.id === doc.tipo_documento);
                                      if (!plant) {
                                        try {
                                          const resPl = await fetch(`/api/modelador?id=${encodeURIComponent(doc.tipo_documento)}`);
                                          const dataPl = await resPl.json();
                                          plant = dataPl.plantilla;
                                        } catch (e) {}
                                      }
                                      await generarDocumentoPdf({
                                        documento: doc,
                                        firmas,
                                        config,
                                        plantilla: plant,
                                      });
                                    }}
                                    title="Descargar Constancia Oficial PDF"
                                    className="p-1.5 rounded-lg bg-blue-600/15 hover:bg-blue-600/30 text-blue-400 border border-blue-500/20 transition"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                  {user?.rol === 'SUPER_ADMIN' && (
                                    <>
                                      <button
                                        onClick={() => setDocumentoEditando(doc)}
                                        title="Editar Registro del Documento"
                                        className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-400 border border-amber-500/20 transition"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => eliminarDocumento(doc)}
                                        title="Eliminar Documento Permanentemente"
                                        className="p-1.5 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 transition"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
                </div>
              )}

              {/* VISTA 2: APORTES DE SERVICIOS Y JORNADAS (GAS COMUNAL) */}
              {pagosSubTab === 'servicios' && (
                <div className="space-y-4">
                  {/* Selector de Jornada y Acciones */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                        <Flame className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] font-extrabold uppercase text-amber-400 tracking-wider">
                          Jornada Comunitaria Seleccionada
                        </div>
                        {jornadas.length > 0 ? (
                          <select
                            value={jornadaSeleccionadaId}
                            onChange={(e) => {
                              setJornadaSeleccionadaId(e.target.value);
                              cargarSolicitudesJornada(e.target.value);
                            }}
                            className="bg-transparent font-bold text-sm text-white focus:outline-none cursor-pointer mt-0.5"
                          >
                            {jornadas.map((j) => (
                              <option key={j.id} value={j.id} className="bg-slate-900 text-white">
                                {j.titulo} ({j.estado}) · Límite: Máx {j.max_unidades_por_familia} unid/familia
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="text-xs text-slate-400 mt-0.5">No hay jornadas creadas todavía</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {user?.rol === 'SUPER_ADMIN' && (
                        <button
                          type="button"
                          onClick={() => {
                            setConfigSubTab('gas');
                            navigateTo('configuracion');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-bold flex items-center gap-1.5 border border-amber-500/30 transition shadow-sm"
                        >
                          <Flame className="w-3.5 h-3.5 text-amber-400" />
                          <span>⚙️ Precios y Cilindros de Gas</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          cargarJornadas();
                          if (jornadaSeleccionadaId) cargarSolicitudesJornada(jornadaSeleccionadaId);
                          toast.success('Datos de la jornada actualizados');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                        <span>Actualizar</span>
                      </button>
                      <button
                        type="button"
                        onClick={exportarServiciosCsv}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Exportar Despacho (CSV)</span>
                      </button>
                    </div>
                  </div>

                  {/* Indicadores Físicos y Financieros de la Jornada */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-400">Total Recaudado Jornada</span>
                        <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                          <DollarSign className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">
                        Bs. {totalServiciosBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                        <span>Equiv. Total USD:</span>
                        <strong className="text-slate-200">${totalServiciosUsd.toFixed(2)} USD</strong>
                      </div>
                    </div>

                    <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-400">Total Bombonas Solicitadas</span>
                        <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                          <Flame className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-amber-400 tracking-tight">
                        {totalUnidadesGas} Unidades
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                        <span>Familias Declarantes:</span>
                        <strong className="text-white">{solicitudesJornada.length} hogares</strong>
                      </div>
                    </div>

                    <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-400">Distribución por Cilindro</span>
                        <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
                          <Layers className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">10kg: {conteo10Kg}</span>
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">18kg: {conteo18Kg}</span>
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">43kg: {conteo43Kg}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Cálculo para camión distribuidor
                      </div>
                    </div>

                    <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-400">Tasa Oficial y Autogestión</span>
                        <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-base sm:text-lg font-black text-white tracking-tight">
                        Bs. {Number(tasaBcv).toFixed(2)} / $
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Incluye alícuota comunal (Art. 51 LOCC)
                      </div>
                    </div>
                  </div>

                  {/* Barra de Filtros de Servicios */}
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                      <input
                        type="text"
                        value={filtroServicioBusqueda}
                        onChange={(e) => setFiltroServicioBusqueda(e.target.value)}
                        placeholder="Buscar por cédula, nombre de vecino, vereda, casa, referencia..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <select
                      value={filtroServicioEstado}
                      onChange={(e) => setFiltroServicioEstado(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="TODOS">Todos los Estados</option>
                      <option value="DECLARADO">Solo Declarados (Pendientes)</option>
                      <option value="VERIFICADO">Solo Verificados (Pago Confirmado)</option>
                      <option value="ENTREGADO">Solo Entregados (Despachados)</option>
                    </select>
                  </div>

                  {/* Tabla o Estado Vacío */}
                  {solicitudesFiltradasServicios.length === 0 ? (
                    <div className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800/80 text-center">
                      <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-4">
                        <Flame className="w-8 h-8 text-amber-400" />
                      </div>
                      <h3 className="text-base font-extrabold text-white">
                        A la espera de declaraciones de aportes para esta jornada
                      </h3>
                      <p className="text-xs text-slate-400 max-w-lg mx-auto mt-1 leading-relaxed">
                        Los vecinos censados que declaren su pago de bombonas de gas mediante la web pública aparecerán listados aquí en tiempo real para verificación de pago y entrega física de cilindros.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/60 shadow-lg">
                      <div className="p-3 border-b border-slate-800 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-300">
                          Mostrando {solicitudesFiltradasServicios.length} declaración(es) de aporte
                        </span>
                        <span className="text-slate-400">
                          Total Unidades: {solicitudesFiltradasServicios.reduce((acc, s) => acc + (Number(s.total_unidades) || 0), 0)} bombonas
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[10px] tracking-wider">
                            <tr>
                              <th className="py-3 px-3">Fecha</th>
                              <th className="py-3 px-3">Vecino / Solicitante</th>
                              <th className="py-3 px-3">Ubicación</th>
                              <th className="py-3 px-3">Cilindros / Ítems</th>
                              <th className="py-3 px-3 text-right">Aporte Total</th>
                              <th className="py-3 px-3">Referencia / Pago</th>
                              <th className="py-3 px-3 text-center">Estado</th>
                              <th className="py-3 px-3 text-center">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850">
                            {solicitudesFiltradasServicios.map((sol) => {
                              let items = [];
                              try {
                                items = JSON.parse(sol.items_json || '[]');
                              } catch (e) {}

                              return (
                                <tr key={`sol_${sol.id}`} className="hover:bg-slate-900/50 transition">
                                  <td className="py-3 px-3 whitespace-nowrap text-slate-300">
                                    <div className="flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                      <span>{sol.created_at?.split('T')[0] || 'N/A'}</span>
                                    </div>
                                  </td>

                                  <td className="py-3 px-3">
                                    <div className="font-bold text-white">{sol.nombres_apellidos}</div>
                                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                      <span className="font-mono">{sol.cedula}</span>
                                      {sol.telefono && (
                                        <span>· Tel: {sol.telefono}</span>
                                      )}
                                    </div>
                                  </td>

                                  <td className="py-3 px-3 whitespace-nowrap">
                                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-medium">
                                      Vereda {sol.vereda} - Casa {sol.casa}
                                    </span>
                                  </td>

                                  <td className="py-3 px-3">
                                    <div className="flex flex-wrap gap-1">
                                      {items.map((it, idx) => (
                                        <span
                                          key={idx}
                                          className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                        >
                                          {it.cantidad}x {it.nombre}
                                        </span>
                                      ))}
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-1 font-semibold">
                                      Total: {sol.total_unidades} unidad(es)
                                    </div>
                                  </td>

                                  <td className="py-3 px-3 text-right whitespace-nowrap">
                                    <div className="font-bold text-emerald-400">
                                      Bs. {Number(sol.monto_total_bs).toFixed(2)}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      ${Number(sol.monto_total_usd).toFixed(2)} USD
                                    </div>
                                  </td>

                                  <td className="py-3 px-3">
                                    <div className="font-mono text-white text-[11px] font-bold">
                                      Ref: {sol.numero_referencia || 'N/A'}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      {sol.banco_origen || 'Pago Móvil / Transf.'}
                                    </div>
                                  </td>

                                  <td className="py-3 px-3 text-center whitespace-nowrap">
                                    <select
                                      value={sol.estado}
                                      onChange={(e) => cambiarEstadoSolicitudServicio(sol.id, e.target.value)}
                                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer focus:outline-none transition ${
                                        sol.estado === 'ENTREGADO'
                                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                          : sol.estado === 'VERIFICADO'
                                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                      }`}
                                    >
                                      <option value="DECLARADO" className="bg-slate-900 text-amber-300">🟡 Declarado</option>
                                      <option value="VERIFICADO" className="bg-slate-900 text-blue-300">🔵 Verificado</option>
                                      <option value="ENTREGADO" className="bg-slate-900 text-emerald-300">🟢 Entregado</option>
                                    </select>
                                  </td>

                                  <td className="py-3 px-3 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => setReciboModalServicio(sol)}
                                        className="p-1.5 rounded-lg bg-blue-600/15 hover:bg-blue-600/30 text-blue-400 border border-blue-500/20 transition"
                                        title="Ver Comprobante Digital"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                      {user?.rol === 'SUPER_ADMIN' && (
                                        <button
                                          type="button"
                                          onClick={() => eliminarSolicitudServicio(sol)}
                                          className="p-1.5 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 transition"
                                          title="Eliminar Declaración de Servicio"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

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

            {/* Aviso informativo de vinculación con reportes estadísticos y documentos */}
            <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30 flex items-start gap-3 text-xs text-blue-200">
              <Sparkles className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-white block">
                  Asignación Dinámica de Firmantes para Documentos y Reportes Estadísticos
                </span>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Todos los voceros y cargos agregados en esta sección (incluyendo la firma del Administrador del Sistema con su PNG transparente y sellos) quedan disponibles en el sistema para ser asignados individualmente al firmar los documentos legales y los <strong>Informes Estadísticos de Gestión Comunal en PDF (#estadisticas)</strong>.
                </p>
              </div>
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
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-white">Modelador de Plantillas Documentales</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Cabecera y Footer Únicos Unificados
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gestión centralizada con <strong>1 sola Cabecera de Documentos</strong> y <strong>1 solo Footer de Documentos</strong> para todas las constancias comunales (Ley Orgánica de los Consejos Comunales 2023)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/archivo/Ley_Organica_Consejos_Comunales_2023.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 transition"
                >
                  <FileText className="w-4 h-4 text-amber-400" /> Ley Orgánica C.C. 2023
                </a>
                {plantillaSeleccionada && (
                  <>
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
                  </>
                )}
              </div>
            </div>

            {/* Pestañas Principales del Modelador: Cabecera de Documentos (Única), Footer de Documentos (Único), Redacción Legal y Vista Previa */}
            <div className="flex flex-wrap items-center gap-2.5 p-2 rounded-2xl bg-slate-900/90 border border-slate-800">
              <button
                onClick={() => setModeladorSubTab('cabecera')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  modeladorSubTab === 'cabecera'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Cabecera de Documentos</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                  modeladorSubTab === 'cabecera' ? 'bg-white/20 text-white' : 'bg-blue-500/15 text-blue-400'
                }`}>
                  Única
                </span>
              </button>

              <button
                onClick={() => setModeladorSubTab('pie')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  modeladorSubTab === 'pie'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Footer de Documentos</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                  modeladorSubTab === 'pie' ? 'bg-white/20 text-white' : 'bg-emerald-500/15 text-emerald-400'
                }`}>
                  Único
                </span>
              </button>

              <button
                onClick={() => setModeladorSubTab('cuerpo')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  modeladorSubTab === 'cuerpo'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Redacción Legal por Documento</span>
              </button>

              <button
                onClick={() => setModeladorSubTab('previsualizacion')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  modeladorSubTab === 'previsualizacion'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>Vista Previa Hoja Completa</span>
              </button>
            </div>

            {/* Subtab 1: Cabecera de Documentos (ÚNICA PARA TODOS LOS DOCUMENTOS) */}
            {modeladorSubTab === 'cabecera' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-blue-950/30 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2.5 text-blue-200">
                    <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
                    <span>
                      <strong>Cabecera de Documentos Única:</strong> Esta cabecera institucional es global y se utiliza exactamente igual en <strong>todos los documentos y constancias</strong> emitidos por el Consejo Comunal.
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20 shrink-0">
                    Aplica a {plantillas.length || 4} plantillas activas
                  </span>
                </div>

                <SvgCanvasEditor
                  key="cabecera-documentos-unica-global"
                  mode="header"
                  initialData={cabeceraUnicaSvg}
                  onSave={guardarCabeceraUnica}
                  title="Cabecera de Documentos (Única para Todos los Documentos)"
                />
              </div>
            )}

            {/* Subtab 2: Footer de Documentos (ÚNICO PARA TODOS LOS DOCUMENTOS) */}
            {modeladorSubTab === 'pie' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2.5 text-emerald-200">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>
                      <strong>Footer de Documentos Único:</strong> Este pie de página y bloque de validación QR es global y se utiliza exactamente igual en <strong>todos los documentos y constancias</strong> del Consejo Comunal.
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 shrink-0">
                    Aplica a {plantillas.length || 4} plantillas activas
                  </span>
                </div>

                <SvgCanvasEditor
                  key="footer-documentos-unico-global"
                  mode="footer"
                  initialData={footerUnicoSvg}
                  onSave={guardarFooterUnico}
                  title="Footer de Documentos (Único para Todos los Documentos)"
                />
              </div>
            )}

            {/* Selector de Documento para Redacción Legal y Vista Previa */}
            {(modeladorSubTab === 'cuerpo' || modeladorSubTab === 'previsualizacion') && (
              <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">
                    Selecciona el Documento para editar su Redacción Legal o ver su Vista Previa (conservando la misma Cabecera y Footer únicos):
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  {plantillas.map((p) => (
                    <div key={p.id} className="relative group">
                      <button
                        onClick={() => setPlantillaSeleccionada(p)}
                        className={`px-4 py-2.5 rounded-2xl text-left transition border ${
                          plantillaSeleccionada?.id === p.id
                            ? 'bg-blue-600/20 border-blue-500 text-white font-bold shadow-md shadow-blue-600/20'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
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
                          cuerpo_template: 'Quienes suscriben, voceras y voceros integrantes del Colectivo de Gobierno Comunal, la Unidad Ejecutiva y la Comisión Electoral del Consejo Comunal de la Urbanización Dr. Alfredo Travieso Paúl "LAS LLAVES", en ejercicio de las atribuciones conferidas en los artículos 18, 23, 25 y 34 numeral 19 de la Ley Orgánica de los Consejos Comunales (Reforma 2023), por medio de la presente hacemos constar que la ciudadana o ciudadano: {nombre_completo}, titular de la cédula de identidad N°: {cedula}, es habitante de nuestra comunidad en la Vereda {vereda}, Casa N° {casa}, según consta en el Censo Demográfico Comunal.\n\nConstancia que se expide a solicitud de la parte interesada, en la ciudad de Puerto Cabello, a los {dias} días del mes de {mes} del año {ano}.',
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
              </div>
            )}

            {/* Subtab 3: Cuerpo Legal & Redacción por Documento */}
            {modeladorSubTab === 'cuerpo' && plantillaSeleccionada && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-blue-400 font-bold">Plantilla Seleccionada: {plantillaSeleccionada.id}</span>
                      <h3 className="text-sm font-bold text-white">{plantillaSeleccionada.titulo}</h3>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Usa la <strong>Cabecera de Documentos</strong> y <strong>Footer de Documentos</strong> únicos
                    </span>
                  </div>

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
                      placeholder="Ej: NRO: {codigo_qr}"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Cuerpo Legal y Redacción (Adaptado a la Ley Orgánica de los Consejos Comunales 2023)
                    </label>
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
                  <p className="text-[11px] text-slate-400">Inserta estas etiquetas en el texto para que se reemplacen automáticamente con los datos del habitante al emitir:</p>
                  <div className="space-y-1.5 pt-2">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800"><code className="text-blue-400 font-mono font-bold">{'{nombre_completo}'}</code> - Nombres y apellidos</div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800"><code className="text-blue-400 font-mono font-bold">{'{cedula}'}</code> - Cédula con formato</div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800"><code className="text-blue-400 font-mono font-bold">{'{vereda}'}</code> - Vereda de residencia</div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800"><code className="text-blue-400 font-mono font-bold">{'{casa}'}</code> - Número de casa</div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800"><code className="text-blue-400 font-mono font-bold">{'{tiempo_residencia}'}</code> - Años viviendo en la comunidad</div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800"><code className="text-blue-400 font-mono font-bold">{'{codigo_qr}'}</code> - Código alfanumérico único</div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800"><code className="text-blue-400 font-mono font-bold">{'{dias}'}</code>, <code className="text-blue-400 font-mono">{'{mes}'}</code>, <code className="text-blue-400 font-mono">{'{ano}'}</code> - Fecha actual</div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <span className="font-bold text-amber-400 block">Base Legal LOCC (Gaceta 2023):</span>
                    <p>• <strong>Art. 18:</strong> Instancias del Consejo Comunal (Asamblea de Ciudadanas y Ciudadanos, Colectivo de Gobierno Comunal, Unidad Ejecutiva, Unidad Administrativa y Financiera Comunitaria, Unidad de Contraloría Social y Comisión Electoral).</p>
                    <p>• <strong>Art. 34 num. 19 y 20:</strong> Emisión de constancias de residencia y actualización del Censo Demográfico Comunal.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Subtab 4: Previsualización de Hoja Completa (Con Cabecera Única y Footer Único) */}
            {modeladorSubTab === 'previsualizacion' && plantillaSeleccionada && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs text-slate-300">
                    Vista previa en tamaño Carta unificando la <strong>Cabecera de Documentos única</strong>, la redacción de <strong>{plantillaSeleccionada.titulo}</strong>, las firmas autorizadas y el <strong>Footer de Documentos único</strong>.
                  </span>
                  <button
                    onClick={() => descargarMuestraPdf(plantillaSeleccionada)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition shrink-0"
                  >
                    <Download className="w-4 h-4" /> Generar y Descargar PDF
                  </button>
                </div>

                <div className="flex justify-center p-6 bg-slate-950 rounded-3xl border border-slate-800 overflow-x-auto">
                  <div className="w-[680px] min-h-[850px] bg-white text-slate-900 p-10 shadow-2xl rounded-lg font-serif relative flex flex-col justify-between">
                    {/* Cabecera Única de Documentos Renderizada */}
                    <div>
                      {(() => {
                        let parsedHeader = null;
                        try {
                          if (cabeceraUnicaSvg) {
                            parsedHeader = typeof cabeceraUnicaSvg === 'string' ? JSON.parse(cabeceraUnicaSvg) : cabeceraUnicaSvg;
                          }
                        } catch (e) {}

                        if (parsedHeader && (parsedHeader.textos?.length > 0 || parsedHeader.imagenes?.length > 0)) {
                          const hHeight = parsedHeader.height || 180;
                          const headerLayers = [];
                          if (parsedHeader.mostrarLineaDivisoria !== false) {
                            headerLayers.push({
                              id: '__shape_linea_divisoria__',
                              layerType: 'shape',
                              zIndex: typeof parsedHeader.fondoZIndex === 'number' ? parsedHeader.fondoZIndex : 0,
                            });
                          }
                          (parsedHeader.imagenes || []).forEach((img, idx) => {
                            if (img.visible !== false) {
                              headerLayers.push({
                                id: img.id,
                                layerType: 'image',
                                zIndex: typeof img.zIndex === 'number' ? img.zIndex : (idx + 1) * 10,
                                raw: img,
                              });
                            }
                          });
                          (parsedHeader.textos || []).forEach((t, idx) => {
                            if (t.visible !== false) {
                              headerLayers.push({
                                id: t.id,
                                layerType: 'text',
                                zIndex: typeof t.zIndex === 'number' ? t.zIndex : 100 + (idx + 1) * 10,
                                raw: t,
                              });
                            }
                          });
                          headerLayers.sort((a, b) => a.zIndex - b.zIndex);

                          return (
                            <div className="mb-6">
                              <svg
                                viewBox={`0 0 750 ${hHeight}`}
                                className="w-full h-auto"
                              >
                                {headerLayers.map((layer) => {
                                  if (layer.layerType === 'shape') {
                                    return (
                                      <line
                                        key={layer.id}
                                        x1="20"
                                        y1={hHeight - 15}
                                        x2="730"
                                        y2={hHeight - 15}
                                        stroke={parsedHeader.colorLinea || '#CBD5E1'}
                                        strokeWidth="1.5"
                                      />
                                    );
                                  }
                                  if (layer.layerType === 'image') {
                                    const img = layer.raw;
                                    return (
                                      <image
                                        key={img.id}
                                        href={img.url}
                                        x={img.x}
                                        y={img.y}
                                        width={img.width}
                                        height={img.height}
                                        opacity={img.opacity ?? 1}
                                        preserveAspectRatio={img.lockRatio ? 'xMidYMid meet' : 'none'}
                                      />
                                    );
                                  }
                                  if (layer.layerType === 'text') {
                                    const t = layer.raw;
                                    return (
                                      <text
                                        key={t.id}
                                        x={t.x}
                                        y={t.y}
                                        fontSize={t.fontSize || 11}
                                        fontWeight={t.fontWeight || 'normal'}
                                        fontStyle={t.fontStyle || 'normal'}
                                        textDecoration={t.textDecoration || 'none'}
                                        fill={t.color || '#0F172A'}
                                        textAnchor={t.align || 'middle'}
                                        fontFamily="Helvetica, Arial, sans-serif"
                                      >
                                        {t.textTransform === 'uppercase' ? String(t.texto || '').toUpperCase() : t.texto}
                                      </text>
                                    );
                                  }
                                  return null;
                                })}
                              </svg>
                            </div>
                          );
                        }

                        return (
                          <div className="text-center border-b border-slate-300 pb-4 mb-6 relative">
                            <img src="https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/mppcomunas.png" alt="Comunas" className="absolute left-0 top-0 h-10 object-contain" />
                            <img src="https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/logo.png" alt="CC" className="absolute right-0 top-0 h-12 object-contain" />
                            <h4 className="text-xs font-bold text-slate-900 tracking-wider">REPÚBLICA BOLIVARIANA DE VENEZUELA</h4>
                            <p className="text-[10px] text-slate-700">MINISTERIO DEL PODER POPULAR PARA LAS COMUNAS Y LOS MOVIMIENTOS SOCIALES</p>
                            <p className="text-[10px] font-bold text-slate-800">CONSEJO COMUNAL &quot;LAS LLAVES&quot;</p>
                            <p className="text-[9px] text-slate-600">Urbanización {config?.urbanizacion || 'Dr. Alfredo Travieso Paúl'} - Parroquia {config?.parroquia || 'Goaigoaza'}</p>
                            <p className="text-[9px] text-slate-500">Municipio {config?.municipio || 'Puerto Cabello'}, Estado {config?.estado || 'Carabobo'} | RIF: {config?.rif || 'C299916862'} | SITUR: {config?.situr_codigo || '08-11-04-001-0033'}</p>
                          </div>
                        );
                      })()}

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
                        <p className="font-bold">Por el Consejo Comunal &quot;LAS LLAVES&quot;</p>
                      </div>
                    </div>

                    {/* Firmas y Footer Único de Documentos */}
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

                      {(() => {
                        let parsedFooter = null;
                        try {
                          if (footerUnicoSvg) {
                            parsedFooter = typeof footerUnicoSvg === 'string' ? JSON.parse(footerUnicoSvg) : footerUnicoSvg;
                          }
                        } catch (e) {}

                        if (parsedFooter && (parsedFooter.textos?.length > 0 || parsedFooter.imagenes?.length > 0)) {
                          const fHeight = parsedFooter.height || 150;
                          const footerLayers = [];
                          if (parsedFooter.mostrarRecuadroValidacion !== false) {
                            footerLayers.push({
                              id: '__shape_recuadro_qr__',
                              layerType: 'shape',
                              zIndex: typeof parsedFooter.fondoZIndex === 'number' ? parsedFooter.fondoZIndex : 0,
                            });
                          }
                          (parsedFooter.imagenes || []).forEach((img, idx) => {
                            if (img.visible !== false) {
                              footerLayers.push({
                                id: img.id,
                                layerType: 'image',
                                zIndex: typeof img.zIndex === 'number' ? img.zIndex : (idx + 1) * 10,
                                raw: img,
                              });
                            }
                          });
                          (parsedFooter.textos || []).forEach((t, idx) => {
                            if (t.visible !== false) {
                              footerLayers.push({
                                id: t.id,
                                layerType: 'text',
                                zIndex: typeof t.zIndex === 'number' ? t.zIndex : 100 + (idx + 1) * 10,
                                raw: t,
                              });
                            }
                          });
                          footerLayers.sort((a, b) => a.zIndex - b.zIndex);

                          return (
                            <div className="overflow-hidden">
                              <svg viewBox={`0 0 750 ${fHeight}`} className="w-full h-auto">
                                {footerLayers.map((layer) => {
                                  if (layer.layerType === 'shape') {
                                    return (
                                      <rect
                                        key={layer.id}
                                        x="10"
                                        y="6"
                                        width="730"
                                        height="95"
                                        rx="6"
                                        fill={parsedFooter.colorFondo || '#F8FAFC'}
                                        stroke={parsedFooter.colorBorde || '#E2E8F0'}
                                        strokeWidth="1"
                                      />
                                    );
                                  }
                                  if (layer.layerType === 'image') {
                                    const img = layer.raw;
                                    return (
                                      <image
                                        key={img.id}
                                        href={img.url}
                                        x={img.x}
                                        y={img.y}
                                        width={img.width}
                                        height={img.height}
                                        opacity={img.opacity ?? 1}
                                        preserveAspectRatio={img.lockRatio ? 'xMidYMid meet' : 'none'}
                                      />
                                    );
                                  }
                                  if (layer.layerType === 'text') {
                                    const t = layer.raw;
                                    return (
                                      <text
                                        key={t.id}
                                        x={t.x}
                                        y={t.y}
                                        fontSize={t.fontSize || 10}
                                        fontWeight={t.fontWeight || 'normal'}
                                        fontStyle={t.fontStyle || 'normal'}
                                        textDecoration={t.textDecoration || 'none'}
                                        fill={t.color || '#0F172A'}
                                        textAnchor={t.align || 'start'}
                                        fontFamily="Helvetica, Arial, sans-serif"
                                      >
                                        {t.textTransform === 'uppercase' ? String(t.texto || '').toUpperCase() : t.texto}
                                      </text>
                                    );
                                  }
                                  return null;
                                })}
                              </svg>
                            </div>
                          );
                        }

                        return (
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
                            <img src="https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/favicon.svg" alt="QR" className="w-12 h-12 object-contain" />
                            <div className="text-[9px] text-slate-600">
                              <span className="font-bold text-slate-900 block">CERTIFICACIÓN Y VALIDACIÓN DIGITAL DE CONSTANCIA</span>
                              <span>Código Único: <strong className="text-blue-600 font-mono">CCLL-MUESTRA999</strong> | Vigencia: 60 Días</span>
                              <span className="block text-slate-400">Verifique en: https://lasllaves.org/#validar</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
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

                {/* Selector de Firmante Autorizado para Reportes Estadísticos */}
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-750 px-2.5 py-1 rounded-xl">
                  <PenTool className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-300 shrink-0">Firmante:</span>
                  <select
                    value={firmanteReporteId}
                    onChange={(e) => handleCambiarFirmanteReporte(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-white text-[11px] rounded-lg px-2 py-0.5 focus:outline-none focus:border-blue-500 max-w-[210px] truncate"
                    title="Selecciona el vocero o administrador que firma los documentos estadísticos en PDF"
                  >
                    <option value="ADMIN_ACTUAL">
                      👤 {user?.nombre || user?.username || 'Administrador del Sistema'} (Admin en Sesión)
                    </option>
                    {firmas.filter(f => f.activo !== 0).map((f) => (
                      <option key={f.id} value={`FIRMA_${f.id}`}>
                        ✍️ {f.nombre} ({f.comision})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setModalResumenVisual(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition shadow-md shadow-cyan-600/20"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Resumen Estadístico Visual</span>
                </button>

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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Viviendas / Casas</span>
                <span className="text-xl font-extrabold text-cyan-400 block">{stats?.resumen?.total_casas_territorio || 0}</span>
                <span className="text-[10px] text-slate-400">
                  {stats?.resumen?.total_casas_subdivididas ? `${stats.resumen.total_casas_subdivididas} divisiones (A/B)` : `${stats?.resumen?.casas_censadas || 0} censadas`}
                </span>
              </div>

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

            {/* SECCIÓN NUEVA: CATÁLOGOS OFICIALES Y SISTEMA DE SELECCIONES (#CONFIGURACION) */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Catálogos Oficiales y Sistema de Selecciones Comunales</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                        {((stats?.graficos?.parentescoData?.length || 0) + (stats?.graficos?.instruccionData?.length || 0) + (stats?.graficos?.saludData?.length || 0))} Opciones Activas
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Conectado en tiempo real con <strong>#configuracion</strong>. Cualquier opción nueva agregada en Parentesco, Nivel de Instrucción o Condición de Salud se refleja automáticamente en estos gráficos.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setCurrentTab('configuracion'); setConfigSubTab('catalogos'); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition border border-slate-700/60 shadow-sm"
                  >
                    <Settings className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Configurar Catálogos</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Gráfico 1: Parentesco */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-4 h-4 text-cyan-400" /> Estructura Familiar (Parentesco)
                    </h4>
                    <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                      {stats?.graficos?.parentescoData?.reduce((a, b) => a + (b.cantidad || 0), 0) || 0} hab.
                    </span>
                  </div>

                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats?.graficos?.parentescoData || []} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis type="number" stroke="#64748b" fontSize={9} />
                        <YAxis dataKey="descripcion" type="category" stroke="#64748b" fontSize={9} width={75} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                        <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>
                          {stats?.graficos?.parentescoData?.map((entry, index) => (
                            <Cell key={`bar-p-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-800/80 text-[10px]">
                    {stats?.graficos?.parentescoData?.map(item => (
                      <div key={item.codigo} className="flex items-center justify-between px-2 py-1 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-300 truncate max-w-[90px]">{item.descripcion}</span>
                        <strong className="text-cyan-400 font-mono">{item.cantidad}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gráfico 2: Nivel de Instrucción */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-emerald-400" /> Nivel de Instrucción
                    </h4>
                    <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {stats?.graficos?.instruccionData?.reduce((a, b) => a + (b.cantidad || 0), 0) || 0} hab.
                    </span>
                  </div>

                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats?.graficos?.instruccionData || []} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis type="number" stroke="#64748b" fontSize={9} />
                        <YAxis dataKey="descripcion" type="category" stroke="#64748b" fontSize={9} width={75} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                        <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>
                          {stats?.graficos?.instruccionData?.map((entry, index) => (
                            <Cell key={`bar-i-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-800/80 text-[10px]">
                    {stats?.graficos?.instruccionData?.map(item => (
                      <div key={item.codigo} className="flex items-center justify-between px-2 py-1 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-300 truncate max-w-[90px]">{item.descripcion}</span>
                        <strong className="text-emerald-400 font-mono">{item.cantidad}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gráfico 3: Condición de Salud */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-400" /> Condición de Salud
                    </h4>
                    <span className="text-[10px] font-mono text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                      {stats?.graficos?.saludData?.reduce((a, b) => a + (b.cantidad || 0), 0) || 0} hab.
                    </span>
                  </div>

                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats?.graficos?.saludData || []} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis type="number" stroke="#64748b" fontSize={9} />
                        <YAxis dataKey="descripcion" type="category" stroke="#64748b" fontSize={9} width={75} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                        <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>
                          {stats?.graficos?.saludData?.map((entry, index) => (
                            <Cell key={`bar-s-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-800/80 text-[10px]">
                    {stats?.graficos?.saludData?.map(item => (
                      <div key={item.codigo} className="flex items-center justify-between px-2 py-1 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-300 truncate max-w-[90px]">{item.descripcion}</span>
                        <strong className="text-rose-400 font-mono">{item.cantidad}</strong>
                      </div>
                    ))}
                  </div>
                </div>

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

              {/* Gráfico 4: Cobertura Territorial por Vereda */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-0.5">Cobertura Territorial por Vereda (A a O)</h3>
                    <p className="text-xs text-slate-400">Comparativa de vecinos registrados y viviendas/casas (incluyendo subdivisiones)</p>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 self-start sm:self-auto">
                    {stats?.resumen?.total_casas_territorio || 0} Casas Totales
                  </span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.graficos?.veredasData || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="vereda" stroke="#64748b" fontSize={9} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Bar name="Habitantes Reales" dataKey="habitantes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar name="Vecinos Registrados" dataKey="vecinos" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      <Bar name="Casas en Catálogo" dataKey="casas" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB: BITÁCORA Y AUDITORÍA INTEGRAL DE CONTRALORÍA */}
        {currentTab === 'auditoria' && checkPermiso('auditoria') && (
          <div className="space-y-6 animate-in fade-in pb-12">
            {/* 1. CABECERA SUPERIOR Y ESTADO DE RED EN VIVO */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-850 border border-slate-800 shadow-2xl relative overflow-hidden">
              <div className="space-y-1 relative z-10">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3 text-blue-400" /> Unidad de Contraloría Social
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    IP Pública Activa: {ipPublicaServidor || ipPublicaCliente || 'Detectada en conexión'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono text-slate-400 bg-slate-800/60 border border-slate-700/50 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Huso Horario: Venezuela (UTC-4)
                  </span>
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight">Bitácora de Auditoría del Sistema</h1>
                <p className="text-xs text-slate-400 max-w-2xl">
                  Registro inalterable con trazabilidad de IP Pública, historial cronológico de lo que hace cada persona y analítica cuantitativa de tráfico para la contraloría interna.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 relative z-10">
                <button
                  onClick={exportarAuditoriaCsv}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  title="Descargar registro filtrado para acta de contraloría"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Exportar CSV</span>
                </button>
                <button
                  onClick={() => cargarAuditoria()}
                  disabled={loadingAuditoria}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingAuditoria ? 'animate-spin' : ''}`} />
                  <span>{loadingAuditoria ? 'Actualizando...' : 'Refrescar'}</span>
                </button>
              </div>
            </div>

            {/* 2. BARRA DE FILTROS AVANZADOS Y RANGO DE FECHAS */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Filtros Cuantitativos y Rango de Fechas</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 mr-1">Periodo rápido:</span>
                  <button
                    onClick={() => aplicarFiltroRapidoFechaAudit(0)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 border border-slate-700"
                  >
                    Hoy
                  </button>
                  <button
                    onClick={() => aplicarFiltroRapidoFechaAudit(7)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 border border-slate-700"
                  >
                    Últimos 7 días
                  </button>
                  <button
                    onClick={() => aplicarFiltroRapidoFechaAudit(30)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 border border-slate-700"
                  >
                    Últimos 30 días
                  </button>
                  <button
                    onClick={() => aplicarFiltroRapidoFechaAudit(-1)}
                    className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-[11px] font-bold"
                  >
                    Todo el Historial
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Fecha Desde */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Desde (Fecha)</label>
                  <input
                    type="date"
                    value={auditFechaInicio}
                    onChange={(e) => setAuditFechaInicio(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Fecha Hasta */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hasta (Fecha)</label>
                  <input
                    type="date"
                    value={auditFechaFin}
                    onChange={(e) => setAuditFechaFin(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Categoría */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Área / Categoría</label>
                  <select
                    value={auditFiltroCategoria}
                    onChange={(e) => setAuditFiltroCategoria(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Todas las Áreas</option>
                    <option value="ACCESOS">Accesos y Seguridad</option>
                    <option value="DOCUMENTOS">Trámites, Descargas y QR</option>
                    <option value="PADRON_CENSO">Padrón y Censo Comunal</option>
                    <option value="ADMINISTRACION">Administración y Permisos</option>
                    <option value="NAVEGACION">Navegación y Consultas</option>
                  </select>
                </div>

                {/* Persona / Actor */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Persona / Operador</label>
                  <select
                    value={auditFiltroPersona}
                    onChange={(e) => setAuditFiltroPersona(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 truncate"
                  >
                    <option value="">Todas las personas</option>
                    {(auditoriaCuantitativo?.historialPorPersona || []).map((p) => (
                      <option key={p.persona_key} value={p.nombre}>
                        {p.nombre} ({p.total_acciones} acciones)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Búsqueda por Cédula / Código QR / IP */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cédula / QR / IP</label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Ej: V-15..., CCLL-..."
                      value={auditBusqueda}
                      onChange={(e) => setAuditBusqueda(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && cargarAuditoria()}
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                {/* Botones de acción de filtros */}
                <div className="flex items-end gap-1.5">
                  <button
                    onClick={() => cargarAuditoria()}
                    className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center gap-1 shadow-md shadow-blue-600/20"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Filtrar</span>
                  </button>
                  <button
                    onClick={() => {
                      setAuditFechaInicio('');
                      setAuditFechaFin('');
                      setAuditFiltroCategoria('');
                      setAuditFiltroTipo('');
                      setAuditFiltroPersona('');
                      setAuditFiltroIp('');
                      setAuditBusqueda('');
                      cargarAuditoria('', '', '', '', '', '', '');
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                    title="Limpiar todos los filtros"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Indicador de filtro por IP activa si existe */}
              {auditFiltroIp && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>Filtrando exclusivamente por IP Pública: <strong className="font-mono text-white">{auditFiltroIp}</strong></span>
                  <button
                    onClick={() => {
                      setAuditFiltroIp('');
                      cargarAuditoria(auditFechaInicio, auditFechaFin, auditFiltroCategoria, auditFiltroTipo, auditFiltroPersona, '', auditBusqueda);
                    }}
                    className="ml-auto text-blue-400 hover:text-white underline text-[11px]"
                  >
                    Quitar filtro de IP
                  </button>
                </div>
              )}
            </div>

            {/* 3. TARJETAS DE CONTROL CUANTITATIVO (6 KPIs DE CONTRALORÍA) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Total Eventos */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 relative overflow-hidden">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Operaciones</span>
                <div className="text-2xl font-black text-white">
                  {auditoriaCuantitativo?.kpis?.total_eventos ?? auditorias.length}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-blue-400" />
                  <span>{auditoriaCuantitativo?.kpis?.promedio_eventos_dia ?? 0} prom/día activo</span>
                </div>
              </div>

              {/* Hora Pico de Mayor Tráfico */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 relative overflow-hidden">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Hora Pico Tráfico
                </span>
                <div className="text-2xl font-black text-amber-300 font-mono">
                  {auditoriaCuantitativo?.kpis?.hora_pico?.hora || '--:--'}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 truncate">
                  {auditoriaCuantitativo?.kpis?.hora_pico?.cantidad || 0} ops ({auditoriaCuantitativo?.kpis?.hora_pico?.porcentaje || 0}%)
                </div>
              </div>

              {/* Franja Horaria Dominante */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Franja Principal</span>
                <div className="text-sm font-bold text-white truncate">
                  {auditoriaCuantitativo?.kpis?.franja_mayor_trafico?.nombre?.split('(')[0]?.trim() || 'Diurna'}
                </div>
                <div className="text-[10px] text-emerald-400 mt-1 font-mono font-bold">
                  {auditoriaCuantitativo?.kpis?.franja_mayor_trafico?.total || 0} ops ({auditoriaCuantitativo?.kpis?.franja_mayor_trafico?.porcentaje || 0}%)
                </div>
              </div>

              {/* IPs Públicas Únicas */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-blue-400" /> IPs Públicas
                </span>
                <div className="text-2xl font-black text-blue-400 font-mono">
                  {auditoriaCuantitativo?.kpis?.ips_unicas ?? 1}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 truncate">
                  Conexiones externas
                </div>
              </div>

              {/* Personas Activas */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <Users className="w-3 h-3 text-purple-400" /> Personas Activas
                </span>
                <div className="text-2xl font-black text-purple-400 font-mono">
                  {auditoriaCuantitativo?.kpis?.personas_activas ?? 0}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {auditoriaCuantitativo?.kpis?.voceros_activos ?? 0} voc / {auditoriaCuantitativo?.kpis?.ciudadanos_activos ?? 0} vec
                </div>
              </div>

              {/* Acciones Críticas */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Eventos Críticos
                </span>
                <div className="text-2xl font-black text-rose-400 font-mono">
                  {auditoriaCuantitativo?.kpis?.acciones_criticas ?? 0}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 truncate">
                  Autorizaciones y seguridad
                </div>
              </div>
            </div>

            {/* 4. SUB-PESTAÑAS DE VISTA */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
              <button
                onClick={() => setAuditSubTab('integral')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  auditSubTab === 'integral'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Vista Integral</span>
              </button>
              <button
                onClick={() => setAuditSubTab('graficos')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  auditSubTab === 'graficos'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Gráficos de Tráfico Horario ({auditoriaCuantitativo?.kpis?.hora_pico?.hora || '--:--'})</span>
              </button>
              <button
                onClick={() => setAuditSubTab('personas')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  auditSubTab === 'personas'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Historial y Estado por Persona ({auditoriaCuantitativo?.historialPorPersona?.length || 0})</span>
              </button>
              <button
                onClick={() => setAuditSubTab('ips')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  auditSubTab === 'ips'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Control de IPs Públicas ({auditoriaCuantitativo?.controlPorIp?.length || 0})</span>
              </button>
              <button
                onClick={() => setAuditSubTab('tabla')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  auditSubTab === 'tabla'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Bitácora Detallada ({auditorias.length})</span>
              </button>
            </div>

            {/* 5.A SUBTAB: GRÁFICOS DE TRÁFICO HORARIO Y EVOLUCIÓN */}
            {(auditSubTab === 'integral' || auditSubTab === 'graficos') && (
              <div className="space-y-6">
                {/* GRÁFICO 1: HORAS DE MAYOR TRÁFICO (00:00 A 23:00) */}
                <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <h3 className="text-base font-bold text-white">Distribución de Tráfico por Hora del Día (00:00 a 23:00)</h3>
                      </div>
                      <p className="text-xs text-slate-400">
                        Identificación cuantitativa de las horas pico de mayor concurrencia en la plataforma para contraloría y soporte
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span className="w-3 h-3 rounded bg-blue-500"></span> Gestión Interna Voceros
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span className="w-3 h-3 rounded bg-emerald-500"></span> Trámites / Descargas / QR
                      </div>
                    </div>
                  </div>

                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={auditoriaCuantitativo?.traficoPorHora || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="hora" stroke="#64748b" fontSize={10} interval={1} />
                        <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl text-xs space-y-1 font-sans">
                                  <div className="font-bold text-white flex items-center justify-between gap-3">
                                    <span>Hora: {label}</span>
                                    {data.esHoraPico && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                        HORA PICO
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-blue-400">Gestión Interna: <strong>{data.gestion_interna}</strong> ops</div>
                                  <div className="text-emerald-400">Trámites y Descargas: <strong>{data.tramites_publicos}</strong> ops</div>
                                  <div className="border-t border-slate-800 pt-1 text-slate-300 font-bold">
                                    Total: {data.total} operaciones ({data.porcentaje}%)
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="gestion_interna" name="Gestión Interna" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="tramites_publicos" name="Trámites Públicos" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Resumen por Franjas Horarias */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                    {(auditoriaCuantitativo?.franjasHorarias || []).map((f, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-medium">{f.nombre.split('(')[0]}</span>
                          <span className="font-mono font-bold text-white">{f.total}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              idx === 0 ? 'bg-indigo-500' : idx === 1 ? 'bg-amber-500' : idx === 2 ? 'bg-blue-500' : 'bg-purple-500'
                            }`}
                            style={{ width: `${Math.min(100, f.porcentaje || 0)}%` }}
                          ></div>
                        </div>
                        <div className="text-[10px] text-slate-500 flex justify-between">
                          <span>{f.rango}</span>
                          <span>{f.porcentaje}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* GRÁFICO 2: EVOLUCIÓN TEMPORAL POR FECHA Y CATEGORÍAS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Evolución Diaria en el Rango */}
                  <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                    <div className="border-b border-slate-800 pb-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        Evolución de Actividad en el Rango de Fechas
                      </h3>
                      <p className="text-xs text-slate-400">Total de transacciones auditadas por día</p>
                    </div>

                    <div className="h-60 w-full">
                      {(auditoriaCuantitativo?.traficoPorDia || []).length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={auditoriaCuantitativo.traficoPorDia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="fecha" stroke="#64748b" fontSize={9} />
                            <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', fontSize: 11 }} />
                            <Line type="monotone" dataKey="total" name="Total Eventos" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="tramites_publicos" name="Trámites Públicos" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-slate-500">
                          Sin datos de evolución para el rango seleccionado
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Conteo Cuantitativo por Categoría de Contraloría */}
                  <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                    <div className="border-b border-slate-800 pb-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Shield className="w-4 h-4 text-purple-400" />
                        Distribución por Área de Contraloría
                      </h3>
                      <p className="text-xs text-slate-400">Clasificación cuantitativa de eventos auditados</p>
                    </div>

                    <div className="space-y-3">
                      {(auditoriaCuantitativo?.porCategoria || []).map((cat) => (
                        <div key={cat.codigo} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-300">{cat.nombre}</span>
                            <span className="font-mono text-slate-400">
                              <strong className="text-white">{cat.total}</strong> ops ({cat.porcentaje}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800/80">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, cat.porcentaje || 0)}%`, backgroundColor: cat.color }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5.B SUBTAB: HISTORIAL Y ESTADO POR PERSONA ("LO QUE ESTÁ HACIENDO + HISTORIAL PREVIO") */}
            {(auditSubTab === 'integral' || auditSubTab === 'personas') && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-slate-900 border border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-base font-bold text-white">Monitoreo Individual por Persona: Actividad Actual e Historial</h3>
                    </div>
                    <p className="text-xs text-slate-400">
                      Vigilancia en tiempo real de lo que hace cada vocero o ciudadano dentro del sistema, con trazabilidad de IP Pública, navegador y expediente cronológico de acciones.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-slate-800 text-xs font-mono text-slate-300 border border-slate-700">
                    {auditoriaCuantitativo?.historialPorPersona?.length || 0} personas registradas
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(auditoriaCuantitativo?.historialPorPersona || []).map((p) => {
                    const act = p.accion_actual || {};
                    return (
                      <div
                        key={p.persona_key}
                        className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition shadow-lg space-y-4"
                      >
                        {/* Encabezado Persona */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                              p.es_vocero ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30' : 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                            }`}>
                              {p.nombre ? p.nombre.slice(0, 2).toUpperCase() : 'US'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-white">{p.nombre}</h4>
                                <span className={`px-2 py-0.2 rounded text-[9px] font-bold uppercase ${
                                  p.es_vocero ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {p.rol || (p.es_vocero ? 'Vocero' : 'Ciudadano')}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {p.cedula ? `C.I.: ${p.cedula}` : 'Sin cédula asociada'}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-mono font-black text-blue-400 block">{p.total_acciones}</span>
                            <span className="text-[10px] text-slate-500 uppercase">operaciones</span>
                          </div>
                        </div>

                        {/* BLOQUE: LO QUE ESTÁ HACIENDO ACTUALMENTE */}
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                              Última Acción Registrada (En Vivo)
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">{act.created_at || 'Reciente'}</span>
                          </div>

                          <div className="text-xs text-slate-200 font-medium">
                            {act.resumen || act.etiqueta || 'Actividad general en el sistema'}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-900 text-[10px] font-mono text-slate-400">
                            <span className="inline-flex items-center gap-1 text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                              <Globe className="w-3 h-3 text-blue-400" />
                              IP: {act.ip || 'No disponible'}
                            </span>
                            <span className="inline-flex items-center gap-1 text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              <Laptop className="w-3 h-3 text-slate-400" />
                              {act.dispositivo || 'Navegador Web'}
                            </span>
                          </div>
                        </div>

                        {/* DESGLOSE CUANTITATIVO */}
                        <div className="grid grid-cols-4 gap-2 text-center text-[10px] pt-1">
                          <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-850">
                            <span className="text-slate-500 block">Accesos</span>
                            <strong className="text-white font-mono text-xs">{p.accesos}</strong>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-850">
                            <span className="text-slate-500 block">Trámites</span>
                            <strong className="text-emerald-400 font-mono text-xs">{p.documentos}</strong>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-850">
                            <span className="text-slate-500 block">Padrón/Censo</span>
                            <strong className="text-amber-400 font-mono text-xs">{p.padron_censo}</strong>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-850">
                            <span className="text-slate-500 block">Administración</span>
                            <strong className="text-purple-400 font-mono text-xs">{p.administracion}</strong>
                          </div>
                        </div>

                        {/* BOTÓN PARA ABRIR HISTORIAL COMPLETO DE LA PERSONA */}
                        <div className="pt-2 flex items-center justify-between border-t border-slate-850">
                          <span className="text-[11px] text-slate-400">
                            Historial previo: <strong className="text-slate-200">{p.historial_previo_count}</strong> acciones registradas
                          </span>
                          <button
                            onClick={() => setPersonaSeleccionadaDetalle(p)}
                            className="px-3 py-1.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/25 text-xs font-bold transition flex items-center gap-1"
                          >
                            <span>Ver Expediente Completo</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5.C SUBTAB: CONTROL DE IPS PÚBLICAS Y DISPOSITIVOS */}
            {(auditSubTab === 'integral' || auditSubTab === 'ips') && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-slate-900 border border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-400" />
                      <h3 className="text-base font-bold text-white">Control Cuantitativo de Direcciones IP Públicas</h3>
                    </div>
                    <p className="text-xs text-slate-400">
                      Mapeo de orígenes de conexión, detección de múltiples usuarios operando desde una misma red y volumen de tráfico
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-slate-800 text-xs font-mono text-slate-300 border border-slate-700">
                    {auditoriaCuantitativo?.controlPorIp?.length || 0} IPs detectadas
                  </span>
                </div>

                <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                        <tr>
                          <th className="px-4 py-3">IP Pública</th>
                          <th className="px-4 py-3">Tráfico / Operaciones</th>
                          <th className="px-4 py-3">Usuarios Conectados</th>
                          <th className="px-4 py-3">Dispositivos y Navegadores</th>
                          <th className="px-4 py-3">Última Conexión</th>
                          <th className="px-4 py-3 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                        {(auditoriaCuantitativo?.controlPorIp || []).map((ipItem) => (
                          <tr key={ipItem.ip} className="hover:bg-slate-850/40 transition">
                            <td className="px-4 py-3 font-bold text-blue-400 flex items-center gap-2">
                              <Globe className="w-3.5 h-3.5 text-blue-400" />
                              <span>{ipItem.ip}</span>
                              {ipItem.ip === (ipPublicaServidor || ipPublicaCliente) && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  ACTUAL
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-200">
                              <strong>{ipItem.total_eventos}</strong> ops ({ipItem.porcentaje}%)
                              {ipItem.eventos_criticos > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400">
                                  {ipItem.eventos_criticos} críticas
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-300 font-sans">
                              <div className="font-semibold text-white">{ipItem.usuarios_count} persona(s):</div>
                              <div className="text-[10px] text-slate-400 truncate max-w-xs">
                                {ipItem.usuarios.slice(0, 3).join(', ')}
                                {ipItem.usuarios.length > 3 && ` (+${ipItem.usuarios.length - 3})`}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-400 font-sans text-[10px]">
                              {ipItem.dispositivos.slice(0, 2).join(' | ') || 'Navegador Web'}
                            </td>
                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                              {ipItem.ultima_actividad || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-right font-sans">
                              <button
                                onClick={() => {
                                  setAuditFiltroIp(ipItem.ip);
                                  cargarAuditoria(auditFechaInicio, auditFechaFin, auditFiltroCategoria, auditFiltroTipo, auditFiltroPersona, ipItem.ip, auditBusqueda);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-bold transition"
                              >
                                Filtrar por esta IP
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 5.D SUBTAB: BITÁCORA GENERAL DETALLADA */}
            {(auditSubTab === 'integral' || auditSubTab === 'tabla') && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-slate-900 border border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <h3 className="text-base font-bold text-white">Registro General Inalterable de Eventos</h3>
                    </div>
                    <p className="text-xs text-slate-400">
                      Asiento secuencial de cada transacción con detalle de IP pública, dispositivo y parámetros de contraloría
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-slate-800 text-xs font-mono text-slate-300 border border-slate-700">
                    Mostrando {auditorias.length} eventos
                  </span>
                </div>

                <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                        <tr>
                          <th className="px-4 py-3">Fecha y Hora</th>
                          <th className="px-4 py-3">Evento / Categoría</th>
                          <th className="px-4 py-3">Usuario / Actor</th>
                          <th className="px-4 py-3">Cédula / Código</th>
                          <th className="px-4 py-3">Acción y Trazabilidad</th>
                          <th className="px-4 py-3">IP Pública</th>
                          <th className="px-4 py-3">Dispositivo</th>
                          <th className="px-4 py-3 text-right">Detalle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                        {auditorias.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-850/50 transition">
                            <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">
                              {a.created_at || a.fecha || '—'}
                            </td>
                            <td className="px-4 py-2.5 font-sans">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                a.es_critico ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                                a.categoria_evento === 'ACCESOS' ? 'bg-blue-500/15 text-blue-300' :
                                a.categoria_evento === 'DOCUMENTOS' ? 'bg-emerald-500/15 text-emerald-300' :
                                a.categoria_evento === 'PADRON_CENSO' ? 'bg-amber-500/15 text-amber-300' :
                                'bg-purple-500/15 text-purple-300'
                              }`}>
                                {a.etiqueta_evento || a.tipo_evento}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-slate-200 font-sans font-medium">
                              <button
                                onClick={() => {
                                  const pMatch = (auditoriaCuantitativo?.historialPorPersona || []).find(
                                    (x) => x.nombre === a.usuario_nombre || (a.cedula && x.cedula === a.cedula)
                                  );
                                  if (pMatch) setPersonaSeleccionadaDetalle(pMatch);
                                }}
                                className="hover:text-blue-400 hover:underline text-left block"
                                title="Ver expediente de esta persona"
                              >
                                {a.usuario_nombre || 'Público'}
                              </button>
                            </td>
                            <td className="px-4 py-2.5 text-slate-300">
                              {a.cedula || a.codigo_documento || '—'}
                            </td>
                            <td className="px-4 py-2.5 text-slate-300 font-sans text-xs max-w-xs truncate" title={a.resumen_accion}>
                              {a.resumen_accion || a.tipo_documento || '—'}
                            </td>
                            <td className="px-4 py-2.5 text-blue-400 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1">
                                <Globe className="w-3 h-3 text-blue-400" />
                                {a.ip || 'Local'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-slate-400 font-sans text-[10px] max-w-[120px] truncate" title={a.dispositivo_resumen}>
                              {a.dispositivo_resumen || 'Navegador Web'}
                            </td>
                            <td className="px-4 py-2.5 text-right font-sans">
                              <button
                                onClick={() => setLogDetalleModal(a)}
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold"
                              >
                                Inspeccionar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 6. MODAL: EXPEDIENTE COMPLETO E HISTORIAL DE LA PERSONA */}
            {personaSeleccionadaDetalle && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
                  {/* Encabezado del modal */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-300 border border-blue-500/30 flex items-center justify-center font-bold text-lg">
                        {personaSeleccionadaDetalle.nombre?.slice(0, 2).toUpperCase() || 'US'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-white">{personaSeleccionadaDetalle.nombre}</h2>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300">
                            {personaSeleccionadaDetalle.rol}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono">
                          {personaSeleccionadaDetalle.cedula ? `C.I.: ${personaSeleccionadaDetalle.cedula}` : 'Sin cédula registrada'} | Total: {personaSeleccionadaDetalle.total_acciones} acciones auditadas
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setPersonaSeleccionadaDetalle(null)}
                      className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Resumen de IPs y Dispositivos de la persona */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">IPs Públicas Utilizadas</span>
                      <div className="flex flex-wrap gap-1.5 font-mono text-blue-400">
                        {personaSeleccionadaDetalle.ips_utilizadas?.map((ip, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[11px]">
                            {ip}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Navegadores y Dispositivos</span>
                      <div className="text-slate-200 text-[11px]">
                        {personaSeleccionadaDetalle.dispositivos?.join(' | ') || 'Navegador Web'}
                      </div>
                    </div>
                  </div>

                  {/* Línea de tiempo cronológica: TODO lo que ha hecho esa persona */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Cronología Paso a Paso de Actividades (Historial Completo)
                    </h4>
                    <div className="space-y-2 font-sans text-xs">
                      {personaSeleccionadaDetalle.historial_acciones?.map((h, idx) => (
                        <div
                          key={h.id || idx}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                h.es_critico ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-blue-500/15 text-blue-300'
                              }`}>
                                {h.etiqueta || h.tipo_evento}
                              </span>
                              <span className="text-slate-300 font-medium">{h.resumen}</span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 flex items-center gap-2">
                              <span>IP: {h.ip}</span>
                              <span>•</span>
                              <span>{h.dispositivo}</span>
                              {h.codigo_documento && (
                                <>
                                  <span>•</span>
                                  <span className="text-emerald-400">Doc: {h.codigo_documento}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                            {h.created_at}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pie del modal */}
                  <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-mono">Trazabilidad Inalterable de Contraloría</span>
                    <button
                      onClick={() => setPersonaSeleccionadaDetalle(null)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition"
                    >
                      Cerrar Expediente
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 7. MODAL: DETALLES TÉCNICOS DE EVENTO AUDITADO */}
            {logDetalleModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-white">Inspección de Registro #{logDetalleModal.id}</h3>
                    <button
                      onClick={() => setLogDetalleModal(null)}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Tipo de Evento:</span>
                      <strong className="text-blue-400 font-mono">{logDetalleModal.tipo_evento}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Usuario / Actor:</span>
                      <strong className="text-white">{logDetalleModal.usuario_nombre || 'Público'}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Cédula:</span>
                      <span className="text-slate-200 font-mono">{logDetalleModal.cedula || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">IP Pública:</span>
                      <span className="text-emerald-400 font-mono font-bold">{logDetalleModal.ip || 'Local'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Dispositivo:</span>
                      <span className="text-slate-300">{logDetalleModal.dispositivo_resumen || logDetalleModal.user_agent}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Fecha y Hora:</span>
                      <span className="text-slate-400 font-mono">{logDetalleModal.created_at}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Parámetros y Metadatos JSON (Detalles)
                    </span>
                    <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
                      {JSON.stringify(logDetalleModal.detalles, null, 2)}
                    </pre>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setLogDetalleModal(null)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: USUARIOS Y PERMISOS (SUPER ADMIN) */}
        {currentTab === 'usuarios' && user?.rol === 'SUPER_ADMIN' && (
          <div className="space-y-5 animate-in fade-in">
            {/* Cabecera */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
                  <Users className="w-6 h-6 text-blue-400" />
                  <span>Gestión de Usuarios y Vocerías</span>
                </h1>
                <p className="text-xs text-slate-400">Control integral de accesos, vocerías comunitarias y asignación granular de permisos</p>
              </div>
              <button
                onClick={abrirModalCrearUsuario}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Vocero / Administrador</span>
              </button>
            </div>

            {/* Aviso informativo en pantallas móviles */}
            <div className="sm:hidden flex items-center justify-between px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 font-medium text-blue-400">
                <Smartphone className="w-3.5 h-3.5" />
                Vista móvil con acciones rápidas y edición directa
              </span>
              <span className="text-slate-500 font-mono text-[10px]">{usuarios.length} registrados</span>
            </div>

            {/* VISTA 1: TARJETAS RESPONSIVE PARA CELULARES (sm:hidden) */}
            <div className="sm:hidden space-y-3">
              {usuarios.map((u) => {
                const uPerms = typeof u.permisos === 'string' ? JSON.parse(u.permisos || '{}') : (u.permisos || {});
                const esCensista = uPerms.censo_masivo && !uPerms.firmas && !uPerms.modelador;
                const esEmisorDocs = uPerms.docs_emitir && !uPerms.firmas && !uPerms.censo_masivo;
                const esRoot = u.username === 'CIENCIA_TECNOLOGIA';
                const esSelf = Number(u.id) === Number(user?.id);

                return (
                  <div key={u.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-3">
                    {/* Encabezado */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-white tracking-wide uppercase">{u.username}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.rol === 'SUPER_ADMIN' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                            u.rol === 'ADMIN' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' :
                            u.rol === 'CONTRALORIA' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' :
                            'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                          }`}>
                            {u.rol}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-slate-300 mt-0.5 uppercase">{u.nombre}</h4>
                      </div>

                      {/* Estado */}
                      {u.activo ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                          Inactivo
                        </span>
                      )}
                    </div>

                    {/* Resumen Vocería y Perfil */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[11px]">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Comisión</span>
                        <span className="text-slate-300 font-medium truncate block uppercase">{u.comision || 'COMISIÓN GENERAL'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Perfil</span>
                        <span className="text-slate-300 font-medium truncate block">
                          {u.rol === 'SUPER_ADMIN' ? 'Control Total' : u.rol === 'CONTRALORIA' ? 'Contraloría (Ver y Aprobar)' : esCensista ? 'Digitalizador / Encuestador' : esEmisorDocs ? 'Emisor Docs' : u.rol === 'ADMIN' ? 'Administrador' : 'Personalizado'}
                        </span>
                      </div>
                      {(u.email || u.telefono) && (
                        <div className="col-span-2 pt-1 border-t border-slate-800/60 flex flex-wrap gap-x-3 gap-y-1 text-slate-400 text-[10px]">
                          {u.email && (
                            <span className="flex items-center gap-1 truncate">
                              <Mail className="w-3 h-3 text-slate-500" />
                              {u.email}
                            </span>
                          )}
                          {u.telefono && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-500" />
                              {u.telefono}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Botones de Acción Móvil */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {/* Inhabilitar / Habilitar */}
                      <button
                        onClick={() => toggleActivoUsuario(u)}
                        disabled={esSelf}
                        className={`py-2 px-1 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 border ${
                          esSelf
                            ? 'bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed opacity-50'
                            : u.activo
                            ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30 active:scale-95'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30 active:scale-95'
                        }`}
                        title={esSelf ? 'No puedes inhabilitarte a ti mismo' : u.activo ? 'Inhabilitar acceso' : 'Habilitar acceso'}
                      >
                        {u.activo ? <Ban className="w-4 h-4 text-amber-400" /> : <UserCheck className="w-4 h-4 text-emerald-400" />}
                        <span className="text-[10px]">{u.activo ? 'Inhabilitar' : 'Habilitar'}</span>
                      </button>

                      {/* Editar y Permisos */}
                      <button
                        onClick={() => abrirModalEditarUsuario(u)}
                        className="py-2 px-1 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 active:scale-95"
                      >
                        <Edit className="w-4 h-4" />
                        <span className="text-[10px]">Editar / Permisos</span>
                      </button>

                      {/* Eliminar */}
                      <button
                        onClick={() => eliminarUsuario(u)}
                        disabled={esSelf}
                        className={`py-2 px-1 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 border ${
                          esSelf
                            ? 'bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed opacity-50'
                            : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30 active:scale-95'
                        }`}
                        title={esSelf ? 'No puedes eliminarte a ti mismo' : 'Eliminar usuario'}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="text-[10px]">Eliminar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* VISTA 2: TABLA CON SCROLL HORIZONTAL (hidden sm:block con overflow-x-auto) */}
            <div className="hidden sm:block rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[780px] text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Usuario</th>
                      <th className="px-4 py-3">Nombre y Contacto</th>
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
                      const esRoot = u.username === 'CIENCIA_TECNOLOGIA';
                      const esSelf = Number(u.id) === Number(user?.id);
                      
                      return (
                        <tr key={u.id} className="hover:bg-slate-850/40 transition">
                          <td className="px-4 py-3">
                            <span className="font-mono font-bold text-white block uppercase">{u.username}</span>
                            {esRoot && <span className="text-[9px] text-purple-400 font-semibold">Super Admin Raíz</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-200 block uppercase">{u.nombre}</span>
                            {(u.email || u.telefono) && (
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                {u.email && <span>{u.email}</span>}
                                {u.email && u.telefono && <span>•</span>}
                                {u.telefono && <span>{u.telefono}</span>}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              u.rol === 'SUPER_ADMIN' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                              u.rol === 'ADMIN' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' :
                              u.rol === 'CONTRALORIA' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' :
                              'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                            }`}>
                              {u.rol}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-400 uppercase">{u.comision || 'COMISIÓN GENERAL'}</td>
                          <td className="px-4 py-3">
                            {u.rol === 'SUPER_ADMIN' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-300">
                                <ShieldCheck className="w-3 h-3 text-purple-400" /> Control Total
                              </span>
                            ) : u.rol === 'CONTRALORIA' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/20">
                                <ShieldCheck className="w-3 h-3 text-teal-400" /> Contraloría (Ver y Aprobar)
                              </span>
                            ) : esCensista ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                <ClipboardList className="w-3 h-3" /> Digitalizador / Encuestador
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
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {/* Inhabilitar / Habilitar */}
                              <button
                                onClick={() => toggleActivoUsuario(u)}
                                disabled={esSelf}
                                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition inline-flex items-center gap-1 border ${
                                  esSelf
                                    ? 'bg-slate-850 text-slate-600 border-slate-800 cursor-not-allowed opacity-50'
                                    : u.activo
                                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                }`}
                                title={esSelf ? 'No puedes inhabilitarte a ti mismo' : u.activo ? 'Inhabilitar acceso' : 'Habilitar acceso'}
                              >
                                {u.activo ? <Ban className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                                <span>{u.activo ? 'Inhabilitar' : 'Habilitar'}</span>
                              </button>

                              {/* Editar / Permisos */}
                              <button
                                onClick={() => abrirModalEditarUsuario(u)}
                                className="px-2.5 py-1 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-bold transition inline-flex items-center gap-1"
                                title="Editar datos del usuario, contraseña y permisos"
                              >
                                <Edit className="w-3 h-3" />
                                <span>Editar / Permisos</span>
                              </button>

                              {/* Eliminar */}
                              <button
                                onClick={() => eliminarUsuario(u)}
                                disabled={esSelf}
                                className={`p-1.5 rounded-xl transition inline-flex items-center border ${
                                  esSelf
                                    ? 'bg-slate-850 text-slate-600 border-slate-800 cursor-not-allowed opacity-50'
                                    : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20'
                                }`}
                                title={esSelf ? 'No puedes eliminarte a ti mismo' : 'Eliminar usuario'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: CONFIGURACIÓN GENERAL */}
        {currentTab === 'configuracion' && user?.rol === 'SUPER_ADMIN' && (
          <div className="space-y-5 animate-in fade-in max-w-5xl">
            <div>
              <h1 className="text-2xl font-extrabold text-white">Configuración del Sistema Comunal</h1>
              <p className="text-xs text-slate-400">Parámetros institucionales, vigencia de constancias y aportes</p>
            </div>

            {/* Barra de Sub-pestañas de Configuración */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'todo', label: 'Ver Todo' },
                { id: 'respaldo', label: '💾 Respaldo Base de Datos', highlight: true },
                { id: 'gas', label: '🔥 Cilindros de Gas y Precios' },
                { id: 'jornadas', label: '📅 Jornadas Comunales' },
                { id: 'banco', label: '🏦 Cuenta Bancaria' },
                { id: 'cupo', label: '🎁 Cupo Gratuito' },
                { id: 'general', label: '⚙️ General y Sello' },
                { id: 'tarifas', label: '📄 Tarifas Constancias' },
                { id: 'territorio', label: '🗺️ Territorio / Veredas' },
              ].map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setConfigSubTab(sub.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                    configSubTab === sub.id
                      ? sub.highlight
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                        : 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <span>{sub.label}</span>
                </button>
              ))}
            </div>

            {/* SECCIÓN GENERAL Y SELLO OFICIAL */}
            {(configSubTab === 'todo' || configSubTab === 'general') && (
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
            )}

            {/* SECCIÓN 1: COORDENADAS BANCARIAS OFICIALES DEL CONSEJO COMUNAL */}
            {(configSubTab === 'todo' || configSubTab === 'banco') && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-blue-600/20 text-blue-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Coordenadas Bancarias Oficiales de Recepción</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        LOCC 2023 Art. 51
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Cuenta bancaria del Consejo Comunal donde los vecinos transferirán sus aportes para constancias y servicios.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nombre de la Entidad Bancaria</label>
                  <input
                    type="text"
                    value={config.banco_nombre || '0102 - BANCO DE VENEZUELA'}
                    onChange={(e) => setConfig({ ...config, banco_nombre: e.target.value })}
                    placeholder="Ej. 0102 - BANCO DE VENEZUELA"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Número de Cuenta Corriente (20 Dígitos)</label>
                  <input
                    type="text"
                    maxLength={20}
                    value={config.banco_cuenta || '01020000000000000000'}
                    onChange={(e) => setConfig({ ...config, banco_cuenta: e.target.value })}
                    placeholder="0102-0000-00-0000000000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">RIF Institucional del Consejo Comunal</label>
                  <input
                    type="text"
                    value={config.banco_rif || config.rif || 'C-299916862'}
                    onChange={(e) => setConfig({ ...config, banco_rif: e.target.value, rif: e.target.value })}
                    placeholder="C-299916862"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Teléfono para Pago Móvil / WhatsApp</label>
                  <input
                    type="text"
                    value={config.banco_telefono || '0412-1234567'}
                    onChange={(e) => setConfig({ ...config, banco_telefono: e.target.value })}
                    placeholder="0412-1234567"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Titular Oficial de la Cuenta</label>
                  <input
                    type="text"
                    value={config.banco_titular || 'CONSEJO COMUNAL DR. ALFREDO TRAVIESO PAÚL - LAS LLAVES'}
                    onChange={(e) => setConfig({ ...config, banco_titular: e.target.value })}
                    placeholder="Nombre institucional registrado en el banco"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white font-medium"
                  />
                </div>
              </div>

              {/* Tarjeta de previsualización para el vecino */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vista Previa para el Vecino:</span>
                  <div className="text-white font-bold">{config.banco_nombre || '0102 - BANCO DE VENEZUELA'}</div>
                  <div className="text-slate-300 font-mono text-[11px]">
                    Cuenta: {config.banco_cuenta || '01020000000000000000'} · RIF: {config.banco_rif || config.rif || 'C-299916862'}
                  </div>
                  <div className="text-emerald-400 text-[11px] font-medium">
                    Pago Móvil: {config.banco_telefono || '0412-1234567'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const datos = `${config.banco_nombre || 'Banco de Venezuela'}\nCuenta: ${config.banco_cuenta || ''}\nRIF: ${config.banco_rif || config.rif || ''}\nTel: ${config.banco_telefono || ''}`;
                    navigator.clipboard.writeText(datos);
                    toast.success('Coordenadas copiadas al portapapeles');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-855 hover:bg-slate-750 text-slate-300 text-[11px] font-semibold border border-slate-700 transition flex items-center gap-1.5 shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Datos</span>
                </button>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => guardarCoordenadasBancarias({
                    banco_nombre: config.banco_nombre || '0102 - BANCO DE VENEZUELA',
                    banco_cuenta: config.banco_cuenta || '01020000000000000000',
                    banco_rif: config.banco_rif || config.rif || 'C-299916862',
                    banco_telefono: config.banco_telefono || '0412-1234567',
                    banco_titular: config.banco_titular || 'CONSEJO COMUNAL DR. ALFREDO TRAVIESO PAÚL - LAS LLAVES',
                    rif: config.banco_rif || config.rif || 'C-299916862',
                  })}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-lg shadow-blue-600/30 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Coordenadas Bancarias</span>
                </button>
              </div>
            </div>
            )}

            {/* SECCIÓN 2: SUBVENCIÓN SOCIAL COMUNITARIA (CUPO DE DOCUMENTOS GRATUITOS CON CONTADOR REGRESIVO) */}
            {(configSubTab === 'todo' || configSubTab === 'cupo') && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-emerald-600/20 text-emerald-400">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Subvención Social: Cupo de Documentos Gratuitos</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        Number(config.cupo_docs_gratis_activo)
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {Number(config.cupo_docs_gratis_activo) ? 'Activo' : 'Inactivo'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Emisión de constancias gratuitas con descuento progresivo automático hasta llegar a 0.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(Number(config.cupo_docs_gratis_activo))}
                      onChange={(e) => setConfig({ ...config, cupo_docs_gratis_activo: e.target.checked ? '1' : '0' })}
                      className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                    />
                    <div>
                      <span className="text-xs font-bold text-white">Habilitar Subvención por Cupo Gratuito</span>
                      <p className="text-[11px] text-slate-400">
                        Los vecinos podrán tramitar constancias sin aporte monetario mientras queden unidades disponibles en el cupo.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Cupo Total Asignado</label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={config.cupo_docs_gratis_total || '20'}
                      onChange={(e) => setConfig({ ...config, cupo_docs_gratis_total: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white font-mono font-bold"
                    />
                    <span className="text-[10px] text-slate-500">Cantidad máxima de constancias gratuitas a otorgar</span>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Cupo Restante Actual</label>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={config.cupo_docs_gratis_restante !== undefined ? config.cupo_docs_gratis_restante : '20'}
                      onChange={(e) => setConfig({ ...config, cupo_docs_gratis_restante: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-emerald-400 font-mono font-bold"
                    />
                    <span className="text-[10px] text-slate-500">Se resta 1 automáticamente tras cada emisión</span>
                  </div>
                </div>

                {/* Barra de Progreso y Contador Visual en Tiempo Real */}
                {(() => {
                  const total = parseInt(config.cupo_docs_gratis_total || '20', 10) || 1;
                  const restante = parseInt(config.cupo_docs_gratis_restante !== undefined ? config.cupo_docs_gratis_restante : '20', 10) || 0;
                  const porcentaje = Math.min(100, Math.max(0, Math.round((restante / total) * 100)));
                  return (
                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Disponibilidad del Cupo Social:</span>
                        </span>
                        <span className="font-extrabold text-white font-mono text-sm">
                          {restante} / {total} constancias ({porcentaje}%)
                        </span>
                      </div>

                      <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                        <div
                          className={`h-full transition-all duration-500 ${
                            restante > 5 ? 'bg-emerald-500' : restante > 0 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-400">
                          {restante > 0 ? (
                            <span className="text-emerald-400 font-bold">¡Subvención comunitaria activa para los vecinos!</span>
                          ) : (
                            <span className="text-amber-400 font-bold">Cupo agotado: el sistema solicita el aporte voluntario de ley.</span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const tot = config.cupo_docs_gratis_total || '20';
                            setConfig({ ...config, cupo_docs_gratis_restante: tot });
                            guardarCupoGratis({
                              cupo_docs_gratis_activo: config.cupo_docs_gratis_activo || '1',
                              cupo_docs_gratis_total: tot,
                              cupo_docs_gratis_restante: tot,
                            });
                            toast.success(`Cupo restablecido a ${tot} constancias`);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[10.5px] font-bold transition flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Restablecer a {config.cupo_docs_gratis_total || '20'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}

                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[11px] text-blue-300 leading-relaxed">
                  ⚖️ <strong>Sustento Legal (LOCC 2023 Art. 51 Num. 3):</strong> Mientras el contador sea mayor a 0, la constancia se emite con la leyenda <em>"Cupo Gratuito Subvencionado Comunal"</em> y exención total de pago. Al agotarse (0), el sistema activa automáticamente la solicitud de aporte comunitario para el fondo de autogestión.
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => guardarCupoGratis({
                    cupo_docs_gratis_activo: config.cupo_docs_gratis_activo || '0',
                    cupo_docs_gratis_total: config.cupo_docs_gratis_total || '20',
                    cupo_docs_gratis_restante: config.cupo_docs_gratis_restante !== undefined ? config.cupo_docs_gratis_restante : '20',
                  })}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/30 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Parámetros de Cupo</span>
                </button>
              </div>
            </div>
            )}

            {/* SECCIÓN 3: CATÁLOGO DE CILINDROS DE GAS COMUNAL Y PRECIOS */}
            {(configSubTab === 'todo' || configSubTab === 'gas') && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>🔥 Modelos de Cilindros de Gas y Precios Oficiales</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {serviciosCatalogo.length} Modelos Registrados
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Configuración de precios de Gas Comunal (10kg, 18kg, 43kg), costo proveedor y alícuota de autogestión (Art. 51 Num. 3 LOCC).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setServicioEditando(null);
                    setServicioForm({
                      id: '',
                      nombre: '',
                      categoria: 'GAS',
                      costo_base_usd: 1.0,
                      precio_usd: 1.0,
                      alicuota_autogestion_usd: 0.5,
                      descripcion: '',
                      activo: 1,
                    });
                    setModalServicio(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-500/20 transition shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Agregar Modelo de Bombona</span>
                </button>
              </div>

              {loadingServicios ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-400" />
                  <span>Cargando catálogo de servicios...</span>
                </div>
              ) : serviciosCatalogo.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-950/60 rounded-2xl border border-slate-800">
                  No hay cilindros registrados. Haz clic en "+ Agregar Modelo de Bombona" para registrar bombonas de 10kg, 18kg o 43kg.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {serviciosCatalogo.map((serv) => {
                    const precioBase = Number(serv.costo_base_usd !== undefined ? serv.costo_base_usd : (serv.precio_usd || 0));
                    const alicuota = Number(serv.alicuota_autogestion_usd || 0);
                    const totalUsd = precioBase + alicuota;
                    const totalBs = totalUsd * Number(tasaBcv);
                    return (
                      <div
                        key={serv.id}
                        className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 transition flex flex-col justify-between text-xs space-y-3 shadow-sm"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25">
                              {serv.categoria || 'GAS'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              serv.activo ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {serv.activo ? 'Activo' : 'Pausado'}
                            </span>
                          </div>

                          <h4 className="font-bold text-white text-sm mb-1">{serv.nombre}</h4>
                          {serv.descripcion && (
                            <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">{serv.descripcion}</p>
                          )}

                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                            <div className="flex justify-between text-[11px] text-slate-300">
                              <span>Costo Base / Proveedor:</span>
                              <span className="font-mono font-bold text-white">${precioBase.toFixed(2)} USD</span>
                            </div>
                            <div className="flex justify-between text-[11px] text-amber-300">
                              <span>Alícuota Autogestión:</span>
                              <span className="font-mono font-bold">+${alicuota.toFixed(2)} USD</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-slate-800 font-bold text-white">
                              <span>Total Vecino:</span>
                              <div className="text-right">
                                <span className="font-bold text-emerald-400 block">${totalUsd.toFixed(2)} USD</span>
                                <span className="text-[10px] text-slate-400 font-mono">≈ Bs. {totalBs.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-850 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleActivoServicio(serv)}
                              className="text-[11px] font-semibold text-slate-400 hover:text-white transition"
                            >
                              {serv.activo ? 'Pausar' : 'Activar'}
                            </button>
                            {user?.rol === 'SUPER_ADMIN' && (
                              <button
                                type="button"
                                onClick={() => eliminarServicioCatalogo(serv)}
                                className="text-[11px] font-semibold text-red-400 hover:text-red-300 transition flex items-center gap-0.5"
                                title="Eliminar rubro del catálogo"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Eliminar</span>
                              </button>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setServicioEditando(serv);
                              setServicioForm({
                                id: serv.id,
                                nombre: serv.nombre,
                                categoria: serv.categoria || 'GAS',
                                costo_base_usd: precioBase,
                                precio_usd: precioBase,
                                alicuota_autogestion_usd: alicuota,
                                descripcion: serv.descripcion || '',
                                activo: serv.activo !== undefined ? serv.activo : 1,
                              });
                              setModalServicio(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-bold transition flex items-center gap-1 border border-amber-500/30"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Configurar Precio</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            )}

            {/* SECCIÓN 4: CONVOCATORIAS DE JORNADAS DE SERVICIOS (DISTRIBUCIÓN DE GAS Y OTROS) */}
            {(configSubTab === 'todo' || configSubTab === 'jornadas') && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-purple-600/20 text-purple-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Jornadas Comunitarias de Servicios (Gas Comunal)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                        {jornadas.length} Convocatorias
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Convocatorias con límite de bombonas por familia censada y control de aportes para contraloría.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={abrirModalNuevaJornada}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-md shadow-purple-600/20 transition shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Nueva Jornada</span>
                </button>
              </div>

              {loadingJornadas ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-400" />
                  <span>Cargando jornadas comunitarias...</span>
                </div>
              ) : jornadas.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-950/60 rounded-2xl border border-slate-800">
                  No hay jornadas registradas. Crea una nueva jornada para habilitar la solicitud y declaración de gas comunal a los vecinos.
                </div>
              ) : (
                <div className="space-y-3">
                  {jornadas.map((jorn) => {
                    const isActiva = (jorn.estado === 'ACTIVA' || jorn.estado === 'ABIERTA');
                    const isEnEspera = jorn.estado === 'EN_ESPERA';
                    const fIniStr = (jorn.fecha_inicio || '').trim();
                    const esFechaPendiente = isEnEspera || fIniStr.toLowerCase().includes('definir') || fIniStr.toLowerCase().includes('espera') || !fIniStr;

                    return (
                      <div
                        key={jorn.id}
                        className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-750 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/25">
                              {jorn.categoria || 'GAS'}
                            </span>
                            <h4 className="font-extrabold text-white text-sm">{jorn.titulo}</h4>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                              isActiva
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : isEnEspera
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            }`}>
                              {isActiva ? '● ACTIVA (Visible en Portal)' : isEnEspera ? '⏳ EN ESPERA DE ASIGNACIÓN DE FECHA' : '○ DESACTIVADA / CERRADA (Oculta)'}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              Máx {jorn.max_unidades_por_familia} unid / familia censada
                            </span>
                            {Number(jorn.total_solicitudes) > 0 && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                {jorn.total_solicitudes} aporte(s)
                              </span>
                            )}
                          </div>

                          <div className="text-slate-400 text-[11px] flex flex-wrap items-center gap-x-3 gap-y-1">
                            {esFechaPendiente ? (
                              <span className="inline-flex items-center gap-1 text-amber-300 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                <Clock className="w-3 h-3" />
                                <span>Fecha: A la espera de confirmación por la empresa distribuidora</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-300">
                                <Calendar className="w-3 h-3 text-purple-400" />
                                <span>Fecha Programada: <strong className="text-white">{jorn.fecha_inicio}</strong></span>
                                {jorn.fecha_fin && <> · Cierre: <strong className="text-white">{jorn.fecha_fin}</strong></>}
                              </span>
                            )}
                          </div>

                          {jorn.descripcion && (
                            <p className="text-slate-400 text-[11px] bg-slate-900/60 p-2 rounded-xl border border-slate-850">
                              {jorn.descripcion}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                          {/* Botón Editar Jornada */}
                          <button
                            type="button"
                            onClick={() => abrirModalEditarJornada(jorn)}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-bold border border-amber-500/30 transition flex items-center gap-1"
                            title="Modificar fecha, reprogramar por adelanto/demora, cupo o descripción"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>

                          {/* Botón Ver Aportes */}
                          <button
                            type="button"
                            onClick={() => {
                              setJornadaSeleccionadaId(jorn.id);
                              setPagosSubTab('servicios');
                              navigateTo('pagos');
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold border border-slate-700 transition flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-400" />
                            <span>Aportes</span>
                          </button>

                          {/* Botón Toggle Estado */}
                          <button
                            type="button"
                            onClick={() => cambiarEstadoJornada(jorn.id, isActiva ? 'CERRADA' : 'ACTIVA')}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                              isActiva
                                ? 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30'
                                : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30'
                            }`}
                          >
                            <span>{isActiva ? 'Pausar' : 'Activar'}</span>
                          </button>

                          {/* Botón Eliminar Jornada */}
                          <button
                            type="button"
                            onClick={() => eliminarJornada(jorn)}
                            className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition"
                            title="Eliminar convocatoria de jornada"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            )}

            {/* SECCIÓN: VALORES Y GRATUIDAD POR TIPO DE DOCUMENTO */}
            {(configSubTab === 'todo' || configSubTab === 'tarifas') && (
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
            )}

            {/* SECCIÓN: PRESETS OFICIALES (LOGOS E IMÁGENES DEL SISTEMA & MODELADOR) */}
            {(configSubTab === 'todo' || configSubTab === 'general') && (
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
            )}

            {/* SECCIÓN: CATÁLOGOS OFICIALES Y SISTEMA DE SELECCIONES (PARENTESCO, INSTRUCCIÓN, SALUD) */}
            {(configSubTab === 'todo' || configSubTab === 'general') && (
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
            )}

            {/* SECCIÓN: CONFIGURADOR TERRITORIAL (VEREDAS A–O Y CASAS) */}
            {(configSubTab === 'todo' || configSubTab === 'territorio') && (
              <ConfiguradorTerritorio />
            )}

            {/* SECCIÓN: RESPALDO INTEGRAL DE BASE DE DATOS */}
            {(configSubTab === 'todo' || configSubTab === 'respaldo') && (
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5 text-xs shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30">
                      <Database className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                        <span>Copia de Seguridad y Respaldo de Base de Datos</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          Super Admin
                        </span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Exportación completa de todas las tablas, esquemas, registros de vecinos, censo, solicitudes y bitácora
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={cargarBackupStats}
                    disabled={loadingBackupStats}
                    className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-750 text-slate-300 hover:text-white flex items-center gap-1.5 transition text-xs shrink-0 self-start sm:self-auto"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingBackupStats ? 'animate-spin' : ''}`} />
                    <span>Actualizar Diagnóstico</span>
                  </button>
                </div>

                {/* Tarjetas de Diagnóstico y Estado */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Tablas del Sistema</span>
                    <span className="text-lg font-black text-white font-mono">
                      {loadingBackupStats ? '...' : (backupStats?.totalTablas || '—')}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Tablas activas</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Total de Registros</span>
                    <span className="text-lg font-black text-emerald-400 font-mono">
                      {loadingBackupStats ? '...' : (backupStats?.totalRegistros ?? '—')}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Filas en BD</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Motor de Datos</span>
                    <span className="text-xs font-bold text-purple-300 truncate block">
                      {backupStats?.motor || 'Turso LibSQL Cloud'}
                    </span>
                    <span className="text-[10px] text-slate-400 block">SQLite Compatible</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Último Respaldo</span>
                    <span className="text-[11px] font-semibold text-slate-300 truncate block">
                      {backupStats?.ultimoRespaldo
                        ? new Date(backupStats.ultimoRespaldo).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })
                        : 'Nunca'}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Registro auditable</span>
                  </div>
                </div>

                {/* Botones de Descarga en Formatos Oficiales */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  
                  {/* Tarjeta Opción 1: JSON Estructurado */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/30 to-slate-950 border border-blue-500/30 flex flex-col justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          JSON
                        </span>
                        <h3 className="font-bold text-white text-xs">Respaldo Integral Estructurado</h3>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Exporta metadatos, esquemas DDL y todos los objetos JSON de cada tabla. Ideal para migraciones, análisis automatizado o almacenamiento offline.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={descargandoBackup}
                      onClick={() => descargarBackup('json')}
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
                    >
                      <Download className="w-4 h-4" />
                      <span>{descargandoBackup ? 'Generando Archivo...' : 'Descargar Respaldo JSON (.json)'}</span>
                    </button>
                  </div>

                  {/* Tarjeta Opción 2: Volcado SQL */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/30 to-slate-950 border border-emerald-500/30 flex flex-col justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          SQL DUMP
                        </span>
                        <h3 className="font-bold text-white text-xs">Volcado SQL Ejecutable Directo</h3>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Script estándar con sentencias <code className="text-emerald-300 font-mono">CREATE TABLE</code> e <code className="text-emerald-300 font-mono">INSERT OR REPLACE</code> dentro de una transacción. Listo para restaurar en Turso o SQLite.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={descargandoBackup}
                      onClick={() => descargarBackup('sql')}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30"
                    >
                      <Download className="w-4 h-4" />
                      <span>{descargandoBackup ? 'Generando Volcado...' : 'Descargar Volcado SQL (.sql)'}</span>
                    </button>
                  </div>
                </div>

                {/* Desglose de Tablas Existentes */}
                {backupStats?.tablas && backupStats.tablas.length > 0 && (
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide block">
                      📋 Desglose de Contenido por Tablas:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {backupStats.tablas.map((t) => (
                        <div
                          key={t.nombre}
                          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between gap-2"
                        >
                          <span className="font-mono text-slate-300 font-semibold truncate text-[11px]" title={t.nombre}>
                            {t.nombre}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-800 text-slate-300 shrink-0">
                            {t.registros} reg.
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recomendaciones de Seguridad Comunal */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-start gap-3 text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <strong className="text-slate-200">Recomendación de Resguardo Comunitario:</strong> Se aconseja descargar un respaldo periódico (semanal o tras jornadas masivas de censo) y guardarlo en una memoria USB o almacenamiento seguro fuera de línea como salvaguarda del patrimonio digital del Consejo Comunal Las Llaves.
                  </p>
                </div>
              </div>
            )}

            {/* ZONA DE PELIGRO / PASE A PRODUCCIÓN */}
            {(configSubTab === 'todo' || configSubTab === 'general') && (
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
            )}
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
                1 Planilla por Vivienda • Permite registrar múltiples familias e integrantes sin límite por vivienda
              </p>
            </div>

            <form
              key={planillaActiva?.planilla?.id ? `edit-censo-${planillaActiva.planilla.id}` : `new-censo-${planillaActiva?.planilla?.numero_planilla || numeroPlanillaModal || 'auto'}`}
              onSubmit={async (e) => {
                e.preventDefault();
                if (guardandoCenso) return;
                setGuardandoCenso(true);

                const formData = new FormData(e.target);

                // Recopilar habitantes desde el estado controlado (o fallback a FormData) y deduplicar
                const fuenteHabs = Array.isArray(planillaActiva?.habitantes) && planillaActiva.habitantes.length > 0
                  ? planillaActiva.habitantes
                  : [];

                const habList = [];
                const vistosSubmit = new Set();

                for (let i = 0; i < fuenteHabs.length; i++) {
                  const item = fuenteHabs[i] || {};
                  const nroFam = item.numero_familia ?? formData.get(`hab_${i}_fam`) ?? '1';
                  const nom = String(item.nombres_apellidos ?? formData.get(`hab_${i}_nombre`) ?? '').trim().toUpperCase().replace(/\s+/g, ' ');
                  if (!nom) continue;

                  const ced = String(item.cedula ?? formData.get(`hab_${i}_cedula`) ?? '').trim().toUpperCase();
                  const fecNac = String(item.fecha_nacimiento ?? formData.get(`hab_${i}_fecha_nac`) ?? '').trim();
                  const claveUnica = `${nom}|${ced}|${fecNac}`;
                  if (vistosSubmit.has(claveUnica)) continue;
                  vistosSubmit.add(claveUnica);

                  habList.push({
                    numero_familia: Number(nroFam) || 1,
                    nombres_apellidos: nom,
                    cedula: ced,
                    sexo: item.sexo || formData.get(`hab_${i}_sexo`) || 'M',
                    fecha_nacimiento: fecNac,
                    parentesco: item.parentesco || formData.get(`hab_${i}_parentesco`) || 'a',
                    instruccion: item.instruccion || formData.get(`hab_${i}_instruccion`) || 'c',
                    profesion_ocupacion: String(item.profesion_ocupacion ?? formData.get(`hab_${i}_ocupacion`) ?? '').trim(),
                    salud: item.salud || formData.get(`hab_${i}_salud`) || 'e',
                    telefono_movil: String(item.telefono_movil ?? formData.get(`hab_${i}_telefono`) ?? '').trim(),
                    vecino_id: item.vecino_id || null,
                    aprobar_en_padron: Boolean(item.aprobar_en_padron),
                  });
                }

                const payload = {
                  numero_planilla: (numeroPlanillaModal || formData.get('numero_planilla') || '').trim(),
                  fecha: formData.get('fecha') || new Date().toISOString().split('T')[0],
                  empadronador_nombre: (formData.get('empadronador_nombre') || user?.nombre || '').trim().toUpperCase(),
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
                } finally {
                  setGuardandoCenso(false);
                }
              }}
              className="space-y-6 text-xs"
            >
              {/* ALERTA OBLIGATORIA AL TRANSCRIPTOR */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/50 text-amber-200 flex items-start gap-3.5 shadow-xl shadow-amber-950/30">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-black text-sm text-amber-300 tracking-wide uppercase flex items-center gap-1.5">
                      <span>⚠️ ATENCIÓN OBLIGATORIA AL TRANSCRIPTOR</span>
                    </h4>
                    <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-slate-900 border border-amber-500/40 text-amber-300 font-extrabold tracking-wider shadow">
                      CÓDIGO ASIGNADO: {numeroPlanillaModal || planillaActiva?.planilla?.numero_planilla || 'PLC-A0A0A0'}
                    </span>
                  </div>
                  <p className="text-xs text-amber-100/90 leading-relaxed">
                    Antes de guardar, <strong className="text-white underline font-black">debe escribir a mano este número de planilla</strong> en la parte superior del formato físico en papel. Al utilizar identificadores alfanuméricos aleatorios únicos (ej: <span className="font-mono text-amber-300 font-bold">PLC-A0A0A0</span>), evitamos huecos y planillas vacías si un formulario físico no se llegara a procesar.
                  </p>
                </div>
              </div>

              {/* ENCABEZADO: Planilla N°, Fecha, Empadronador */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-bold">Planilla N° *</label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const newCode = generarNumeroPlanillaAlfanumericoClient();
                          setNumeroPlanillaModal(newCode);
                          toast.info(`Nuevo código asignado: ${newCode}. Escríbalo en la planilla física.`);
                        }}
                        title="Generar nuevo código alfanumérico aleatorio"
                        className="px-2 py-0.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[10px] font-bold flex items-center gap-1 transition"
                      >
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>Nuevo Código</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const val = numeroPlanillaModal || planillaActiva?.planilla?.numero_planilla;
                          if (val) {
                            navigator.clipboard?.writeText(val);
                            toast.success(`Copiado al portapapeles: ${val}`);
                          }
                        }}
                        title="Copiar código"
                        className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    name="numero_planilla"
                    required
                    value={numeroPlanillaModal}
                    onChange={(e) => setNumeroPlanillaModal(e.target.value.toUpperCase())}
                    placeholder="Ej: PLC-A0A0A0"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white font-mono font-bold tracking-wider focus:border-blue-500 outline-none uppercase"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Identificador alfanumérico único aleatorio (Ej: PLC-A0A0A0)</span>
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
                    defaultValue={(planillaActiva?.planilla?.empadronador_nombre || user?.nombre || '').toUpperCase()}
                    onInput={(e) => { e.target.value = e.target.value.toUpperCase(); }}
                    placeholder="NOMBRE DEL VOCERO CENSISTA"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white uppercase focus:border-blue-500 outline-none"
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
                  <SelectorVeredaCasa
                    idPrefix="censo"
                    nameVereda="calle_vereda_av"
                    nameCasa="numero_casa"
                    labelVereda="Calle / Vereda / Av *"
                    defaultVereda={planillaActiva?.planilla?.calle_vereda_av || 'A'}
                    defaultCasa={planillaActiva?.planilla?.numero_casa || ''}
                    onSelectCasa={(v, c) => abrirPlanillaPorVivienda(v, c, true)}
                  />

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
                      value={planillaActiva?.habitantes?.length || planillaActiva?.planilla?.total_habitantes || 1}
                      readOnly
                      className="w-full px-3 py-2 rounded-xl bg-slate-900/70 border border-slate-750 text-emerald-400 font-bold outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN II: REGISTRO SOCIODEMOGRÁFICO POR HABITANTE */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <span className="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center text-xs">II</span>
                    <span>SECCIÓN II: REGISTRO SOCIODEMOGRÁFICO POR HABITANTE</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={agregarHabitanteACenso}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow transition"
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

                {/* Lista / Tabla de Habitantes Responsive (Estado Controlado + Clave Única por Habitante) */}
                <div className="space-y-3">
                  {(planillaActiva?.habitantes && planillaActiva.habitantes.length > 0
                    ? planillaActiva.habitantes
                    : [{ _uid: 'hab_default_0', numero_familia: 1, nombres_apellidos: '', sexo: 'M', parentesco: 'a', instruccion: 'c', salud: 'e' }]
                  ).map((hab, idx) => (
                    <div
                      key={hab._uid || hab.id || `hab_row_${idx}`}
                      className={`p-3.5 rounded-xl border transition space-y-3 ${
                        hab.vecino_id
                          ? hab.estado_vecino === 'PENDIENTE'
                            ? 'bg-amber-950/15 border-amber-500/40 hover:border-amber-500/60'
                            : 'bg-emerald-950/10 border-emerald-500/30 hover:border-emerald-500/50'
                          : 'bg-slate-900/90 border-slate-800/90 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-300">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-mono font-black text-xs">
                            #{idx + 1}
                          </span>
                          <span>Habitante N° {idx + 1}</span>

                          {hab.vecino_id && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                                hab.estado_vecino === 'PENDIENTE'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {hab.origen_vecinos === 'DESDE_VECINOS'
                                ? `🆕 Precargado de #vecinos (${hab.estado_vecino})`
                                : `🔗 Vinculado con #vecinos (${hab.estado_vecino}) · Sin duplicar`}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          {hab.vecino_id && hab.estado_vecino === 'PENDIENTE' && checkPermiso('vecinos_aprobar') && (
                            <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/30 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(hab.aprobar_en_padron)}
                                onChange={(e) => actualizarHabitanteCenso(idx, 'aprobar_en_padron', e.target.checked)}
                                className="rounded accent-emerald-500"
                              />
                              <span>Aprobar en #vecinos al guardar</span>
                            </label>
                          )}

                          {(planillaActiva?.habitantes?.length || 1) > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setPlanillaActiva((prev) => {
                                  const lista = (prev?.habitantes || []).filter((_, i) => i !== idx);
                                  return {
                                    ...prev,
                                    planilla: {
                                      ...(prev?.planilla || {}),
                                      total_habitantes: Math.max(1, lista.length),
                                    },
                                    habitantes: lista.length > 0 ? lista : [crearHabitanteVacio(1, 'a')],
                                  };
                                });
                              }}
                              className="text-rose-400 hover:text-rose-300 text-[11px] font-semibold flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Quitar</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {hab.datos_vecino_portal && (
                        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>
                              📋 <strong className="text-amber-300">Datos en #vecinos:</strong> {hab.datos_vecino_portal.nombre_completo} ({hab.datos_vecino_portal.cedula})
                            </span>
                            {hab.datos_vecino_portal.parentesco_declarado && (
                              <span>
                                • Declaró Parentesco: <strong className="text-white">{hab.datos_vecino_portal.parentesco_declarado}</strong> (ajuste abajo si no es el Jefe/Dueño)
                              </span>
                            )}
                            {hab.datos_vecino_portal.fecha_nacimiento && (
                              <span>• Nac: {hab.datos_vecino_portal.fecha_nacimiento}</span>
                            )}
                            {hab.datos_vecino_portal.telefono && (
                              <span>• Tel: {hab.datos_vecino_portal.telefono}</span>
                            )}
                          </div>

                          {hab.datos_vecino_portal.cedula_difiere && (
                            <button
                              type="button"
                              onClick={() => actualizarHabitanteCenso(idx, 'cedula', hab.datos_vecino_portal.cedula)}
                              className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] font-bold transition"
                            >
                              Usar C.I. {hab.datos_vecino_portal.cedula}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Campos del habitante (controlados) */}
                      <div className="grid grid-cols-2 sm:grid-cols-6 lg:grid-cols-12 gap-2 text-xs">
                        {/* Fam N° */}
                        <div className="col-span-1 sm:col-span-1 lg:col-span-1">
                          <label className="block text-[10px] text-slate-400 mb-0.5">Fam N°</label>
                          <input
                            type="number"
                            name={`hab_${idx}_fam`}
                            min="1"
                            max="9"
                            value={hab.numero_familia ?? 1}
                            onChange={(e) => actualizarHabitanteCenso(idx, 'numero_familia', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-center font-bold"
                          />
                        </div>

                        {/* Nombres y Apellidos */}
                        <div className="col-span-2 sm:col-span-3 lg:col-span-3">
                          <label className="block text-[10px] text-slate-400 mb-0.5">Nombres y Apellidos *</label>
                          <input
                            type="text"
                            name={`hab_${idx}_nombre`}
                            value={hab.nombres_apellidos ?? ''}
                            onChange={(e) => actualizarHabitanteCenso(idx, 'nombres_apellidos', e.target.value.toUpperCase())}
                            placeholder="NOMBRE COMPLETO"
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
                            value={hab.cedula ?? ''}
                            onChange={(e) => actualizarHabitanteCenso(idx, 'cedula', e.target.value.toUpperCase())}
                            placeholder="V-12345678"
                            className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
                          />
                        </div>

                        {/* Sexo */}
                        <div className="col-span-1 sm:col-span-1 lg:col-span-1">
                          <label className="block text-[10px] text-slate-400 mb-0.5">Sexo</label>
                          <select
                            name={`hab_${idx}_sexo`}
                            value={hab.sexo || 'M'}
                            onChange={(e) => actualizarHabitanteCenso(idx, 'sexo', e.target.value)}
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
                            value={hab.fecha_nacimiento ?? ''}
                            onChange={(e) => actualizarHabitanteCenso(idx, 'fecha_nacimiento', e.target.value)}
                            placeholder="DD/MM/AAAA"
                            className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
                          />
                        </div>

                        {/* Parentesco */}
                        <div className="col-span-1 sm:col-span-2 lg:col-span-2">
                          <label className="block text-[10px] text-slate-400 mb-0.5">Parentesco</label>
                          <select
                            name={`hab_${idx}_parentesco`}
                            value={hab.parentesco || (idx === 0 ? 'a' : 'c')}
                            onChange={(e) => actualizarHabitanteCenso(idx, 'parentesco', e.target.value)}
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
                            value={hab.instruccion || 'c'}
                            onChange={(e) => actualizarHabitanteCenso(idx, 'instruccion', e.target.value)}
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
                            value={hab.profesion_ocupacion ?? ''}
                            onChange={(e) => actualizarHabitanteCenso(idx, 'profesion_ocupacion', e.target.value)}
                            placeholder="Ej: Docente, Estudiante"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
                          />
                        </div>

                        {/* Salud */}
                        <div className="col-span-1 sm:col-span-2 lg:col-span-2">
                          <label className="block text-[10px] text-slate-400 mb-0.5">Salud</label>
                          <select
                            name={`hab_${idx}_salud`}
                            value={hab.salud || 'e'}
                            onChange={(e) => actualizarHabitanteCenso(idx, 'salud', e.target.value)}
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
                            value={hab.telefono_movil ?? ''}
                            onChange={(e) => actualizarHabitanteCenso(idx, 'telefono_movil', e.target.value)}
                            placeholder="0412-1234567"
                            className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botón al final de la SECCIÓN II para agregar nuevo habitante cómodamente */}
                <div className="pt-3 pb-1 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-850 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>
                      Total registrados en esta vivienda: <strong className="text-white font-mono font-bold">{(planillaActiva?.habitantes?.length || 1)}</strong> {((planillaActiva?.habitantes?.length || 1) === 1 ? 'persona' : 'personas')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={agregarHabitanteACenso}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition border border-emerald-500/30 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Agregar Habitante #{(planillaActiva?.habitantes?.length || 1) + 1}</span>
                  </button>
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
                  disabled={guardandoCenso}
                  className="w-full sm:w-2/3 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
                >
                  {guardandoCenso ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Guardando Planilla...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Guardar Planilla Oficial de Censo</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo / Editar Registro de Vecino Individual */}
      {modalNuevoVecino && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setModalNuevoVecino(false);
                setVecinoEditando(null);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">
              {vecinoEditando ? 'Editar Vecino del Padrón' : 'Registrar Nuevo Vecino'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {vecinoEditando
                ? `Actualizando datos censales de ${vecinoEditando.nombres} ${vecinoEditando.apellidos}`
                : 'Incorporación manual al Padrón Oficial de la Comunidad'}
            </p>

            <form
              key={vecinoEditando ? `edit-vecino-${vecinoEditando.id}` : 'new-vecino'}
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const payload = {
                  ...(vecinoEditando ? { id: vecinoEditando.id } : { action: 'create' }),
                  cedula: (formData.get('cedula') || '').trim().toUpperCase(),
                  nombres: (formData.get('nombres') || '').trim().toUpperCase(),
                  apellidos: (formData.get('apellidos') || '').trim().toUpperCase(),
                  vereda: (formData.get('vereda') || 'A').trim().toUpperCase(),
                  casa: (formData.get('casa') || '').trim().toUpperCase(),
                  sexo: formData.get('sexo') || 'M',
                  fecha_nacimiento: (formData.get('fecha_nacimiento') || '').trim(),
                  tiempo_residencia: (formData.get('tiempo_residencia') || '').trim(),
                  calidad_tenencia: formData.get('calidad_tenencia') || 'Propia',
                  telefono: (formData.get('telefono') || '').trim(),
                  email: (formData.get('email') || '').trim(),
                };
                if (vecinoEditando && formData.get('estado_aprobacion')) {
                  payload.estado_aprobacion = formData.get('estado_aprobacion');
                }
                if (vecinoEditando && formData.get('observaciones') !== null) {
                  payload.observaciones = (formData.get('observaciones') || '').trim();
                }

                try {
                  const res = await fetch('/api/vecinos', {
                    method: vecinoEditando ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                  });
                  const d = await res.json();
                  if (res.ok) {
                    toast.success(
                      d.message ||
                        (vecinoEditando
                          ? 'Datos del vecino actualizados correctamente'
                          : 'Vecino registrado satisfactoriamente')
                    );
                    setModalNuevoVecino(false);
                    setVecinoEditando(null);
                    cargarVecinos();
                    cargarEstadisticas();
                  } else {
                    toast.error(d.error || 'Error al guardar vecino');
                  }
                } catch (err) {
                  toast.error('Error de red al guardar vecino');
                }
              }}
              className="space-y-4 text-xs"
            >
              <div className={vecinoEditando && checkPermiso('vecinos_aprobar') ? 'grid grid-cols-2 gap-3' : ''}>
                <div>
                  <label className="block text-slate-400 mb-1">Cédula de Identidad *</label>
                  <input
                    type="text"
                    name="cedula"
                    required
                    defaultValue={vecinoEditando?.cedula || ''}
                    onInput={(e) => { e.target.value = e.target.value.toUpperCase(); }}
                    placeholder="V-12345678"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white font-mono font-bold uppercase focus:border-blue-500 outline-none"
                  />
                </div>
                {vecinoEditando && checkPermiso('vecinos_aprobar') && (
                  <div>
                    <label className="block text-slate-400 mb-1">Estatus en Padrón *</label>
                    <select
                      name="estado_aprobacion"
                      defaultValue={vecinoEditando?.estado_aprobacion || 'APROBADO'}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white font-bold focus:border-blue-500 outline-none"
                    >
                      <option value="APROBADO">✅ APROBADO (En Padrón)</option>
                      <option value="PENDIENTE">⏳ PENDIENTE</option>
                      <option value="RECHAZADO">❌ RECHAZADO</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Nombres (MAYÚSCULAS) *</label>
                  <input
                    type="text"
                    name="nombres"
                    required
                    defaultValue={(vecinoEditando?.nombres || '').toUpperCase()}
                    onInput={(e) => { e.target.value = e.target.value.toUpperCase(); }}
                    placeholder="EJ: PEDRO JOSÉ"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white uppercase focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Apellidos (MAYÚSCULAS) *</label>
                  <input
                    type="text"
                    name="apellidos"
                    required
                    defaultValue={(vecinoEditando?.apellidos || '').toUpperCase()}
                    onInput={(e) => { e.target.value = e.target.value.toUpperCase(); }}
                    placeholder="EJ: PÉREZ GÓMEZ"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white uppercase focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SelectorVeredaCasa
                  idPrefix="vecino"
                  nameVereda="vereda"
                  nameCasa="casa"
                  defaultVereda={vecinoEditando?.vereda || 'A'}
                  defaultCasa={vecinoEditando?.casa || ''}
                  selectClassName="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Sexo</label>
                  <select
                    name="sexo"
                    defaultValue={vecinoEditando?.sexo || 'M'}
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
                    defaultValue={vecinoEditando?.fecha_nacimiento || ''}
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
                    defaultValue={vecinoEditando?.calidad_tenencia || 'Propia'}
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
                    defaultValue={vecinoEditando?.tiempo_residencia || ''}
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
                    defaultValue={vecinoEditando?.telefono || ''}
                    placeholder="0414-1234567"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={vecinoEditando?.email || ''}
                    placeholder="correo@ejemplo.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {vecinoEditando && (
                <div>
                  <label className="block text-slate-400 mb-1">Observaciones / Notas del Padrón</label>
                  <input
                    type="text"
                    name="observaciones"
                    defaultValue={vecinoEditando?.observaciones || ''}
                    placeholder="Opcional: notas administrativas sobre el registro"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white focus:border-blue-500 outline-none"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>{vecinoEditando ? 'Guardar Cambios del Vecino' : 'Registrar Vecino en Padrón'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Documento Emitido (SUPER_ADMIN CRUD) */}
      {documentoEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setDocumentoEditando(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Editar Documento Emitido</h3>
            <p className="text-xs text-slate-400 mb-4">
              Correlativo: <span className="font-mono font-bold text-blue-400">{documentoEditando.correlativo}</span>
            </p>

            <form
              key={`edit-doc-${documentoEditando.id}`}
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const payload = {
                  id: documentoEditando.id,
                  cedula: (formData.get('cedula') || '').trim().toUpperCase(),
                  nombres_apellidos: (formData.get('nombres_apellidos') || '').trim().toUpperCase(),
                  vereda: (formData.get('vereda') || '').trim().toUpperCase(),
                  casa: (formData.get('casa') || '').trim().toUpperCase(),
                  tiempo_residencia: (formData.get('tiempo_residencia') || '').trim(),
                  calidad_tenencia: formData.get('calidad_tenencia') || 'Propia',
                  estado: formData.get('estado') || 'EMITIDO',
                  fecha_emision: (formData.get('fecha_emision') || '').trim(),
                  fecha_vencimiento: (formData.get('fecha_vencimiento') || '').trim(),
                  monto_bs: Number(formData.get('monto_bs') || 0),
                  monto_usd: Number(formData.get('monto_usd') || 0),
                  banco_nombre: (formData.get('banco_nombre') || '').trim(),
                  numero_transferencia: (formData.get('numero_transferencia') || '').trim(),
                  motivo_exoneracion: (formData.get('motivo_exoneracion') || '').trim(),
                };

                try {
                  const res = await fetch('/api/documentos', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                  });
                  const d = await res.json();
                  if (res.ok) {
                    toast.success(d.message || 'Documento actualizado correctamente');
                    setDocumentoEditando(null);
                    cargarDocumentos();
                    cargarEstadisticas();
                  } else {
                    toast.error(d.error || 'Error al actualizar documento');
                  }
                } catch (err) {
                  toast.error('Error de red al actualizar documento');
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Cédula *</label>
                  <input
                    type="text"
                    name="cedula"
                    required
                    defaultValue={documentoEditando.cedula || ''}
                    onInput={(e) => { e.target.value = e.target.value.toUpperCase(); }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white font-mono font-bold uppercase focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Estatus del Documento *</label>
                  <select
                    name="estado"
                    defaultValue={documentoEditando.estado || 'EMITIDO'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white font-bold focus:border-blue-500 outline-none"
                  >
                    <option value="EMITIDO">✅ EMITIDO (Válido)</option>
                    <option value="REVOCADO">❌ REVOCADO / ANULADO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Nombres y Apellidos (MAYÚSCULAS) *</label>
                <input
                  type="text"
                  name="nombres_apellidos"
                  required
                  defaultValue={(documentoEditando.nombres_apellidos || '').toUpperCase()}
                  onInput={(e) => { e.target.value = e.target.value.toUpperCase(); }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white uppercase focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Vereda</label>
                  <input
                    type="text"
                    name="vereda"
                    defaultValue={documentoEditando.vereda || ''}
                    onInput={(e) => { e.target.value = e.target.value.toUpperCase(); }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white uppercase focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Casa</label>
                  <input
                    type="text"
                    name="casa"
                    defaultValue={documentoEditando.casa || ''}
                    onInput={(e) => { e.target.value = e.target.value.toUpperCase(); }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white uppercase focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Fecha de Emisión</label>
                  <input
                    type="text"
                    name="fecha_emision"
                    defaultValue={documentoEditando.fecha_emision || ''}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Fecha de Vencimiento</label>
                  <input
                    type="text"
                    name="fecha_vencimiento"
                    defaultValue={documentoEditando.fecha_vencimiento || ''}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Monto Aporte (Bs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="monto_bs"
                    defaultValue={documentoEditando.monto_bs || 0}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Monto Aporte (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="monto_usd"
                    defaultValue={documentoEditando.monto_usd || 0}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Banco / Origen</label>
                  <input
                    type="text"
                    name="banco_nombre"
                    defaultValue={documentoEditando.banco_nombre || ''}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Referencia Bancaria</label>
                  <input
                    type="text"
                    name="numero_transferencia"
                    defaultValue={documentoEditando.numero_transferencia || ''}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white font-mono focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Motivo de Exoneración / Nota</label>
                <input
                  type="text"
                  name="motivo_exoneracion"
                  defaultValue={documentoEditando.motivo_exoneracion || ''}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white focus:border-blue-500 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Guardar Cambios del Documento</span>
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
                    placeholder="EJ: VOCERO EJECUTIVO C.C., CONTRALORÍA SOCIAL, ETC."
                    value={modalFirma.comision}
                    onChange={(e) => setModalFirma({ ...modalFirma, comision: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white font-medium uppercase"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="NOMBRE Y APELLIDO"
                    value={modalFirma.nombre}
                    onChange={(e) => setModalFirma({ ...modalFirma, nombre: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white uppercase"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Cédula de Identidad *</label>
                  <input
                    type="text"
                    required
                    placeholder="V-12345678"
                    value={modalFirma.cedula}
                    onChange={(e) => setModalFirma({ ...modalFirma, cedula: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white font-mono uppercase"
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
                {usuarioEditando ? `Editar Usuario y Permisos: ${usuarioForm.username || usuarioEditando.username}` : 'Crear Nuevo Vocero o Administrador'}
              </h3>
              <p className="text-xs text-slate-400">
                Edición integral de credenciales (usuario, contraseña, nombre, comisión, rol, estado) y matriz de permisos granulares.
              </p>
            </div>

            {/* Presets Rápidos */}
            <div className="mb-5 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                ⚡ Perfiles Rápidos Preconfigurados:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <button
                  type="button"
                  onClick={() => aplicarPreset('CENSISTA')}
                  className={`p-2 rounded-xl text-left border transition ${
                    presetSeleccionado === 'CENSISTA'
                      ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-bold block text-emerald-400">Encuestador / Digitalizador</span>
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
                  onClick={() => aplicarPreset('CONTRALORIA')}
                  className={`p-2 rounded-xl text-left border transition ${
                    presetSeleccionado === 'CONTRALORIA'
                      ? 'bg-teal-600/20 border-teal-500 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-bold block text-teal-400">Contraloría</span>
                  <span className="text-[10px] text-slate-400">Solo Ver y Aprobar (Vecinos externos, sin CRUD)</span>
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
                  onClick={() => aplicarPreset('SUPER_ADMIN')}
                  className={`p-2 rounded-xl text-left border transition ${
                    presetSeleccionado === 'SUPER_ADMIN'
                      ? 'bg-fuchsia-600/20 border-fuchsia-500 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-bold block text-fuchsia-400">Super Admin</span>
                  <span className="text-[10px] text-slate-400">Control Total del Sistema</span>
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
                const username = (usuarioForm.username || '').trim().toUpperCase();
                const nombre = (usuarioForm.nombre || '').trim().toUpperCase();
                const password = (usuarioForm.password || '').trim();
                const rol = usuarioForm.rol || 'VOCERO';
                const comision = (usuarioForm.comision || '').trim().toUpperCase();
                const email = (usuarioForm.email || '').trim();
                const telefono = (usuarioForm.telefono || '').trim();
                const activo = usuarioForm.activo === '1';

                if (!username || !nombre) {
                  toast.error('El usuario de acceso y el nombre completo son obligatorios');
                  return;
                }

                if (usuarioEditando) {
                  // Actualizar usuario existente (CRUD total)
                  const bodyPayload = {
                    action: 'update_user',
                    userId: usuarioEditando.id,
                    username,
                    nombre,
                    rol,
                    comision: comision || null,
                    email: email || null,
                    telefono: telefono || null,
                    activo,
                    permisos: permisosForm,
                  };
                  if (password.length > 0) {
                    bodyPayload.newPassword = password;
                  }

                  const res = await fetch('/api/auth', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bodyPayload),
                  });
                  const d = await res.json();
                  if (res.ok) {
                    toast.success('Usuario y permisos actualizados correctamente');
                    setModalUsuario(false);
                    cargarUsuarios();
                  } else {
                    toast.error(d.error || 'Error al actualizar usuario');
                  }
                } else {
                  // Crear nuevo usuario
                  if (!password) {
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
                      comision: comision || null,
                      email: email || null,
                      telefono: telefono || null,
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
                  <label className="block text-slate-300 font-semibold mb-1">Usuario de Acceso (Login) *</label>
                  <input
                    name="username"
                    value={usuarioForm.username}
                    onChange={(e) => setUsuarioForm({ ...usuarioForm, username: e.target.value.toUpperCase() })}
                    required
                    placeholder="EJ: JACQUELINE"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white uppercase font-mono focus:border-blue-500 outline-none"
                  />
                  <span className="text-[10px] text-emerald-400/80">Editable en todo momento (siempre en MAYÚSCULAS).</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nombre Completo *</label>
                  <input
                    name="nombre"
                    value={usuarioForm.nombre}
                    onChange={(e) => setUsuarioForm({ ...usuarioForm, nombre: e.target.value.toUpperCase() })}
                    required
                    placeholder="NOMBRE Y APELLIDO DEL VOCERO"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white uppercase focus:border-blue-500 outline-none"
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
                      value={usuarioForm.password}
                      onChange={(e) => setUsuarioForm({ ...usuarioForm, password: e.target.value })}
                      required={!usuarioEditando}
                      placeholder={usuarioEditando ? 'Dejar en blanco para mantener la actual' : 'Contraseña segura'}
                      className="w-full pl-3 pr-10 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white font-mono focus:border-blue-500 outline-none"
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
                    value={usuarioForm.comision}
                    onChange={(e) => setUsuarioForm({ ...usuarioForm, comision: e.target.value.toUpperCase() })}
                    placeholder="EJ: CENSO Y POBLACIÓN, HÁBITAT, ETC."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white uppercase focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Correo Electrónico (Email)</label>
                  <input
                    type="email"
                    name="email"
                    value={usuarioForm.email}
                    onChange={(e) => setUsuarioForm({ ...usuarioForm, email: e.target.value })}
                    placeholder="correo@ejemplo.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    name="telefono"
                    value={usuarioForm.telefono}
                    onChange={(e) => setUsuarioForm({ ...usuarioForm, telefono: e.target.value })}
                    placeholder="Ej: 0412-1234567"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nivel / Rol</label>
                  <select
                    name="rol"
                    value={usuarioForm.rol}
                    onChange={(e) => setUsuarioForm({ ...usuarioForm, rol: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white focus:border-blue-500 outline-none"
                  >
                    <option value="VOCERO">VOCERO (Nivel estándar / Encuestador)</option>
                    <option value="CENSISTA">CENSISTA (Encuestador / Digitalizador de Censo)</option>
                    <option value="DOCUMENTAL">DOCUMENTAL (Emisor de Constancias)</option>
                    <option value="CONTRALORIA">CONTRALORIA (Contraloría Social - Ver y Aprobar)</option>
                    <option value="ADMIN">ADMIN (Nivel Administrativo)</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN (Acceso y Control Total)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Estado de Acceso</label>
                  <select
                    name="activo"
                    value={usuarioForm.activo}
                    onChange={(e) => setUsuarioForm({ ...usuarioForm, activo: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white focus:border-blue-500 outline-none"
                  >
                    <option value="1">Habilitado (Permite iniciar sesión)</option>
                    <option value="0">Inhabilitado (Bloquea acceso al sistema)</option>
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
                        checked={Boolean(permisosForm.vecinos_eliminar)}
                        onChange={(e) => {
                          setPermisosForm({ ...permisosForm, vecinos_eliminar: e.target.checked });
                          setPresetSeleccionado('CUSTOM');
                        }}
                        className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span className="text-rose-300">Eliminar Vecinos del Padrón</span>
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

      {/* MODAL CREAR / EDITAR SERVICIO DEL CATÁLOGO */}
      {modalServicio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative text-xs">
            <button
              onClick={() => { setModalServicio(false); setServicioEditando(null); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white">
                  {servicioEditando ? 'Editar Servicio Comunitario' : 'Nuevo Servicio Comunitario'}
                </h3>
                <p className="text-slate-400 text-xs">Catálogo de servicios, bombonas de gas y alícuotas de autogestión</p>
              </div>
            </div>

            <form onSubmit={guardarServicio} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre del Servicio / Producto</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. GAS BOMBONA DE 10 KG o GAS BOMBONA 18 KG"
                  value={servicioForm.nombre}
                  onChange={(e) => setServicioForm({ ...servicioForm, nombre: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Categoría</label>
                  <select
                    value={servicioForm.categoria}
                    onChange={(e) => setServicioForm({ ...servicioForm, categoria: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white text-xs"
                  >
                    <option value="GAS">Gas Comunal</option>
                    <option value="ALIMENTOS">Alimentos / CLAP</option>
                    <option value="AGUA">Agua Potable</option>
                    <option value="SERVICIOS">Servicios Varios</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Estado</label>
                  <select
                    value={servicioForm.activo}
                    onChange={(e) => setServicioForm({ ...servicioForm, activo: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white text-xs"
                  >
                    <option value={1}>Activo (Disponible)</option>
                    <option value={0}>Inactivo (Pausado)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Costo Base ($ USD)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    required
                    value={servicioForm.costo_base_usd}
                    onChange={(e) => setServicioForm({ ...servicioForm, costo_base_usd: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs"
                  />
                  <span className="text-[10px] text-slate-500">Costo directo del proveedor</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Alícuota Autogestión ($ USD)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    required
                    value={servicioForm.alicuota_autogestion_usd}
                    onChange={(e) => setServicioForm({ ...servicioForm, alicuota_autogestion_usd: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 font-mono text-xs font-bold"
                  />
                  <span className="text-[10px] text-amber-400/80">Logística / LOCC Art. 51 Num 3</span>
                </div>
              </div>

              {/* Total Calculado en $ y Bs */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Total a pagar por unidad:</span>
                  <span className="text-white font-bold text-sm">
                    ${(Number(servicioForm.costo_base_usd || 0) + Number(servicioForm.alicuota_autogestion_usd || 0)).toFixed(2)} USD
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Equivalente en Bolívares (BCV):</span>
                  <span className="text-emerald-400 font-black text-sm">
                    Bs. {((Number(servicioForm.costo_base_usd || 0) + Number(servicioForm.alicuota_autogestion_usd || 0)) * Number(tasaBcv)).toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Descripción / Observaciones</label>
                <input
                  type="text"
                  placeholder="Detalles sobre recarga o cilindro..."
                  value={servicioForm.descripcion || ''}
                  onChange={(e) => setServicioForm({ ...servicioForm, descripcion: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setModalServicio(false); setServicioEditando(null); }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{servicioEditando ? 'Guardar Cambios' : 'Registrar Servicio'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR CONVOCATORIA DE JORNADA DE SERVICIOS */}
      {modalNuevaJornada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative text-xs max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => { setModalNuevaJornada(false); setJornadaEditando(null); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-2xl border ${
                jornadaEditando ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
              }`}>
                {jornadaEditando ? <Edit className="w-6 h-6" /> : <Calendar className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white">
                  {jornadaEditando ? 'Editar Convocatoria de Jornada' : 'Nueva Convocatoria de Jornada'}
                </h3>
                <p className="text-slate-400 text-xs">
                  {jornadaEditando
                    ? 'Modifica fechas (adelanto/demora por la empresa), límite o instrucciones'
                    : 'Distribución de gas o servicios con límite por familia censada'}
                </p>
              </div>
            </div>

            <form onSubmit={guardarJornada} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Título de la Jornada *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Jornada de Distribución Gas Comunal - Febrero 2026"
                  value={jornadaForm.titulo}
                  onChange={(e) => setJornadaForm({ ...jornadaForm, titulo: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Categoría del Servicio</label>
                  <select
                    value={jornadaForm.categoria || 'GAS'}
                    onChange={(e) => setJornadaForm({ ...jornadaForm, categoria: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white text-xs font-semibold"
                  >
                    <option value="GAS">GAS (GLP Doméstico)</option>
                    <option value="AGUA">AGUA (Cisterna / Potable)</option>
                    <option value="ALIMENTOS">ALIMENTOS (Bolsa / Proteínas)</option>
                    <option value="OTRO">OTRO SERVICIO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Estado de la Convocatoria</label>
                  <select
                    value={jornadaForm.estado || 'ACTIVA'}
                    onChange={(e) => setJornadaForm({ ...jornadaForm, estado: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white text-xs font-semibold"
                  >
                    <option value="ACTIVA">● ACTIVA (Visible para los Vecinos)</option>
                    <option value="EN_ESPERA">⏳ EN ESPERA (Visible - Fecha por confirmar)</option>
                    <option value="CERRADA">○ DESACTIVADA / CERRADA (Oculta)</option>
                  </select>
                </div>
              </div>

              {/* Control Flexible de Fechas: Por Definir / En Espera de la Empresa */}
              <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-purple-500/20 space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={jornadaForm.fecha_por_definir}
                    onChange={(e) => setJornadaForm({ ...jornadaForm, fecha_por_definir: e.target.checked })}
                    className="w-4 h-4 rounded text-purple-600 bg-slate-900 border-slate-700 focus:ring-purple-500"
                  />
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>A la espera de asignación de fecha por la empresa distribuidora</span>
                  </span>
                </label>
                <p className="text-[11px] text-slate-400 pl-6 leading-relaxed">
                  Activa esta casilla si GasDrácula / PDVSA Gas Comunal aún no ha confirmado la fecha exacta de despacho o si la jornada quedó en espera de reprogramación. Se notificará a los vecinos como &quot;A la espera de confirmación&quot;.
                </p>

                {!jornadaForm.fecha_por_definir ? (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-850">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Fecha Programada de Inicio *</label>
                      <input
                        type="date"
                        required={!jornadaForm.fecha_por_definir}
                        value={jornadaForm.fecha_inicio}
                        onChange={(e) => setJornadaForm({ ...jornadaForm, fecha_inicio: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white text-xs"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        Si la empresa adelanta o demora, ajusta esta fecha
                      </span>
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Fecha de Cierre (Opcional)</label>
                      <input
                        type="date"
                        value={jornadaForm.fecha_fin}
                        onChange={(e) => setJornadaForm({ ...jornadaForm, fecha_fin: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white text-xs"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        Límite para recepción de aportes
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[11px] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Jornada registrada sin fecha fija. Podrás editarla en cualquier momento para colocar la fecha oficial tan pronto la empresa la suministre.
                    </span>
                  </div>
                )}
              </div>

              {/* Límite Máximo de Unidades por Familia del Censo */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <label className="block text-amber-300 font-bold">
                  Límite Máximo de Unidades por Familia / Vivienda
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={jornadaForm.max_unidades_por_familia}
                    onChange={(e) => setJornadaForm({ ...jornadaForm, max_unidades_por_familia: parseInt(e.target.value) || 1 })}
                    className="w-24 px-3 py-2 rounded-xl bg-slate-950 border border-amber-500/50 text-white font-mono font-bold text-sm text-center"
                  />
                  <span className="text-xs text-slate-300 font-medium">
                    Unidades máximas en total por hogar censado
                  </span>
                </div>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  Ejemplo con límite 2: Una familia puede pedir 2 bombonas de 10kg, o 2 de 18kg, o 1 de 10kg y 1 de 18kg. El sistema valida automáticamente y bloquea excesos.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Descripción / Observaciones / Lugar de Acopio</label>
                <textarea
                  rows="2"
                  placeholder="Lugar de entrega de cilindros vacíos, observaciones de adelanto o retraso de la empresa..."
                  value={jornadaForm.descripcion}
                  onChange={(e) => setJornadaForm({ ...jornadaForm, descripcion: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setModalNuevaJornada(false); setJornadaEditando(null); }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl font-extrabold shadow-lg transition flex items-center gap-1.5 text-white ${
                    jornadaEditando
                      ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                      : 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/20'
                  }`}
                >
                  {jornadaEditando ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{jornadaEditando ? 'Guardar Cambios de Jornada' : 'Publicar Jornada'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RECIBO DIGITAL DE SERVICIO / GAS */}
      {reciboModalServicio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative text-xs text-white">
            <button
              onClick={() => setReciboModalServicio(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center pb-4 border-b border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-2 border border-amber-500/30">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white">Comprobante de Aporte Comunitario</h3>
              <p className="text-[11px] text-slate-400">Consejo Comunal Las Llaves · SITUR {config.situr_codigo || '08-11-04-001-0033'}</p>
            </div>

            <div className="py-4 space-y-3">
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Fecha Declaración:</span>
                <span className="font-semibold text-white">{reciboModalServicio.created_at?.split('T')[0]}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Vecino:</span>
                <span className="font-bold text-white text-right">{reciboModalServicio.nombres_apellidos}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Cédula:</span>
                <span className="font-mono text-white">{reciboModalServicio.cedula}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Ubicación:</span>
                <span className="text-white font-medium">Vereda {reciboModalServicio.vereda} - Casa {reciboModalServicio.casa}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Teléfono:</span>
                <span className="font-mono text-white">{reciboModalServicio.telefono || 'N/A'}</span>
              </div>

              <div>
                <span className="text-slate-400 block mb-1.5">Ítems / Bombonas Solicitadas:</span>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  {(() => {
                    try {
                      const its = JSON.parse(reciboModalServicio.items_json || '[]');
                      return its.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-[11px]">
                          <span>{it.cantidad}x {it.nombre}</span>
                          <span className="font-bold text-amber-300">${((Number(it.costo_base_usd || 0) + Number(it.alicuota_autogestion_usd || 0)) * it.cantidad).toFixed(2)} USD</span>
                        </div>
                      ));
                    } catch (e) {
                      return <span className="text-slate-400">{reciboModalServicio.items_json}</span>;
                    }
                  })()}
                </div>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="font-bold text-slate-200">Monto Total Aporte:</span>
                <div className="text-right">
                  <span className="block font-black text-emerald-400 text-sm">
                    Bs. {Number(reciboModalServicio.monto_total_bs).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    (${Number(reciboModalServicio.monto_total_usd).toFixed(2)} USD)
                  </span>
                </div>
              </div>

              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Referencia de Pago:</span>
                <span className="font-mono text-white font-bold">{reciboModalServicio.numero_referencia}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Banco de Origen:</span>
                <span className="text-white">{reciboModalServicio.banco_origen || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Estado de Entrega:</span>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                  reciboModalServicio.estado === 'ENTREGADO'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : reciboModalServicio.estado === 'VERIFICADO'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {reciboModalServicio.estado}
                </span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold transition flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Recibo</span>
              </button>
            </div>
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

      {/* Modal de Resumen Estadístico Integral */}
      <ModalResumenEstadistico
        isOpen={modalResumenVisual}
        onClose={() => setModalResumenVisual(false)}
        stats={stats}
        config={config}
        firmas={firmas}
        firmanteReporteId={firmanteReporteId}
        onCambiarFirmanteReporte={handleCambiarFirmanteReporte}
        onDescargarPdf={handleGenerarReportePdf}
        generandoReportePdf={generandoReportePdf}
        user={user}
      />

    </div>
  );
}
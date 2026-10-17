'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import HeroAndActions from '@/components/HeroAndActions';
import ValidadorPublico from '@/components/ValidadorPublico';
import ModalSolicitud from '@/components/ModalSolicitud';
import ModalRegistroVecino from '@/components/ModalRegistroVecino';
import ModalLogin from '@/components/ModalLogin';
import Dashboard from '@/components/Dashboard';
import { toast } from '@/lib/toast';

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [currentView, setCurrentView] = useState('inicio'); // 'inicio', 'validar', 'dashboard'

  // Estados de modales
  const [modalLoginOpen, setModalLoginOpen] = useState(false);
  const [modalRegistroOpen, setModalRegistroOpen] = useState(false);
  const [modalSolicitudOpen, setModalSolicitudOpen] = useState(false);

  // Estados de datos
  const [cedulaInicialRegistro, setCedulaInicialRegistro] = useState('');
  const [tipoDocumentoSeleccionado, setTipoDocumentoSeleccionado] = useState('RESIDENCIA');
  const [vecinoActivo, setVecinoActivo] = useState(null);
  const [vecinoBuscado, setVecinoBuscado] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [tasaBcv, setTasaBcv] = useState(875.65);

  // Validador query
  const [validadorCodigo, setValidadorCodigo] = useState('');
  const [config, setConfig] = useState(null);

  // 1. Escuchar cambios de hash (#dashboard, #validar, #inicio, #vecinos, etc.)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '') || 'inicio';
      
      // Si el hash es validar con query (ej: #validar?codigo=...)
      if (hash.startsWith('validar')) {
        setCurrentView('validar');
        const match = hash.match(/codigo=([^&]+)/);
        if (match) setValidadorCodigo(match[1]);
      } else if (['dashboard', 'vecinos', 'documentos', 'censo', 'pagos', 'firmas', 'modelador', 'usuarios', 'auditoria', 'estadisticas', 'configuracion'].includes(hash)) {
        setCurrentView('dashboard');
      } else {
        setCurrentView('inicio');
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // 2. Verificar sesión activa y configuración al cargar
  useEffect(() => {
    checkSession();
    fetch('/api/dolar')
      .then(r => r.json())
      .then(d => { if (d.promedio) setTasaBcv(d.promedio); })
      .catch(() => {});

    fetch('/api/configuracion')
      .then(r => r.json())
      .then(d => { if (d.config) setConfig(d.config); })
      .catch(() => {});

    const handleConfigUpdate = (e) => {
      if (e.detail) {
        setConfig(prev => ({ ...(prev || {}), ...e.detail }));
      }
    };
    window.addEventListener('config_updated', handleConfigUpdate);
    return () => window.removeEventListener('config_updated', handleConfigUpdate);
  }, []);

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleLogout = () => {
    document.cookie = 'cc_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    setUser(null);
    window.location.hash = '#inicio';
    setCurrentView('inicio');
  };

  const handleNavigateHash = (target) => {
    window.location.hash = `#${target}`;
    if (target === 'dashboard' && !user) {
      setModalLoginOpen(true);
    }
  };

  // 3. Buscar cédula desde el hero
  const handleBuscarCedula = async (cedulaStr) => {
    setIsSearching(true);
    setVecinoBuscado(null);
    try {
      const res = await fetch(`/api/vecinos?cedula=${encodeURIComponent(cedulaStr)}`);
      const data = await res.json();
      setVecinoBuscado(data);
      if (data.encontrado && data.aprobado) {
        setVecinoActivo(data.vecino);
      }
    } catch (e) {
      toast.error('Error en búsqueda: ' + e.message);
    } finally {
      setIsSearching(false);
    }
  };

  // 4. Seleccionar documento para tramitar
  const handleSelectDocumentType = (tipo, vecino = null) => {
    setTipoDocumentoSeleccionado(tipo);
    if (vecino) {
      setVecinoActivo(vecino);
      setModalSolicitudOpen(true);
    } else if (vecinoActivo && vecinoActivo.estado_aprobacion === 'APROBADO') {
      setModalSolicitudOpen(true);
    } else {
      // Si aún no ha buscado su cédula, hacer foco en el buscador
      const input = document.querySelector('input[placeholder*="V-12345678"]');
      if (input) {
        input.focus();
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // 5. Abrir registro cuando la cédula no existe
  const handleOpenRegistro = (cedula) => {
    setCedulaInicialRegistro(cedula || '');
    setModalRegistroOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] bg-grid-pattern text-slate-100">
      
      {/* Navbar Superior */}
      <Navbar
        user={user}
        config={config}
        onOpenLogin={() => setModalLoginOpen(true)}
        onLogout={handleLogout}
        onNavigateHash={handleNavigateHash}
      />

      {/* Si está en el Dashboard y logueado */}
      {currentView === 'dashboard' && user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <div className="flex-1 flex flex-col">
          
          {/* Si está en la pestaña Validador QR */}
          {currentView === 'validar' ? (
            <div className="flex-1">
              <ValidadorPublico initialCodigo={validadorCodigo} />
            </div>
          ) : (
            /* Vista Pública Principal */
            <div className="flex-1">
              <HeroAndActions
                onSelectDocumentType={handleSelectDocumentType}
                onBuscarCedula={handleBuscarCedula}
                onOpenRegistro={handleOpenRegistro}
                vecinoBuscado={vecinoBuscado}
                isSearching={isSearching}
                tasaBcv={tasaBcv}
              />

              {/* Sección Integrada del Validador Digital */}
              <div className="border-t border-slate-900/80 bg-slate-950/40 py-12">
                <ValidadorPublico initialCodigo={validadorCodigo} />
              </div>
            </div>
          )}

        </div>
      )}

      {/* Pie de Página Institucional */}
      <footer className="w-full border-t border-slate-900 bg-slate-950 py-8 px-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/tei.png"
              alt="Comité de Tecnología e Innovación"
              className="w-10 h-10 object-contain"
            />
            <div>
              <p className="text-[10px] sm:text-xs font-bold tracking-wider text-slate-300 uppercase">
                COMITÉ DE TECNOLOGÍA E INNOVACIÓN (ART. 26 NUM. 19 LOCC)
              </p>
              <p className="font-semibold text-slate-400">© 2026 Consejo Comunal "Las Llaves"</p>
              <p className="text-[11px] text-slate-500">
                Urb. Dr. Alfredo Travieso Paúl · SITUR: {config?.situr_codigo || '08-11-04-001-0033'} · RIF: {config?.rif || 'C299916862'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
            <a
              href="https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/archivo/Ley_Organica_Consejos_Comunales_2023.pdf"
              target="_blank"
              rel="noopener noreferrer"
              download="Ley_Organica_Consejos_Comunales_2023.pdf"
              className="text-amber-400 hover:text-amber-300 font-semibold transition"
            >
              Descargar Ley Orgánica C.C. (2023)
            </a>
            <span className="text-slate-800">|</span>
            <a
              href="https://www.comunas.gob.ve/fundacomunal/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-blue-400 transition"
            >
              Fundacomunal
            </a>
            <span className="text-slate-800">|</span>
            <button
              onClick={() => handleNavigateHash('validar')}
              className="text-slate-400 hover:text-emerald-400 transition"
            >
              Verificar QR
            </button>
            <span className="text-slate-800">|</span>
            <div className="flex items-center gap-1.5 text-emerald-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Servidores Activos en Vercel</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Modales */}
      {modalLoginOpen && (
        <ModalLogin
          onClose={() => setModalLoginOpen(false)}
          onLoginSuccess={(u) => {
            setUser(u);
            setModalLoginOpen(false);
            window.location.hash = '#dashboard';
            setCurrentView('dashboard');
          }}
        />
      )}

      {modalRegistroOpen && (
        <ModalRegistroVecino
          initialCedula={cedulaInicialRegistro}
          onClose={() => setModalRegistroOpen(false)}
          onRegistroExitoso={() => {
            setModalRegistroOpen(false);
            toast.success('¡Registro completado! Tu residencia ha sido registrada y está en estado pendiente de aprobación por los voceros comunales.');
          }}
        />
      )}

      {modalSolicitudOpen && vecinoActivo && (
        <ModalSolicitud
          vecino={vecinoActivo}
          tipoDocumento={tipoDocumentoSeleccionado}
          tasaBcv={tasaBcv}
          onClose={() => setModalSolicitudOpen(false)}
          onDocumentoGenerado={() => {}}
        />
      )}

    </div>
  );
}

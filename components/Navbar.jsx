'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, FileText, CheckCircle2, UserCheck, Lock, LogOut, Sun, Moon, Download, Flame } from 'lucide-react';

export default function Navbar({ user, config: initialConfig, onOpenLogin, onLogout, onNavigateHash, onOpenServicios }) {
  const [theme, setTheme] = useState('dark');
  const [siturCodigo, setSiturCodigo] = useState(initialConfig?.situr_codigo || '08-11-04-001-0033');

  useEffect(() => {
    if (initialConfig?.situr_codigo) {
      setSiturCodigo(initialConfig.situr_codigo);
    }
  }, [initialConfig?.situr_codigo]);

  useEffect(() => {
    // Cargar configuración si no vino provista
    let montado = true;
    async function fetchConfig() {
      try {
        const res = await fetch('/api/configuracion');
        if (res.ok) {
          const data = await res.json();
          if (montado && data.config?.situr_codigo) {
            setSiturCodigo(data.config.situr_codigo);
          }
        }
      } catch (e) {
        // Fallback silencioso
      }
    }
    fetchConfig();

    // Escuchar actualizaciones dinámicas desde el Dashboard
    const handleConfigUpdate = (e) => {
      if (e.detail?.situr_codigo) {
        setSiturCodigo(e.detail.situr_codigo);
      }
    };
    window.addEventListener('config_updated', handleConfigUpdate);

    return () => {
      montado = false;
      window.removeEventListener('config_updated', handleConfigUpdate);
    };
  }, []);

  useEffect(() => {
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

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-0 sm:h-20 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
        
        {/* Identidad Institucional */}
        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3.5">
          <a href="#" className="flex items-center gap-2.5 sm:gap-3 group min-w-0">
            <img
              src="https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/logo.png"
              alt="Logo Consejo Comunal Las Llaves"
              className="w-9 h-9 sm:w-12 sm:h-12 object-contain filter drop-shadow shrink-0 transition-transform group-hover:scale-105"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                <span className="font-extrabold text-xs sm:text-base tracking-wide text-white group-hover:text-blue-400 transition truncate">
                  CONSEJO COMUNAL LAS LLAVES
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                  SITUR: {siturCodigo}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 font-medium truncate">
                Urb. Dr. Alfredo Travieso Paúl · Puerto Cabello · RIF: C299916862
              </p>
            </div>
          </a>

          {/* Logo Ministerio Comunas en móvil (visible a la derecha de la identidad) */}
          <a
            href="https://www.comunas.gob.ve/fundacomunal/"
            target="_blank"
            rel="noopener noreferrer"
            title="Ministerio del Poder Popular para las Comunas y los Movimientos Sociales"
            className="sm:hidden shrink-0 pl-1"
          >
            <img
              src="https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/mppcomunas.png"
              alt="MPP Comunas"
              className="h-6 w-auto object-contain opacity-85"
            />
          </a>
        </div>

        {/* Enlaces y Acciones (En móvil se alinean en una barra de botones compacta con scroll horizontal fluido) */}
        <div className="w-full sm:w-auto flex items-center justify-start sm:justify-end gap-1.5 sm:gap-2.5 pt-1.5 sm:pt-0 border-t border-slate-800/60 sm:border-t-0 overflow-x-auto no-scrollbar scroll-smooth pb-0.5">
          <button
            onClick={() => onNavigateHash('inicio')}
            className="inline-flex items-center justify-center gap-1 text-[10.5px] sm:text-xs font-semibold px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition shrink-0 whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Tramitar</span>
          </button>

          <button
            onClick={onOpenServicios}
            className="inline-flex items-center justify-center gap-1 text-[10.5px] sm:text-xs font-semibold px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition shadow-sm shrink-0 whitespace-nowrap"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden xs:inline">Servicios / Gas</span>
            <span className="xs:hidden">Gas</span>
          </button>

          <button
            onClick={() => onNavigateHash('validar')}
            className="inline-flex items-center justify-center gap-1 text-[10.5px] sm:text-xs font-semibold px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-slate-900 border border-slate-750 text-emerald-400 hover:bg-slate-800/80 transition shadow-sm shrink-0 whitespace-nowrap"
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xs:inline">Validador QR</span>
            <span className="xs:hidden">Validador</span>
          </button>

          <a
            href="https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/archivo/Ley_Organica_Consejos_Comunales_2023.pdf"
            target="_blank"
            rel="noopener noreferrer"
            download="Ley_Organica_Consejos_Comunales_2023.pdf"
            title="Descargar Ley Orgánica de los Consejos Comunales (Reforma 2023)"
            className="inline-flex items-center justify-center gap-1 text-[10.5px] sm:text-xs font-semibold px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition shadow-sm shrink-0 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden md:inline">Ley Orgánica C.C.</span>
            <span className="md:hidden">Ley C.C.</span>
          </a>

          {/* Selector de Modo Claro / Modo Oscuro */}
          <button
            onClick={toggleTheme}
            type="button"
            title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            className="p-1 sm:p-1.5 rounded-lg sm:rounded-xl bg-slate-900 border border-slate-750 text-amber-400 hover:text-amber-300 hover:bg-slate-800 transition flex items-center justify-center shadow-sm shrink-0"
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            ) : (
              <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 shrink-0" />
            )}
          </button>

          {user ? (
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <button
                onClick={() => onNavigateHash('dashboard')}
                className="inline-flex items-center gap-1 text-[10.5px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition shadow-lg shadow-blue-500/20 whitespace-nowrap"
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Panel {user.rol === 'SUPER_ADMIN' ? 'SUPER' : user.rol}</span>
              </button>
              <button
                onClick={onLogout}
                title="Cerrar sesión"
                className="p-1 sm:p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800/60 transition shrink-0"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="inline-flex items-center gap-1 text-[10.5px] sm:text-xs font-semibold px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition shrink-0 whitespace-nowrap"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden xs:inline">Vocería / Admin</span>
              <span className="xs:hidden">Admin</span>
            </button>
          )}

          {/* Logo Ministerio Comunas (pantallas grandes) */}
          <a
            href="https://www.comunas.gob.ve/fundacomunal/"
            target="_blank"
            rel="noopener noreferrer"
            title="Ministerio del Poder Popular para las Comunas"
            className="hidden lg:block pl-2 border-l border-slate-800 shrink-0"
          >
            <img
              src="https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/mppcomunas.png"
              alt="MPP Comunas"
              className="h-7 w-auto object-contain opacity-85 hover:opacity-100 transition"
            />
          </a>
        </div>

      </div>
    </header>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, FileText, CheckCircle2, UserCheck, Lock, LogOut, Sun, Moon } from 'lucide-react';

export default function Navbar({ user, onOpenLogin, onLogout, onNavigateHash }) {
  const [theme, setTheme] = useState('dark');

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
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Identidad Institucional */}
        <div className="flex items-center gap-3.5">
          <a href="#" className="flex items-center gap-3 group">
            <img
              src="https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/logo.png"
              alt="Logo Consejo Comunal Las Llaves"
              className="w-12 h-12 object-contain filter drop-shadow transition-transform group-hover:scale-105"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-wide text-white group-hover:text-blue-400 transition">
                  CONSEJO COMUNAL LAS LLAVES
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  SITUR: 08-11-04-001-0033
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Urb. Dr. Alfredo Travieso Paúl · Puerto Cabello · RIF: C299916862
              </p>
            </div>
          </a>
        </div>

        {/* Enlaces y Acciones */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => onNavigateHash('inicio')}
            className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            Tramitar
          </button>

          <button
            onClick={() => onNavigateHash('validar')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-750 text-emerald-400 hover:bg-slate-800/80 transition shadow-sm"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Validador QR</span>
          </button>

          {/* Selector de Modo Claro / Modo Oscuro */}
          <button
            onClick={toggleTheme}
            type="button"
            title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            className="p-2 rounded-xl bg-slate-900 border border-slate-750 text-amber-400 hover:text-amber-300 hover:bg-slate-800 transition flex items-center justify-center shadow-sm"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4 text-blue-500" />
            )}
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigateHash('dashboard')}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition shadow-lg shadow-blue-500/20"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Panel</span> {user.rol === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : user.rol}
              </button>
              <button
                onClick={onLogout}
                title="Cerrar sesión"
                className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800/60 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Vocería / Admin</span>
            </button>
          )}

          {/* Logo Ministerio Comunas */}
          <a
            href="https://www.comunas.gob.ve/fundacomunal/"
            target="_blank"
            rel="noopener noreferrer"
            title="Ministerio del Poder Popular para las Comunas"
            className="hidden lg:block pl-2 border-l border-slate-800"
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

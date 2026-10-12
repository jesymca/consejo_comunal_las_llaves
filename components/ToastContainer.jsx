'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { toast } from '../lib/toast';

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    // Intercepción proactiva: Reemplazar el window.alert nativo de JavaScript
    // para asegurar que ninguna alerta use la ventana emergente nativa del navegador
    if (typeof window !== 'undefined') {
      window.alert = (msg) => {
        toast.info(msg);
      };
    }

    const unsubscribe = toast.subscribe((newToast) => {
      setToasts((prev) => [...prev, newToast]);

      if (newToast.duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
        }, newToast.duration);
      }
    });

    return unsubscribe;
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((t) => {
        const isSuccess = t.type === 'success';
        const isError = t.type === 'error';
        const isWarning = t.type === 'warning';
        const isInfo = t.type === 'info';

        return (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-top-4 fade-in ${
              isSuccess
                ? 'bg-slate-950/95 dark:bg-slate-950/95 border-emerald-500/50 text-emerald-200'
                : isError
                ? 'bg-slate-950/95 dark:bg-slate-950/95 border-rose-500/50 text-rose-200'
                : isWarning
                ? 'bg-slate-950/95 dark:bg-slate-950/95 border-amber-500/50 text-amber-200'
                : 'bg-slate-950/95 dark:bg-slate-950/95 border-blue-500/50 text-blue-200'
            }`}
            style={{
              boxShadow: isSuccess
                ? '0 12px 36px -10px rgba(16, 185, 129, 0.45)'
                : isError
                ? '0 12px 36px -10px rgba(244, 63, 94, 0.45)'
                : isWarning
                ? '0 12px 36px -10px rgba(245, 158, 11, 0.45)'
                : '0 12px 36px -10px rgba(59, 130, 246, 0.45)',
            }}
          >
            {/* Ícono de Estado con Badge Vibrante */}
            <div
              className={`p-2 rounded-xl shrink-0 ${
                isSuccess
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : isError
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : isWarning
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}
            >
              {isSuccess && <CheckCircle2 className="w-5 h-5" />}
              {isError && <AlertCircle className="w-5 h-5" />}
              {isWarning && <AlertTriangle className="w-5 h-5" />}
              {isInfo && <Info className="w-5 h-5" />}
            </div>

            {/* Contenido del Toast */}
            <div className="flex-1 min-w-0 pt-0.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-0.5">
                {t.title || (isSuccess ? 'Operación Exitosa' : isError ? 'Atención / Error' : isWarning ? 'Aviso' : 'Información')}
              </h4>
              <p className="text-xs leading-relaxed text-slate-100 font-medium break-words">
                {t.message}
              </p>
            </div>

            {/* Botón Cerrar */}
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition shrink-0"
              title="Cerrar notificación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

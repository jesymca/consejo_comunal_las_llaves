'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calendar, AlertCircle } from 'lucide-react';
import { normalizarFechaISO, formatearFechaLatina, validarFechaValida, calcularEdad } from '@/lib/territory';

export default function CampoFechaCenso({
  label,
  value,
  onChange,
  name,
  required = false,
  noFuturo = true,
  placeholder = 'DD/MM/AAAA',
  className = '',
  labelClassName = 'block text-[10px] text-slate-400 mb-0.5 font-medium',
  inputClassName = '',
  min = '1900-01-01',
  max = new Date().toISOString().split('T')[0],
  disabled = false,
  mostrarEdad = false,
}) {
  const hiddenDateRef = useRef(null);

  // Inicializar texto visible
  const [textoVisible, setTextoVisible] = useState(() => {
    if (!value) return '';
    const norm = normalizarFechaISO(value);
    return norm ? formatearFechaLatina(norm) : String(value);
  });
  const [errorFecha, setErrorFecha] = useState('');

  // Rastrea el último valor notificado al padre para no sobrescribir lo que el usuario escribe
  const ultimoValorNotificadoRef = useRef(value);

  // Sincronizar si cambia `value` desde el exterior (ej: cambio de habitante, carga desde BD o reset)
  useEffect(() => {
    if (value === ultimoValorNotificadoRef.current) {
      return;
    }

    if (!value) {
      setTextoVisible('');
      setErrorFecha('');
      ultimoValorNotificadoRef.current = '';
      return;
    }

    const norm = normalizarFechaISO(value);
    if (norm) {
      setTextoVisible(formatearFechaLatina(norm));
      setErrorFecha('');
    } else {
      setTextoVisible(String(value));
    }
    ultimoValorNotificadoRef.current = value;
  }, [value]);

  const handleTextoChange = (e) => {
    let raw = e.target.value;

    // Permitir solo números y separadores de fecha (/ o -)
    raw = raw.replace(/[^0-9/-]/g, '');

    // Evitar múltiples barras o guiones consecutivos
    raw = raw.replace(/\/{2,}/g, '/').replace(/-{2,}/g, '-');

    // Limitar longitud a máximo 10 caracteres (DD/MM/AAAA)
    if (raw.length > 10) {
      raw = raw.slice(0, 10);
    }

    // Si escribe 8 dígitos continuos (ej: 27071942), autoformatear con barras
    if (/^\d{8}$/.test(raw)) {
      raw = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4)}`;
    }

    setTextoVisible(raw);

    if (!raw.trim()) {
      setErrorFecha(required ? 'Este campo de fecha es obligatorio' : '');
      ultimoValorNotificadoRef.current = '';
      onChange?.('');
      return;
    }

    const res = validarFechaValida(raw, !noFuturo);
    if (res.valida) {
      setErrorFecha('');
      ultimoValorNotificadoRef.current = res.iso;
      onChange?.(res.iso);
    } else {
      // Mientras esté escribiendo (< 10 caracteres), no molestar con error visual prematuro
      if (raw.length < 10) {
        setErrorFecha('');
      } else {
        setErrorFecha(res.error || 'Fecha no válida (DD/MM/AAAA o calendario)');
      }
      ultimoValorNotificadoRef.current = raw;
      onChange?.(raw);
    }
  };

  const handleBlur = () => {
    let raw = textoVisible.trim();
    if (!raw) {
      if (required) setErrorFecha('Este campo de fecha es obligatorio');
      return;
    }

    // Autoformatear 8 dígitos continuos si se ingresaron sin barras (ej: 27071942 -> 27/07/1942)
    if (/^\d{8}$/.test(raw)) {
      raw = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4)}`;
      setTextoVisible(raw);
    }

    const res = validarFechaValida(raw, !noFuturo);
    if (res.valida) {
      setTextoVisible(res.latino);
      setErrorFecha('');
      ultimoValorNotificadoRef.current = res.iso;
      onChange?.(res.iso);
    } else {
      setErrorFecha(res.error || 'Debe ser una fecha real (DD/MM/AAAA o elija del calendario)');
      ultimoValorNotificadoRef.current = raw;
      onChange?.(raw);
    }
  };

  const handleCalendarioChange = (e) => {
    const isoVal = e.target.value;
    if (isoVal) {
      const res = validarFechaValida(isoVal, !noFuturo);
      if (res.valida) {
        setTextoVisible(res.latino);
        setErrorFecha('');
        ultimoValorNotificadoRef.current = res.iso;
        onChange?.(res.iso);
      }
    }
  };

  const abrirSelectorCalendario = () => {
    if (disabled) return;
    if (hiddenDateRef.current) {
      if (typeof hiddenDateRef.current.showPicker === 'function') {
        try {
          hiddenDateRef.current.showPicker();
          return;
        } catch (e) {}
      }
      hiddenDateRef.current.focus();
      hiddenDateRef.current.click();
    }
  };

  const valorIsoActual = normalizarFechaISO(textoVisible) || '';
  const valorParaEnvio = valorIsoActual || textoVisible.trim();

  // Cálculo discreto de edad en tiempo de ejecución
  const debeMostrarEdad = mostrarEdad || (label && label.toLowerCase().includes('nac'));
  const edadCalculada = debeMostrarEdad ? calcularEdad(textoVisible || value) : null;
  const textoEdad = edadCalculada !== null
    ? (edadCalculada === 0 ? '< 1 año' : `${edadCalculada} ${edadCalculada === 1 ? 'año' : 'años'}`)
    : null;

  const estiloBase = inputClassName || 'w-full pl-2.5 pr-8 py-1.5 rounded-lg bg-slate-950 border text-white text-xs font-mono transition outline-none';

  return (
    <div className={`relative ${className}`}>
      {label && (
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <label className={labelClassName.replace(/\bmb-\S+/g, '')}>
            {label}
          </label>
          {textoEdad && (
            <span
              title={`Edad calculada en tiempo de ejecución: ${textoEdad}`}
              className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-700/50 px-1.5 py-0.2 rounded leading-none shrink-0 shadow-sm"
            >
              {textoEdad}
            </span>
          )}
        </div>
      )}

      <div className="relative flex items-center">
        <input
          type="text"
          value={textoVisible}
          onChange={handleTextoChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          className={`${estiloBase} ${
            errorFecha
              ? 'border-rose-500 bg-rose-950/20 text-rose-200 focus:border-rose-400'
              : 'border-slate-800 focus:border-blue-500 text-slate-100'
          }`}
        />

        {/* Botón interactivo para abrir el calendario opcional */}
        <button
          type="button"
          onClick={abrirSelectorCalendario}
          disabled={disabled}
          title="Seleccionar fecha desde el calendario"
          className="absolute right-1.5 p-1 rounded-md text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
        >
          <Calendar className="w-3.5 h-3.5" />
        </button>

        {/* Input tipo date nativo para disparar el selector visual del sistema */}
        <input
          type="date"
          ref={hiddenDateRef}
          value={valorIsoActual}
          max={max}
          min={min}
          onChange={handleCalendarioChange}
          tabIndex={-1}
          aria-hidden="true"
          className="opacity-0 pointer-events-none absolute w-0 h-0 bottom-0 left-0"
        />

        {/* Campo oculto con el name para que se envíe en FormData */}
        {name && (
          <input
            type="hidden"
            name={name}
            value={valorParaEnvio}
          />
        )}
      </div>

      {errorFecha && (
        <div className="flex items-center gap-1 text-[10px] text-rose-400 mt-1 leading-tight font-sans">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{errorFecha}</span>
        </div>
      )}
    </div>
  );
}

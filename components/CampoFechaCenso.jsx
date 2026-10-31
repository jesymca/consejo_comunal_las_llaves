'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calendar, AlertCircle } from 'lucide-react';
import { normalizarFechaISO, formatearFechaLatina, validarFechaValida } from '@/lib/territory';

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
}) {
  const hiddenDateRef = useRef(null);

  // Inicializar texto visible
  const [textoVisible, setTextoVisible] = useState(() => {
    if (!value) return '';
    return formatearFechaLatina(value) || String(value);
  });
  const [errorFecha, setErrorFecha] = useState('');

  // Sincronizar si cambia `value` desde el estado del formulario padre
  useEffect(() => {
    if (!value) {
      setTextoVisible('');
      setErrorFecha('');
      return;
    }
    const norm = normalizarFechaISO(value);
    if (norm) {
      setTextoVisible(formatearFechaLatina(norm));
      setErrorFecha('');
    } else {
      setTextoVisible(String(value));
      setErrorFecha('Fecha no válida en registro');
    }
  }, [value]);

  const handleTextoChange = (e) => {
    const raw = e.target.value;
    setTextoVisible(raw);

    if (!raw.trim()) {
      if (required) {
        setErrorFecha('Este campo de fecha es obligatorio');
      } else {
        setErrorFecha('');
      }
      onChange?.('');
      return;
    }

    const res = validarFechaValida(raw, !noFuturo);
    if (res.valida) {
      setErrorFecha('');
      onChange?.(res.iso);
    } else {
      setErrorFecha(res.error || 'Fecha no válida (DD/MM/AAAA o calendario)');
      onChange?.(`INVALIDO:${raw}`);
    }
  };

  const handleBlur = () => {
    if (!textoVisible.trim()) {
      if (required) setErrorFecha('Este campo de fecha es obligatorio');
      return;
    }

    // Autoformatear 8 dígitos seguidos si el transcriptor escribe rápido sin barras (ej: 15081995 -> 15/08/1995)
    let valorAProcesar = textoVisible.trim();
    if (/^\d{8}$/.test(valorAProcesar)) {
      valorAProcesar = `${valorAProcesar.slice(0, 2)}/${valorAProcesar.slice(2, 4)}/${valorAProcesar.slice(4)}`;
      setTextoVisible(valorAProcesar);
    }

    const res = validarFechaValida(valorAProcesar, !noFuturo);
    if (res.valida) {
      setTextoVisible(res.latino);
      setErrorFecha('');
      onChange?.(res.iso);
    } else {
      setErrorFecha(res.error || 'Debe ser una fecha real (DD/MM/AAAA o elija del calendario)');
    }
  };

  const handleCalendarioChange = (e) => {
    const isoVal = e.target.value;
    if (isoVal) {
      const res = validarFechaValida(isoVal, !noFuturo);
      if (res.valida) {
        setTextoVisible(res.latino);
        setErrorFecha('');
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
  const valorParaEnvio = valorIsoActual || (textoVisible.trim() ? `INVALIDO:${textoVisible.trim()}` : '');

  const estiloBase = inputClassName || 'w-full pl-2.5 pr-8 py-1.5 rounded-lg bg-slate-950 border text-white text-xs font-mono transition outline-none';

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className={labelClassName}>
          {label}
        </label>
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

        {/* Botón interactivo para abrir el calendario */}
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
          className="opacity-0 pointer-events-none absolute w-0 h-0"
        />

        {/* Campo oculto con el name para que se envíe en FormData con formato ISO */}
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

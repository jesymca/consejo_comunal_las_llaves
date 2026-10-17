'use client';

import React, { useState, useEffect } from 'react';
import { X, UserPlus, AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';
import { 
  VEREDAS, 
  getCasasPorVereda, 
  CALIDADES_TENENCIA, 
  normalizarCedula,
  MAPEO_PARENTESCO,
  MAPEO_INSTRUCCION,
  MAPEO_SALUD
} from '@/lib/territory';
import { useTerritorio } from '@/lib/useTerritorio';

export default function ModalRegistroVecino({ initialCedula = '', onClose, onRegistroExitoso }) {
  const [cedula, setCedula] = useState(initialCedula || '');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [vereda, setVereda] = useState('A');
  const [casasDisponibles, setCasasDisponibles] = useState([]);
  const [casa, setCasa] = useState('');
  const [tiempoResidencia, setTiempoResidencia] = useState('');
  const [calidadTenencia, setCalidadTenencia] = useState('Propia');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [sexo, setSexo] = useState('M');
  const [parentesco, setParentesco] = useState('a');
  const [nivelInstruccion, setNivelInstruccion] = useState('c');
  const [profesionOcupacion, setProfesionOcupacion] = useState('');
  const [condicionSalud, setCondicionSalud] = useState('e');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(false);

  // Catálogos dinámicos
  const [catalogoParentesco, setCatalogoParentesco] = useState(
    Object.entries(MAPEO_PARENTESCO).map(([codigo, descripcion]) => ({ codigo, descripcion }))
  );
  const [catalogoInstruccion, setCatalogoInstruccion] = useState(
    Object.entries(MAPEO_INSTRUCCION).map(([codigo, descripcion]) => ({ codigo, descripcion }))
  );
  const [catalogoSalud, setCatalogoSalud] = useState(
    Object.entries(MAPEO_SALUD).map(([codigo, descripcion]) => ({ codigo, descripcion }))
  );

  useEffect(() => {
    let montado = true;
    async function cargarCatalogos() {
      try {
        const res = await fetch('/api/catalogos');
        if (res.ok) {
          const data = await res.json();
          if (montado && data.catalogos) {
            if (data.catalogos.parentesco?.length > 0) setCatalogoParentesco(data.catalogos.parentesco);
            if (data.catalogos.instruccion?.length > 0) setCatalogoInstruccion(data.catalogos.instruccion);
            if (data.catalogos.salud?.length > 0) setCatalogoSalud(data.catalogos.salud);
          }
        }
      } catch (e) {}
    }
    cargarCatalogos();
    return () => { montado = false; };
  }, []);

  // Actualizar casas disponibles cuando cambia la vereda o el territorio configurado
  const { casasPorVereda } = useTerritorio();
  useEffect(() => {
    if (vereda) {
      const casas = getCasasPorVereda(vereda);
      setCasasDisponibles(casas);
      setCasa(prev => (casas.includes(prev) ? prev : casas[0] || ''));
    }
  }, [vereda, casasPorVereda]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/vecinos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          cedula: normalizarCedula(cedula),
          nombres,
          apellidos,
          vereda,
          casa,
          tiempo_residencia: tiempoResidencia,
          calidad_tenencia: calidadTenencia,
          telefono,
          email,
          sexo,
          parentesco,
          nivel_instruccion: nivelInstruccion,
          profesion_ocupacion: profesionOcupacion,
          condicion_salud: condicionSalud,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar vecino');
      }

      setExito(true);
      setTimeout(() => {
        if (onRegistroExitoso) onRegistroExitoso(data);
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Registro en el Censo Demográfico Comunal</h3>
            <p className="text-xs text-slate-400">Consejo Comunal Las Llaves · Art. 15 num. 3 y Art. 34 num. 20 LOCC (2023)</p>
          </div>
        </div>

        {/* Advertencia comunal sobre aprobación */}
        <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex gap-2.5 items-start">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <div>
            <span className="font-bold">Aviso de verificación comunal (Art. 34 num. 19 y 20 LOCC):</span> Al registrarte, tus datos quedarán en estado <strong>PENDIENTE</strong>. Podrás tramitar y descargar constancias una vez que la Comisión Electoral / Colectivo de Gobierno Comunal verifique tu residencia en la vereda indicada.
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex gap-2 items-center">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {exito ? (
          <div className="py-8 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3 animate-bounce" />
            <h4 className="text-base font-bold text-white mb-1">¡Registro recibido en el Censo Demográfico Comunal!</h4>
            <p className="text-xs text-slate-300">
              Tus datos han sido incorporados a la base de datos comunal. Las instancias del Consejo Comunal verificarán tu residencia a la brevedad.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Cédula */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Cédula de Identidad *
              </label>
              <input
                type="text"
                required
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                placeholder="V-12345678"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Nombres y Apellidos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombres Completos *
                </label>
                <input
                  type="text"
                  required
                  value={nombres}
                  onChange={(e) => setNombres(e.target.value)}
                  placeholder="Ej: JUAN CARLOS"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-white text-xs focus:outline-none focus:border-blue-500 uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Apellidos Completos *
                </label>
                <input
                  type="text"
                  required
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  placeholder="Ej: PÉREZ ROJAS"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-white text-xs focus:outline-none focus:border-blue-500 uppercase"
                />
              </div>
            </div>

            {/* Vereda y Casa (Filtro Estricto) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Vereda *
                </label>
                <select
                  value={vereda}
                  onChange={(e) => setVereda(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  {VEREDAS.map((v) => (
                    <option key={v} value={v}>Vereda {v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Número de Casa *
                </label>
                <select
                  value={casa}
                  onChange={(e) => setCasa(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  {casasDisponibles.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">Casas autorizadas en Vereda {vereda}</span>
              </div>
            </div>

            {/* Desde cuándo vive allí y En Calidad de */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Desde cuándo vive allí *
                </label>
                <input
                  type="text"
                  required
                  value={tiempoResidencia}
                  onChange={(e) => setTiempoResidencia(e.target.value)}
                  placeholder="Ej: 10 años / Desde 2014"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  En calidad de *
                </label>
                <select
                  value={calidadTenencia}
                  onChange={(e) => setCalidadTenencia(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  {CALIDADES_TENENCIA.map((ct) => (
                    <option key={ct} value={ct}>{ct}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Teléfono y Género */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Teléfono de Contacto
                </label>
                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="0414-1234567"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Sexo *
                </label>
                <select
                  value={sexo}
                  onChange={(e) => setSexo(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="M">Masculino (M)</option>
                  <option value="F">Femenino (F)</option>
                </select>
              </div>
            </div>

            {/* Parentesco y Nivel de Instrucción */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Parentesco (con Jefe de Hogar) *
                </label>
                <select
                  value={parentesco}
                  onChange={(e) => setParentesco(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  {catalogoParentesco.map((item) => (
                    <option key={item.codigo} value={item.codigo}>
                      ({item.codigo.toUpperCase()}) {item.descripcion}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nivel de Instrucción *
                </label>
                <select
                  value={nivelInstruccion}
                  onChange={(e) => setNivelInstruccion(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  {catalogoInstruccion.map((item) => (
                    <option key={item.codigo} value={item.codigo}>
                      ({item.codigo.toUpperCase()}) {item.descripcion}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Profesión/Ocupación y Condición de Salud */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Profesión u Ocupación
                </label>
                <input
                  type="text"
                  value={profesionOcupacion}
                  onChange={(e) => setProfesionOcupacion(e.target.value)}
                  placeholder="Ej: Docente, Comerciante, Estudiante"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Condición de Salud *
                </label>
                <select
                  value={condicionSalud}
                  onChange={(e) => setCondicionSalud(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  {catalogoSalud.map((item) => (
                    <option key={item.codigo} value={item.codigo}>
                      ({item.codigo.toUpperCase()}) {item.descripcion}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Botón de Enviar */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
              >
                {loading ? 'Registrando...' : 'Enviar Solicitud de Registro Comunal'}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}

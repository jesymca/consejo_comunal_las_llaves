'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Upload, Move, Plus, Trash2, Eye, RotateCcw,
  Sliders, Layers, ZoomIn, ZoomOut, Check, Image as ImageIcon,
  Type, AlignCenter, AlignLeft, AlignRight, Maximize2,
  Lock, Unlock, ArrowUpDown, CornerRightDown,
  Bold, Italic, Underline, CaseUpper, Palette
} from 'lucide-react';
import { toast } from '../lib/toast';

const CANVAS_WIDTH = 750; // Proporcional al ancho de hoja Carta con márgenes
const DEFAULT_HEADER_HEIGHT = 180;
const DEFAULT_FOOTER_HEIGHT = 150;

// Presets de imágenes institucionales (todos con proporciones simétricas nativas y formato PNG de alta resolución)
const PRESET_IMAGES = [
  { name: 'Escudo Venezuela', url: '/img/escudo_venezuela.png', defaultW: 55, defaultH: 55, lockRatio: true },
  { name: 'Logo Comunas', url: '/img/mppcomunas.png', defaultW: 90, defaultH: 45, lockRatio: false },
  { name: 'Logo Consejo Comunal', url: '/img/logo.png', defaultW: 70, defaultH: 70, lockRatio: true },
  { name: 'Sello Húmedo CC', url: '/img/sello.png', defaultW: 75, defaultH: 75, lockRatio: true },
];

export default function SvgCanvasEditor({
  mode = 'header', // 'header' | 'footer'
  initialData = null,
  onSave = () => {},
  title = 'Editor SVG',
}) {
  // Estructura por defecto para Cabecera con formato enriquecido
  const getDefaultHeaderState = () => ({
    height: DEFAULT_HEADER_HEIGHT,
    mostrarLineaDivisoria: true,
    colorLinea: '#CBD5E1',
    textos: [
      { id: 't1', texto: 'REPÚBLICA BOLIVARIANA DE VENEZUELA', x: CANVAS_WIDTH / 2, y: 30, fontSize: 13, fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textTransform: 'none', color: '#0F172A', align: 'middle' },
      { id: 't2', texto: 'MINISTERIO DEL PODER POPULAR PARA LAS COMUNAS', x: CANVAS_WIDTH / 2, y: 50, fontSize: 11, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textTransform: 'none', color: '#334155', align: 'middle' },
      { id: 't3', texto: 'CONSEJO COMUNAL "LAS LLAVES"', x: CANVAS_WIDTH / 2, y: 70, fontSize: 12, fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textTransform: 'none', color: '#1E293B', align: 'middle' },
      { id: 't4', texto: 'Urbanización Dr. Alfredo Travieso Paúl - Parroquia Goaigoaza', x: CANVAS_WIDTH / 2, y: 90, fontSize: 10, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textTransform: 'none', color: '#475569', align: 'middle' },
      { id: 't5', texto: 'Municipio Puerto Cabello, Estado Carabobo | RIF: C299916862 | SITUR: 08-11-04-001-0033', x: CANVAS_WIDTH / 2, y: 110, fontSize: 9.5, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textTransform: 'none', color: '#64748B', align: 'middle' },
    ],
    imagenes: [
      { id: 'img-comunas', nombre: 'Logo Comunas', url: '/img/mppcomunas.png', x: 25, y: 18, width: 100, height: 50, opacity: 1, lockRatio: false },
      { id: 'img-ccll', nombre: 'Logo CC', url: '/img/logo.png', x: CANVAS_WIDTH - 95, y: 15, width: 70, height: 70, opacity: 1, lockRatio: true },
    ],
  });

  // Estructura por defecto para Footer con formato enriquecido
  const getDefaultFooterState = () => ({
    height: DEFAULT_FOOTER_HEIGHT,
    mostrarRecuadroValidacion: true,
    colorBorde: '#E2E8F0',
    colorFondo: '#F8FAFC',
    textos: [
      { id: 'ft1', texto: 'CERTIFICACIÓN Y VALIDACIÓN DIGITAL DE CONSTANCIA', x: 140, y: 34, fontSize: 11, fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textTransform: 'none', color: '#0F172A', align: 'start' },
      { id: 'ft2', texto: 'Código Único de Validación: CCLL-EJEMPLO-001', x: 140, y: 56, fontSize: 10, fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textTransform: 'none', color: '#2563EB', align: 'start' },
      { id: 'ft3', texto: 'Fecha de Emisión: DD/MM/AAAA  |  Vigencia Oficial: 60 Días continuos', x: 140, y: 78, fontSize: 9, fontWeight: 'normal', fontStyle: 'italic', textDecoration: 'none', textTransform: 'none', color: '#475569', align: 'start' },
      { id: 'ft4', texto: 'Escanee el código QR o verifique la autenticidad en la plataforma comunitaria oficial.', x: 140, y: 98, fontSize: 8.5, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textTransform: 'none', color: '#64748B', align: 'start' },
    ],
    imagenes: [
      { id: 'img-qr-placeholder', nombre: 'Simulación QR', url: '/img/logo.png', x: 25, y: 22, width: 85, height: 85, opacity: 1, lockRatio: true },
    ],
  });

  // Inicializar estado parseando initialData
  const [editorState, setEditorState] = useState(() => {
    if (initialData) {
      try {
        const parsed = typeof initialData === 'string' ? JSON.parse(initialData) : initialData;
        if (parsed && (parsed.imagenes || parsed.textos)) {
          const fallbackHeight = mode === 'header' ? DEFAULT_HEADER_HEIGHT : DEFAULT_FOOTER_HEIGHT;
          return {
            ...parsed,
            height: parsed.height ? Math.max(100, parseInt(parsed.height, 10)) : fallbackHeight,
            imagenes: (parsed.imagenes || []).map((img) => ({
              ...img,
              url: img.url && img.url.includes('escudo_venezuela') ? '/img/escudo_venezuela.png' : img.url,
              lockRatio: img.lockRatio ?? (img.width === img.height), // Preservar o inferir simetría 1:1
            })),
            textos: (parsed.textos || []).map((t) => ({
              ...t,
              fontWeight: t.fontWeight || 'normal',
              fontStyle: t.fontStyle || 'normal',
              textDecoration: t.textDecoration || 'none',
              textTransform: t.textTransform || 'none',
              color: t.color || '#0F172A',
              align: t.align || 'middle',
            })),
          };
        }
      } catch (e) {
        console.warn('No se pudo parsear initialData SVG, usando default:', e);
      }
    }
    return mode === 'header' ? getDefaultHeaderState() : getDefaultFooterState();
  });

  const canvasHeight = editorState.height || (mode === 'header' ? DEFAULT_HEADER_HEIGHT : DEFAULT_FOOTER_HEIGHT);

  // Estados de selección
  const [selectedId, setSelectedId] = useState(null);
  const [selectedType, setSelectedType] = useState(null); // 'image' | 'text'
  const [activeTab, setActiveTab] = useState('elementos'); // 'elementos' | 'textos' | 'propiedades' | 'lienzo'
  const [zoom, setZoom] = useState(1);
  const [mensajeGuardado, setMensajeGuardado] = useState('');

  // Dragging y Resizing refs
  const svgRef = useRef(null);
  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const isResizingCanvas = useRef(false);
  const resizeHandle = useRef(null); // 'nw', 'ne', 'se', 'sw', 'n', 's', 'e', 'w'
  const dragStartPos = useRef({ x: 0, y: 0 });
  const elementStartPos = useRef({ x: 0, y: 0 });
  const elementStartDims = useRef({ w: 0, h: 0, aspect: 1, x: 0, y: 0 });
  const canvasStartHeight = useRef(canvasHeight);

  // Archivo oculto para subida de imagen
  const fileInputRef = useRef(null);

  // Obtener el objeto seleccionado
  const getSelectedElement = () => {
    if (!selectedId) return null;
    if (selectedType === 'image') {
      return editorState.imagenes.find((img) => img.id === selectedId);
    }
    if (selectedType === 'text') {
      return editorState.textos.find((txt) => txt.id === selectedId);
    }
    return null;
  };

  const selectedElement = getSelectedElement();

  // INICIO DE ARRASTRE DE ELEMENTO (Mover X, Y)
  const handleMouseDown = (e, id, type) => {
    e.stopPropagation();
    setSelectedId(id);
    setSelectedType(type);

    isDragging.current = true;
    isResizing.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };

    if (type === 'image') {
      const img = editorState.imagenes.find((i) => i.id === id);
      if (img) elementStartPos.current = { x: img.x, y: img.y };
    } else if (type === 'text') {
      const txt = editorState.textos.find((t) => t.id === id);
      if (txt) elementStartPos.current = { x: txt.x, y: txt.y };
    }
  };

  // INICIO DE REDIMENSIONAMIENTO CON PUNTOS (Resize Handles)
  const handleResizeStart = (e, handle, img) => {
    e.stopPropagation();
    isResizing.current = true;
    isDragging.current = false;
    resizeHandle.current = handle;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    elementStartDims.current = {
      w: img.width,
      h: img.height,
      aspect: img.width / Math.max(1, img.height),
      x: img.x,
      y: img.y,
      lockRatio: Boolean(img.lockRatio),
    };
  };

  // INICIO DE CAMBIO DE ALTURA DEL LIENZO
  const handleCanvasHeightResizeStart = (e) => {
    e.stopPropagation();
    isResizingCanvas.current = true;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    canvasStartHeight.current = canvasHeight;
  };

  // MOVIMIENTO GLOBAL DEL RATÓN
  const handleMouseMove = (e) => {
    // 1. Redimensionamiento de Altura del Lienzo (Cabecera / Footer)
    if (isResizingCanvas.current) {
      const dy = (e.clientY - dragStartPos.current.y) / zoom;
      const newHeight = Math.max(110, Math.min(380, Math.round(canvasStartHeight.current + dy)));
      setEditorState((prev) => ({
        ...prev,
        height: newHeight,
      }));
      return;
    }

    // 2. Redimensionamiento de Imagen mediante Puntos / Manijas
    if (isResizing.current && selectedId && selectedType === 'image') {
      const dx = (e.clientX - dragStartPos.current.x) / zoom;
      const dy = (e.clientY - dragStartPos.current.y) / zoom;
      const { w: startW, h: startH, aspect, x: startX, y: startY, lockRatio } = elementStartDims.current;
      const handle = resizeHandle.current;

      let newW = startW;
      let newH = startH;
      let newX = startX;
      let newY = startY;

      // Calcular según la manija arrastrada
      if (handle === 'se') {
        newW = Math.max(15, startW + dx);
        newH = lockRatio ? Math.round(newW / aspect) : Math.max(15, startH + dy);
      } else if (handle === 'sw') {
        newW = Math.max(15, startW - dx);
        newX = startX + (startW - newW);
        newH = lockRatio ? Math.round(newW / aspect) : Math.max(15, startH + dy);
      } else if (handle === 'ne') {
        newW = Math.max(15, startW + dx);
        newH = lockRatio ? Math.round(newW / aspect) : Math.max(15, startH - dy);
        newY = startY + (startH - newH);
      } else if (handle === 'nw') {
        newW = Math.max(15, startW - dx);
        newX = startX + (startW - newW);
        newH = lockRatio ? Math.round(newW / aspect) : Math.max(15, startH - dy);
        newY = startY + (startH - newH);
      } else if (handle === 'e') {
        newW = Math.max(15, startW + dx);
        if (lockRatio) newH = Math.round(newW / aspect);
      } else if (handle === 'w') {
        newW = Math.max(15, startW - dx);
        newX = startX + (startW - newW);
        if (lockRatio) newH = Math.round(newW / aspect);
      } else if (handle === 's') {
        newH = Math.max(15, startH + dy);
        if (lockRatio) newW = Math.round(newH * aspect);
      } else if (handle === 'n') {
        newH = Math.max(15, startH - dy);
        newY = startY + (startH - newH);
        if (lockRatio) newW = Math.round(newH * aspect);
      }

      setEditorState((prev) => ({
        ...prev,
        imagenes: prev.imagenes.map((img) =>
          img.id === selectedId
            ? { ...img, x: Math.round(newX), y: Math.round(newY), width: Math.round(newW), height: Math.round(newH) }
            : img
        ),
      }));
      return;
    }

    // 3. Arrastre de posición (Mover elemento X, Y)
    if (isDragging.current && selectedId) {
      const dx = (e.clientX - dragStartPos.current.x) / zoom;
      const dy = (e.clientY - dragStartPos.current.y) / zoom;

      const newX = Math.round(elementStartPos.current.x + dx);
      const newY = Math.round(elementStartPos.current.y + dy);

      if (selectedType === 'image') {
        setEditorState((prev) => ({
          ...prev,
          imagenes: prev.imagenes.map((img) =>
            img.id === selectedId ? { ...img, x: newX, y: newY } : img
          ),
        }));
      } else if (selectedType === 'text') {
        setEditorState((prev) => ({
          ...prev,
          textos: prev.textos.map((txt) =>
            txt.id === selectedId ? { ...txt, x: newX, y: newY } : txt
          ),
        }));
      }
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    isResizing.current = false;
    isResizingCanvas.current = false;
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDragging.current = false;
      isResizing.current = false;
      isResizingCanvas.current = false;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Subir imagen desde PC con soporte de Cloudflare R2
  const handleUploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen válido (PNG, JPG, SVG)');
      return;
    }

    let finalUrl = null;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'plantillas');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.success) {
        finalUrl = data.url;
        if (data.r2_configured) {
          toast.success('✓ Imagen subida a Cloudflare R2');
        }
      }
    } catch (e) {
      console.warn('Error subiendo a R2, recurriendo a Base64:', e);
    }

    if (!finalUrl) {
      finalUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (evt) => resolve(evt.target?.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    }

    if (finalUrl) {
      // Detectar si es un sello para bloquear proporción 1:1 simétrica automáticamente
      const isSello = file.name.toLowerCase().includes('sello');
      const defaultDim = isSello ? 75 : 80;

      const newImg = {
        id: `img-${Date.now()}`,
        nombre: file.name.replace(/\.[^/.]+$/, ''),
        url: finalUrl,
        x: Math.round(CANVAS_WIDTH / 2 - defaultDim / 2),
        y: Math.round(canvasHeight / 2 - defaultDim / 2),
        width: defaultDim,
        height: defaultDim,
        opacity: 1,
        lockRatio: true, // Proporción simétrica por defecto
      };

      setEditorState((prev) => ({
        ...prev,
        imagenes: [...prev.imagenes, newImg],
      }));
      setSelectedId(newImg.id);
      setSelectedType('image');
      setActiveTab('propiedades');
    }
    e.target.value = '';
  };

  // Agregar preset de imagen
  const handleAddPresetImage = (preset) => {
    const newImg = {
      id: `img-${Date.now()}`,
      nombre: preset.name,
      url: preset.url,
      x: Math.round(CANVAS_WIDTH / 2 - preset.defaultW / 2),
      y: 20,
      width: preset.defaultW,
      height: preset.defaultH,
      opacity: 1,
      lockRatio: Boolean(preset.lockRatio),
    };
    setEditorState((prev) => ({
      ...prev,
      imagenes: [...prev.imagenes, newImg],
    }));
    setSelectedId(newImg.id);
    setSelectedType('image');
    setActiveTab('propiedades');
  };

  // AGREGAR NUEVO TEXTO (Tanto en Cabecera como en Footer)
  const handleAddNewText = () => {
    const newTxt = {
      id: `txt-${Date.now()}`,
      texto: mode === 'header' ? 'Nuevo Texto Institucional' : 'Nota / Certificación del Pie de Página',
      x: Math.round(CANVAS_WIDTH / 2),
      y: Math.round(canvasHeight / 2),
      fontSize: 10,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      textTransform: 'none',
      color: '#0F172A',
      align: 'middle',
    };
    setEditorState((prev) => ({
      ...prev,
      textos: [...prev.textos, newTxt],
    }));
    setSelectedId(newTxt.id);
    setSelectedType('text');
    setActiveTab('propiedades');
  };

  // Eliminar elemento seleccionado
  const handleDeleteSelected = () => {
    if (!selectedId) return;
    if (selectedType === 'image') {
      setEditorState((prev) => ({
        ...prev,
        imagenes: prev.imagenes.filter((i) => i.id !== selectedId),
      }));
    } else if (selectedType === 'text') {
      setEditorState((prev) => ({
        ...prev,
        textos: prev.textos.filter((t) => t.id !== selectedId),
      }));
    }
    setSelectedId(null);
    setSelectedType(null);
  };

  // Forzar simetría 1:1 perfecta en imagen seleccionada
  const handleMakeSymmetric = () => {
    if (!selectedId || selectedType !== 'image') return;
    setEditorState((prev) => ({
      ...prev,
      imagenes: prev.imagenes.map((img) => {
        if (img.id === selectedId) {
          const maxDim = Math.max(img.width, img.height);
          return {
            ...img,
            width: maxDim,
            height: maxDim,
            lockRatio: true,
          };
        }
        return img;
      }),
    }));
  };

  // Guardar estado completo
  const handleSaveData = () => {
    const jsonString = JSON.stringify(editorState);
    onSave(jsonString, editorState);
    setMensajeGuardado('¡Diseño guardado exitosamente!');
    toast.success('¡Diseño del modelador guardado con éxito!');
    setTimeout(() => setMensajeGuardado(''), 3000);
  };

  // Restaurar a valores por defecto
  const handleResetToDefault = () => {
    if (confirm('¿Restaurar este diseño a los valores por defecto institucionales?')) {
      const def = mode === 'header' ? getDefaultHeaderState() : getDefaultFooterState();
      setEditorState(def);
      setSelectedId(null);
      setSelectedType(null);
    }
  };

  // Renderizador de Barra de Formato de Texto (Bold, Italic, Underline, Uppercase, Alineación, Tamaño y Paleta)
  const renderTextToolbar = (txt, isCompact = false) => {
    const isBold = txt.fontWeight === 'bold';
    const isItalic = txt.fontStyle === 'italic';
    const isUnderline = txt.textDecoration === 'underline';
    const isUpper = txt.textTransform === 'uppercase';

    const updateProp = (prop, value) => {
      setEditorState((prev) => ({
        ...prev,
        textos: prev.textos.map((t) => (t.id === txt.id ? { ...t, [prop]: value } : t)),
      }));
    };

    return (
      <div className={`flex items-center gap-1.5 flex-wrap ${isCompact ? 'pt-2 border-t border-slate-800/80' : ''}`}>
        {/* Estilos Tipográficos: Bold, Italic, Underline, Uppercase */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              updateProp('fontWeight', isBold ? 'normal' : 'bold');
            }}
            className={`p-1.5 rounded transition ${
              isBold ? 'bg-blue-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
            title="Negrita (Bold)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              updateProp('fontStyle', isItalic ? 'normal' : 'italic');
            }}
            className={`p-1.5 rounded transition ${
              isItalic ? 'bg-blue-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
            title="Cursiva (Italic)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              updateProp('textDecoration', isUnderline ? 'none' : 'underline');
            }}
            className={`p-1.5 rounded transition ${
              isUnderline ? 'bg-blue-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
            title="Subrayado (Underline)"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              updateProp('textTransform', isUpper ? 'none' : 'uppercase');
            }}
            className={`px-1.5 py-1 rounded text-[11px] font-bold transition flex items-center gap-0.5 ${
              isUpper ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
            title="Convertir a Mayúsculas"
          >
            <CaseUpper className="w-3.5 h-3.5" />
            <span className="text-[10px]">AA</span>
          </button>
        </div>

        {/* Alineación de Texto */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              updateProp('align', 'start');
            }}
            className={`p-1.5 rounded transition ${
              txt.align === 'start' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
            title="Alinear a la Izquierda"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              updateProp('align', 'middle');
            }}
            className={`p-1.5 rounded transition ${
              txt.align === 'middle' || !txt.align ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
            title="Centrar Texto"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              updateProp('align', 'end');
            }}
            className={`p-1.5 rounded transition ${
              txt.align === 'end' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
            title="Alinear a la Derecha"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tamaño de Fuente (px) */}
        <div className="flex items-center bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 gap-1">
          <Type className="w-3 h-3 text-slate-500" />
          <input
            type="number"
            min="6"
            max="32"
            value={txt.fontSize || 10}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const val = Math.max(6, Math.min(36, parseInt(e.target.value, 10) || 10));
              updateProp('fontSize', val);
            }}
            className="w-10 px-1 py-0.5 bg-slate-900 border border-slate-750 text-white text-[11px] font-mono text-center rounded focus:border-blue-500 focus:outline-none"
            title="Tamaño de Fuente (px)"
          />
          <span className="text-[10px] text-slate-500 font-mono">px</span>
        </div>

        {/* Color y Paleta Rápida */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1.5">
          <label
            className="w-5 h-5 rounded cursor-pointer border border-slate-700 relative overflow-hidden flex items-center justify-center shadow-inner"
            style={{ backgroundColor: txt.color || '#0F172A' }}
            title="Selector de color libre"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="color"
              value={txt.color || '#0F172A'}
              onChange={(e) => updateProp('color', e.target.value)}
              className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
            />
          </label>
          <div className="flex items-center gap-1">
            {['#0F172A', '#1E3A8A', '#2563EB', '#DC2626', '#16A34A', '#475569'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateProp('color', c);
                }}
                className={`w-3.5 h-3.5 rounded-full transition border ${
                  txt.color === c ? 'border-white scale-125 shadow' : 'border-transparent hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
                title={`Color: ${c}`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-2xl space-y-4">
      {/* Barra Superior con Acciones y Control de Altura */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-extrabold text-white">{title}</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/70 border border-blue-800/60 text-blue-300 uppercase">
              {mode === 'header' ? 'Cabecera / Membrete' : 'Pie de Página / Footer'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Arrastra imágenes/textos libremente. Haz clic en una imagen para usar los <strong className="text-blue-400">puntos azules de redimensionamiento</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Control Directo de Altura */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs flex-wrap">
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400 font-semibold">Altura:</span>
              <input
                type="number"
                min="100"
                max="380"
                step="10"
                value={canvasHeight}
                onChange={(e) => {
                  const val = Math.max(100, Math.min(380, parseInt(e.target.value, 10) || 160));
                  setEditorState((prev) => ({ ...prev, height: val }));
                }}
                className="w-14 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-750 text-white font-mono text-center text-xs"
              />
              <span className="text-slate-500 text-[10px]">px</span>
            </div>

            <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
              {[150, 180, 220, 260].map((presetH) => (
                <button
                  key={presetH}
                  type="button"
                  onClick={() => setEditorState((prev) => ({ ...prev, height: presetH }))}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                    canvasHeight === presetH
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                  title={`Ajustar altura a ${presetH}px`}
                >
                  {presetH}px
                </button>
              ))}
            </div>
          </div>

          {mensajeGuardado && (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 animate-in fade-in">
              <Check className="w-4 h-4" /> {mensajeGuardado}
            </span>
          )}

          <button
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            title="Restaurar a diseño institucional predeterminado"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Restaurar
          </button>

          <button
            onClick={handleSaveData}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition"
          >
            <Check className="w-4 h-4" /> Guardar Diseño
          </button>
        </div>
      </div>

      {/* Selector de Pestañas del Editor */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveTab('elementos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'elementos' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" /> Imágenes ({editorState.imagenes.length})
          </button>

          <button
            onClick={() => setActiveTab('textos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'textos' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5" /> Textos ({editorState.textos.length})
          </button>

          {selectedElement && (
            <button
              onClick={() => setActiveTab('propiedades')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'propiedades' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" /> Propiedades de Selección
            </button>
          )}
        </div>

        {/* Controles de Zoom */}
        <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}
            className="p-1 text-slate-400 hover:text-white rounded"
            title="Reducir zoom"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-slate-300 w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
            className="p-1 text-slate-400 hover:text-white rounded"
            title="Aumentar zoom"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Panel de Controles: Imágenes */}
      {activeTab === 'elementos' && (
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">Añadir Imagen:</span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow transition"
              >
                <Upload className="w-3.5 h-3.5" /> Subir Imagen desde mi PC
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadImage}
                className="hidden"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400">Presets oficiales:</span>
              {PRESET_IMAGES.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handleAddPresetImage(preset)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 transition"
                >
                  + {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de imágenes añadidas */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-850">
            {editorState.imagenes.map((img) => (
              <div
                key={img.id}
                onClick={() => {
                  setSelectedId(img.id);
                  setSelectedType('image');
                  setActiveTab('propiedades');
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition ${
                  selectedId === img.id
                    ? 'bg-blue-600/30 border-blue-500 text-white ring-1 ring-blue-500'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                }`}
              >
                <img src={img.url} alt={img.nombre} className="w-4 h-4 object-contain rounded" />
                <span className="max-w-[120px] truncate">{img.nombre}</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {img.width}x{img.height}
                </span>
                {img.lockRatio && <span className="text-[9px] text-blue-400 font-bold" title="Proporción simétrica 1:1">1:1</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Panel de Controles: Textos (Disponible para Cabecera Y Footer) */}
      {activeTab === 'textos' && (
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white block">
              {mode === 'header' ? 'Textos del Membrete Oficial:' : 'Textos del Pie de Página (Footer):'}
            </span>
            <button
              onClick={handleAddNewText}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar Nuevo Texto al {mode === 'header' ? 'Membrete' : 'Pie'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
            {editorState.textos.map((txt, idx) => (
              <div
                key={txt.id}
                onClick={() => {
                  setSelectedId(txt.id);
                  setSelectedType('text');
                }}
                className={`p-3 rounded-xl border space-y-1.5 cursor-pointer transition ${
                  selectedId === txt.id ? 'bg-blue-600/15 border-blue-500/60' : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Texto #{idx + 1}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditorState((prev) => ({
                        ...prev,
                        textos: prev.textos.filter((t) => t.id !== txt.id),
                      }));
                      if (selectedId === txt.id) setSelectedId(null);
                    }}
                    className="text-rose-400 hover:text-rose-300 p-0.5 rounded"
                    title="Eliminar este texto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <input
                  type="text"
                  value={txt.texto}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditorState((prev) => ({
                      ...prev,
                      textos: prev.textos.map((t) => (t.id === txt.id ? { ...t, texto: val } : t)),
                    }));
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-750 text-white text-xs font-sans focus:border-blue-500 focus:outline-none"
                />

                {/* Barra de formato enriquecido integrada para este texto */}
                {renderTextToolbar(txt, true)}
              </div>
            ))}
          </div>

          {mode === 'header' && (
            <div className="flex items-center gap-4 pt-2 border-t border-slate-850">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editorState.mostrarLineaDivisoria}
                  onChange={(e) =>
                    setEditorState((prev) => ({ ...prev, mostrarLineaDivisoria: e.target.checked }))
                  }
                  className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                />
                Mostrar Línea Divisoria Inferior
              </label>
            </div>
          )}
        </div>
      )}

      {/* Panel de Propiedades del Elemento Seleccionado */}
      {activeTab === 'propiedades' && selectedElement && (
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Elemento Seleccionado:</span>
              <span className="text-xs text-blue-400 font-mono">
                {selectedType === 'image' ? selectedElement.nombre : selectedElement.texto?.slice(0, 30) + '...'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {selectedType === 'image' && (
                <button
                  onClick={handleMakeSymmetric}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600 hover:text-white text-xs transition font-semibold"
                  title="Ajusta ancho y alto al mismo valor exacto para evitar cualquier deformación"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> Hacer 100% Simétrico (1:1)
                </button>
              )}

              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600/20 border border-red-500/40 text-red-400 hover:bg-red-600 hover:text-white text-xs transition font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" /> Eliminar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Posición X (px)</label>
              <input
                type="number"
                value={selectedElement.x}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 0;
                  if (selectedType === 'image') {
                    setEditorState((prev) => ({
                      ...prev,
                      imagenes: prev.imagenes.map((i) => (i.id === selectedId ? { ...i, x: val } : i)),
                    }));
                  } else {
                    setEditorState((prev) => ({
                      ...prev,
                      textos: prev.textos.map((t) => (t.id === selectedId ? { ...t, x: val } : t)),
                    }));
                  }
                }}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Posición Y (px)</label>
              <input
                type="number"
                value={selectedElement.y}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 0;
                  if (selectedType === 'image') {
                    setEditorState((prev) => ({
                      ...prev,
                      imagenes: prev.imagenes.map((i) => (i.id === selectedId ? { ...i, y: val } : i)),
                    }));
                  } else {
                    setEditorState((prev) => ({
                      ...prev,
                      textos: prev.textos.map((t) => (t.id === selectedId ? { ...t, y: val } : t)),
                    }));
                  }
                }}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono"
              />
            </div>

            {selectedType === 'image' && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-slate-400">Ancho (px)</label>
                    <button
                      type="button"
                      onClick={() => {
                        const newLock = !selectedElement.lockRatio;
                        setEditorState((prev) => ({
                          ...prev,
                          imagenes: prev.imagenes.map((i) =>
                            i.id === selectedId ? { ...i, lockRatio: newLock } : i
                          ),
                        }));
                      }}
                      className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
                      title="Bloquear o desbloquear proporción fija de aspecto"
                    >
                      {selectedElement.lockRatio ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      <span>{selectedElement.lockRatio ? '1:1' : 'Libre'}</span>
                    </button>
                  </div>
                  <input
                    type="number"
                    value={selectedElement.width}
                    onChange={(e) => {
                      const val = Math.max(10, parseInt(e.target.value, 10) || 10);
                      setEditorState((prev) => ({
                        ...prev,
                        imagenes: prev.imagenes.map((i) => {
                          if (i.id === selectedId) {
                            const newH = i.lockRatio ? val : i.height;
                            return { ...i, width: val, height: newH };
                          }
                          return i;
                        }),
                      }));
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Alto (px)</label>
                  <input
                    type="number"
                    value={selectedElement.height}
                    onChange={(e) => {
                      const val = Math.max(10, parseInt(e.target.value, 10) || 10);
                      setEditorState((prev) => ({
                        ...prev,
                        imagenes: prev.imagenes.map((i) => {
                          if (i.id === selectedId) {
                            const newW = i.lockRatio ? val : i.width;
                            return { ...i, height: val, width: newW };
                          }
                          return i;
                        }),
                      }));
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono"
                  />
                </div>
              </>
            )}

            {selectedType === 'text' && (
              <>
                <div className="col-span-2 md:col-span-4 space-y-1.5">
                  <label className="block text-[11px] text-slate-400">Contenido del Texto</label>
                  <input
                    type="text"
                    value={selectedElement.texto || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditorState((prev) => ({
                        ...prev,
                        textos: prev.textos.map((t) => (t.id === selectedId ? { ...t, texto: val } : t)),
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-750 text-white text-xs font-sans focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="col-span-2 md:col-span-4 space-y-1.5 pt-1 border-t border-slate-850">
                  <label className="block text-[11px] text-slate-400 font-semibold">
                    Barra de Formato Enriquecido (Negrita, Cursiva, Subrayado, Mayúsculas, Alineación, Tamaño y Color)
                  </label>
                  {renderTextToolbar(selectedElement, false)}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* LIENZO SVG INTERACTIVO (Simula la sección de la hoja de papel Carta) */}
      <div className="overflow-x-auto p-4 rounded-2xl bg-slate-950 border border-slate-800 flex justify-center items-center">
        <div
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          className="transition-transform shadow-2xl rounded-lg bg-white relative select-none"
        >
          <svg
            ref={svgRef}
            width={CANVAS_WIDTH}
            height={canvasHeight}
            viewBox={`0 0 ${CANVAS_WIDTH} ${canvasHeight}`}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="cursor-crosshair overflow-hidden rounded-lg bg-white"
            style={{ width: `${CANVAS_WIDTH}px`, height: `${canvasHeight}px` }}
          >
            {/* Guías de márgenes de hoja carta (líneas tenues) */}
            <line x1={30} y1={0} x2={30} y2={canvasHeight} stroke="#E2E8F0" strokeDasharray="3 3" />
            <line x1={CANVAS_WIDTH - 30} y1={0} x2={CANVAS_WIDTH - 30} y2={canvasHeight} stroke="#E2E8F0" strokeDasharray="3 3" />

            {/* Recuadro de fondo para Footer si está activo */}
            {mode === 'footer' && editorState.mostrarRecuadroValidacion && (
              <rect
                x={20}
                y={10}
                width={CANVAS_WIDTH - 40}
                height={canvasHeight - 20}
                rx={6}
                ry={6}
                fill={editorState.colorFondo || '#F8FAFC'}
                stroke={editorState.colorBorde || '#E2E8F0'}
                strokeWidth={1.5}
              />
            )}

            {/* Línea divisoria de cabecera */}
            {mode === 'header' && editorState.mostrarLineaDivisoria && (
              <line
                x1={25}
                y1={canvasHeight - 15}
                x2={CANVAS_WIDTH - 25}
                y2={canvasHeight - 15}
                stroke={editorState.colorLinea || '#CBD5E1'}
                strokeWidth={1.5}
              />
            )}

            {/* Renderizado de Textos con Formato Enriquecido */}
            {editorState.textos.map((txt) => {
              const textContent = txt.textTransform === 'uppercase'
                ? (txt.texto || '').toUpperCase()
                : (txt.texto || '');

              return (
                <text
                  key={txt.id}
                  x={txt.x}
                  y={txt.y}
                  fill={txt.color || '#0F172A'}
                  fontSize={txt.fontSize || 12}
                  fontWeight={txt.fontWeight || 'normal'}
                  fontStyle={txt.fontStyle || 'normal'}
                  textDecoration={txt.textDecoration || 'none'}
                  textAnchor={txt.align || 'middle'}
                  fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                  className="cursor-move hover:opacity-85 transition-opacity"
                  onMouseDown={(e) => handleMouseDown(e, txt.id, 'text')}
                  style={{
                    fontStyle: txt.fontStyle || 'normal',
                    fontWeight: txt.fontWeight || 'normal',
                    textDecoration: txt.textDecoration || 'none',
                    outline: selectedId === txt.id ? '2px dashed #2563EB' : 'none',
                    outlineOffset: '4px',
                  }}
                >
                  {textContent}
                </text>
              );
            })}

            {/* Renderizado de Imágenes */}
            {editorState.imagenes.map((img) => {
              const isSelected = selectedId === img.id;
              const handleRadius = 4.5;

              return (
                <g
                  key={img.id}
                  transform={`translate(${img.x}, ${img.y})`}
                  className="cursor-move"
                  onMouseDown={(e) => handleMouseDown(e, img.id, 'image')}
                >
                  <image
                    href={img.url}
                    width={img.width}
                    height={img.height}
                    opacity={img.opacity ?? 1}
                    preserveAspectRatio="xMidYMid meet"
                  />

                  {/* Bounding box de selección y Badge de Dimensiones */}
                  {isSelected && (
                    <>
                      <rect
                        x={0}
                        y={0}
                        width={img.width}
                        height={img.height}
                        fill="none"
                        stroke="#2563EB"
                        strokeWidth={1.5}
                        strokeDasharray="4 2"
                      />
                      {/* Badge flotante que muestra el tamaño exacto y simetría */}
                      <g transform="translate(0, -22)" className="pointer-events-none select-none">
                        <rect
                          x={0}
                          y={0}
                          width={Math.max(85, (img.nombre || '').length * 6 + 45)}
                          height={18}
                          rx={5}
                          fill="#0F172A"
                          stroke="#3B82F6"
                          strokeWidth={1}
                        />
                        <text
                          x={6}
                          y={13}
                          fill="#93C5FD"
                          fontSize={10}
                          fontWeight="bold"
                          fontFamily="ui-monospace, monospace"
                        >
                          {img.width}×{img.height}px {img.lockRatio ? '🔒1:1' : ''}
                        </text>
                      </g>
                    </>
                  )}

                  {/* PUNTOS INTERACTIVOS DE REDIMENSIONAMIENTO (8 Resize Handles) */}
                  {isSelected && (
                    <g>
                      {/* Esquina Noroeste (nw) */}
                      <circle
                        cx={0}
                        cy={0}
                        r={5.5}
                        fill="#FFFFFF"
                        stroke="#2563EB"
                        strokeWidth={2}
                        className="cursor-nwse-resize hover:fill-blue-600 transition-colors"
                        onMouseDown={(e) => handleResizeStart(e, 'nw', img)}
                      />
                      {/* Esquina Noreste (ne) */}
                      <circle
                        cx={img.width}
                        cy={0}
                        r={5.5}
                        fill="#FFFFFF"
                        stroke="#2563EB"
                        strokeWidth={2}
                        className="cursor-nesw-resize hover:fill-blue-600 transition-colors"
                        onMouseDown={(e) => handleResizeStart(e, 'ne', img)}
                      />
                      {/* Esquina Sureste (se) */}
                      <circle
                        cx={img.width}
                        cy={img.height}
                        r={5.5}
                        fill="#FFFFFF"
                        stroke="#2563EB"
                        strokeWidth={2}
                        className="cursor-nwse-resize hover:fill-blue-600 transition-colors"
                        onMouseDown={(e) => handleResizeStart(e, 'se', img)}
                      />
                      {/* Esquina Suroeste (sw) */}
                      <circle
                        cx={0}
                        cy={img.height}
                        r={5.5}
                        fill="#FFFFFF"
                        stroke="#2563EB"
                        strokeWidth={2}
                        className="cursor-nesw-resize hover:fill-blue-600 transition-colors"
                        onMouseDown={(e) => handleResizeStart(e, 'sw', img)}
                      />

                      {/* Laterales: Norte (n), Sur (s), Este (e), Oeste (w) */}
                      <rect
                        x={img.width / 2 - 4}
                        y={-4}
                        width={8}
                        height={8}
                        rx={2}
                        fill="#FFFFFF"
                        stroke="#2563EB"
                        strokeWidth={1.5}
                        className="cursor-ns-resize hover:fill-blue-600 transition-colors"
                        onMouseDown={(e) => handleResizeStart(e, 'n', img)}
                      />
                      <rect
                        x={img.width / 2 - 4}
                        y={img.height - 4}
                        width={8}
                        height={8}
                        rx={2}
                        fill="#FFFFFF"
                        stroke="#2563EB"
                        strokeWidth={1.5}
                        className="cursor-ns-resize hover:fill-blue-600 transition-colors"
                        onMouseDown={(e) => handleResizeStart(e, 's', img)}
                      />
                      <rect
                        x={img.width - 4}
                        y={img.height / 2 - 4}
                        width={8}
                        height={8}
                        rx={2}
                        fill="#FFFFFF"
                        stroke="#2563EB"
                        strokeWidth={1.5}
                        className="cursor-ew-resize hover:fill-blue-600 transition-colors"
                        onMouseDown={(e) => handleResizeStart(e, 'e', img)}
                      />
                      <rect
                        x={-4}
                        y={img.height / 2 - 4}
                        width={8}
                        height={8}
                        rx={2}
                        fill="#FFFFFF"
                        stroke="#2563EB"
                        strokeWidth={1.5}
                        className="cursor-ew-resize hover:fill-blue-600 transition-colors"
                        onMouseDown={(e) => handleResizeStart(e, 'w', img)}
                      />
                    </g>
                  )}
                </g>
              );
            })}

            {/* Manija de Arrastre Inferior para Aumentar/Reducir Altura del Lienzo */}
            <g
              className="cursor-ns-resize group"
              onMouseDown={handleCanvasHeightResizeStart}
            >
              <rect
                x={0}
                y={canvasHeight - 12}
                width={CANVAS_WIDTH}
                height={12}
                fill="#2563EB"
                fillOpacity={0.12}
                className="group-hover:fill-opacity-40 transition-opacity"
              />
              <rect
                x={CANVAS_WIDTH / 2 - 80}
                y={canvasHeight - 15}
                width={160}
                height={15}
                rx={7}
                fill="#0F172A"
                stroke="#3B82F6"
                strokeWidth={1.5}
                className="group-hover:fill-blue-600 group-hover:stroke-blue-400 transition"
              />
              <text
                x={CANVAS_WIDTH / 2}
                y={canvasHeight - 4}
                fill="#E2E8F0"
                fontSize={9.5}
                fontWeight="bold"
                textAnchor="middle"
                className="select-none pointer-events-none"
              >
                ↕ Altura: {canvasHeight}px
              </text>
            </g>
          </svg>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 px-1 gap-2">
        <div className="flex items-center gap-3">
          <span>* Haz clic en una imagen para activar sus <strong>puntos de redimensionamiento</strong>.</span>
          <span>* Puedes arrastrar la <strong>barra inferior azul</strong> para aumentar la altura del lienzo.</span>
        </div>
        <span className="font-mono text-slate-400">
          Hoja Carta: {CANVAS_WIDTH}px ancho × {canvasHeight}px alto
        </span>
      </div>
    </div>
  );
}

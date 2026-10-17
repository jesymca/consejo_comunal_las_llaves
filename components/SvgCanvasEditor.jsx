'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Upload, Move, Plus, Trash2, Eye, EyeOff, RotateCcw,
  Sliders, Layers, ZoomIn, ZoomOut, Check, Image as ImageIcon,
  Type, AlignCenter, AlignLeft, AlignRight, Maximize2,
  Lock, Unlock, ArrowUpDown, CornerRightDown,
  Bold, Italic, Underline, CaseUpper, Palette,
  ArrowUp, ArrowDown, ChevronsUp, ChevronsDown
} from 'lucide-react';
import { toast } from '../lib/toast';

const CANVAS_WIDTH = 750; // Proporcional al ancho de hoja Carta con márgenes
const DEFAULT_HEADER_HEIGHT = 180;
const DEFAULT_FOOTER_HEIGHT = 150;

const R2_IMG_BASE = 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img';

function normalizeUrlToR2(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;
  const u = rawUrl.trim();
  if (u.startsWith('data:')) return u;
  if (u === '/img/logo.png' || (u.endsWith('/img/logo.png') && !u.includes('r2.dev'))) {
    return `${R2_IMG_BASE}/logo.png`;
  }
  if (u === '/img/mppcomunas.png' || (u.endsWith('/img/mppcomunas.png') && !u.includes('r2.dev'))) {
    return `${R2_IMG_BASE}/mppcomunas.png`;
  }
  if (u === '/img/sello.png' || (u.endsWith('/img/sello.png') && !u.includes('r2.dev'))) {
    return `${R2_IMG_BASE}/sello.png`;
  }
  if (u === '/img/tei.png' || (u.endsWith('/img/tei.png') && !u.includes('r2.dev'))) {
    return `${R2_IMG_BASE}/tei.png`;
  }
  if (u === '/img/escudo_venezuela.png' || u === '/img/escudo_venezuela.svg') {
    return `${R2_IMG_BASE}/escudo_venezuela.svg`;
  }
  if (u.startsWith('/img/')) {
    return `${R2_IMG_BASE}/${u.replace(/^\/img\//, '')}`;
  }
  return u;
}

// Presets de imágenes institucionales por defecto
const DEFAULT_PRESET_IMAGES = [
  { id: 1, name: 'Escudo Venezuela', url: 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/escudo_venezuela.svg', defaultW: 55, defaultH: 55, lockRatio: true },
  { id: 2, name: 'Logo Comunas', url: 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/mppcomunas.png', defaultW: 90, defaultH: 45, lockRatio: false },
  { id: 3, name: 'Logo Consejo Comunal', url: 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/logo.png', defaultW: 70, defaultH: 70, lockRatio: true },
  { id: 4, name: 'Sello Húmedo CC', url: 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/sello.png', defaultW: 75, defaultH: 75, lockRatio: true },
  { id: 5, name: 'Comisión de Tecnología (TEI)', url: 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/tei.png', defaultW: 65, defaultH: 65, lockRatio: true },
];

export default function SvgCanvasEditor({
  mode = 'header', // 'header' | 'footer'
  initialData = null,
  onSave = () => {},
  title = 'Editor SVG',
}) {
  // Estructura por defecto para Cabecera con formato enriquecido, capas (zIndex) y logos R2
  const getDefaultHeaderState = () => ({
    height: DEFAULT_HEADER_HEIGHT,
    mostrarLineaDivisoria: true,
    colorLinea: '#CBD5E1',
    fondoZIndex: 0,
    textos: [
      { id: 't1', texto: 'REPÚBLICA BOLIVARIANA DE VENEZUELA', x: CANVAS_WIDTH / 2, y: 30, fontSize: 13, fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textTransform: 'none', color: '#0F172A', align: 'middle', zIndex: 30, visible: true },
      { id: 't2', texto: 'MINISTERIO DEL PODER POPULAR PARA LAS COMUNAS', x: CANVAS_WIDTH / 2, y: 50, fontSize: 11, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textTransform: 'none', color: '#334155', align: 'middle', zIndex: 40, visible: true },
      { id: 't3', texto: 'CONSEJO COMUNAL "LAS LLAVES"', x: CANVAS_WIDTH / 2, y: 70, fontSize: 12, fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textTransform: 'none', color: '#1E293B', align: 'middle', zIndex: 50, visible: true },
      { id: 't4', texto: 'Urbanización Dr. Alfredo Travieso Paúl - Parroquia Goaigoaza', x: CANVAS_WIDTH / 2, y: 90, fontSize: 10, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textTransform: 'none', color: '#475569', align: 'middle', zIndex: 60, visible: true },
      { id: 't5', texto: 'Municipio Puerto Cabello, Estado Carabobo | RIF: C299916862 | SITUR: 08-11-04-001-0033', x: CANVAS_WIDTH / 2, y: 110, fontSize: 9.5, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textTransform: 'none', color: '#64748B', align: 'middle', zIndex: 70, visible: true },
    ],
    imagenes: [
      { id: 'img-comunas', nombre: 'Logo Comunas', url: 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/mppcomunas.png', x: 25, y: 18, width: 100, height: 50, opacity: 1, lockRatio: false, zIndex: 10, visible: true },
      { id: 'img-ccll', nombre: 'Logo CC', url: 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/logo.png', x: CANVAS_WIDTH - 95, y: 15, width: 70, height: 70, opacity: 1, lockRatio: true, zIndex: 20, visible: true },
    ],
  });

  // Estructura por defecto para Footer con formato enriquecido, capas (zIndex) y logo R2
  // El recuadro de validación tiene fondoZIndex: 0 para ubicarse siempre debajo de las imágenes y textos por defecto
  const getDefaultFooterState = () => ({
    height: DEFAULT_FOOTER_HEIGHT,
    mostrarRecuadroValidacion: true,
    colorBorde: '#E2E8F0',
    colorFondo: '#F8FAFC',
    fondoZIndex: 0,
    textos: [
      { id: 'ft1', texto: 'CERTIFICACIÓN Y VALIDACIÓN DIGITAL DE CONSTANCIA', x: 140, y: 34, fontSize: 11, fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textTransform: 'none', color: '#0F172A', align: 'start', zIndex: 20, visible: true },
      { id: 'ft2', texto: 'Código Único de Validación: CCLL-EJEMPLO-001', x: 140, y: 56, fontSize: 10, fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textTransform: 'none', color: '#2563EB', align: 'start', zIndex: 30, visible: true },
      { id: 'ft3', texto: 'Fecha de Emisión: DD/MM/AAAA  |  Vigencia Oficial: 60 Días continuos', x: 140, y: 78, fontSize: 9, fontWeight: 'normal', fontStyle: 'italic', textDecoration: 'none', textTransform: 'none', color: '#475569', align: 'start', zIndex: 40, visible: true },
      { id: 'ft4', texto: 'Escanee el código QR o verifique la autenticidad en la plataforma comunitaria oficial.', x: 140, y: 98, fontSize: 8.5, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textTransform: 'none', color: '#64748B', align: 'start', zIndex: 50, visible: true },
    ],
    imagenes: [
      { id: 'img-qr-placeholder', nombre: 'Simulación QR', url: 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/logo.png', x: 25, y: 22, width: 85, height: 85, opacity: 1, lockRatio: true, zIndex: 10, visible: true },
    ],
  });

  const parseSvgConfigState = (raw) => {
    if (raw) {
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (parsed && (parsed.imagenes || parsed.textos)) {
          const fallbackHeight = mode === 'header' ? DEFAULT_HEADER_HEIGHT : DEFAULT_FOOTER_HEIGHT;
          const imgs = (parsed.imagenes || []).map((img, idx) => ({
            ...img,
            url: normalizeUrlToR2(img.url),
            lockRatio: img.lockRatio ?? (img.width === img.height),
            zIndex: typeof img.zIndex === 'number' ? img.zIndex : (idx + 1) * 10,
            visible: img.visible !== false,
          }));
          const txts = (parsed.textos || []).map((t, idx) => ({
            ...t,
            fontWeight: t.fontWeight || 'normal',
            fontStyle: t.fontStyle || 'normal',
            textDecoration: t.textDecoration || 'none',
            textTransform: t.textTransform || 'none',
            color: t.color || '#0F172A',
            align: t.align || 'middle',
            zIndex: typeof t.zIndex === 'number' ? t.zIndex : (imgs.length + idx + 1) * 10,
            visible: t.visible !== false,
          }));
          return {
            ...parsed,
            height: parsed.height ? Math.max(100, parseInt(parsed.height, 10)) : fallbackHeight,
            fondoZIndex: typeof parsed.fondoZIndex === 'number' ? parsed.fondoZIndex : 0,
            mostrarRecuadroValidacion: parsed.mostrarRecuadroValidacion !== false,
            mostrarLineaDivisoria: parsed.mostrarLineaDivisoria !== false,
            imagenes: imgs,
            textos: txts,
          };
        }
      } catch (e) {
        console.warn('No se pudo parsear initialData SVG, usando default:', e);
      }
    }
    return mode === 'header' ? getDefaultHeaderState() : getDefaultFooterState();
  };

  // Inicializar estado parseando initialData
  const [editorState, setEditorState] = useState(() => parseSvgConfigState(initialData));

  // Sincronizar si initialData se carga de forma asíncrona desde la base de datos
  useEffect(() => {
    if (initialData) {
      setEditorState(parseSvgConfigState(initialData));
    }
  }, [initialData, mode]);

  const canvasHeight = editorState.height || (mode === 'header' ? DEFAULT_HEADER_HEIGHT : DEFAULT_FOOTER_HEIGHT);

  // Estados de selección
  const [selectedId, setSelectedId] = useState(null);
  const [selectedType, setSelectedType] = useState(null); // 'image' | 'text' | 'shape'
  const [activeTab, setActiveTab] = useState('elementos'); // 'elementos' | 'textos' | 'capas' | 'propiedades'
  const [zoom, setZoom] = useState(1);
  const [mensajeGuardado, setMensajeGuardado] = useState('');
  const [presetsDisponibles, setPresetsDisponibles] = useState(DEFAULT_PRESET_IMAGES);

  // Cargar presets oficiales dinámicos y configuración del sistema desde la base de datos
  useEffect(() => {
    let montado = true;
    async function cargarPresetsDinamicos() {
      try {
        const res = await fetch('/api/presets');
        if (res.ok) {
          const data = await res.json();
          if (montado && data.presets && Array.isArray(data.presets) && data.presets.length > 0) {
            setPresetsDisponibles(data.presets);
          }
        }
      } catch (err) {
        console.warn('Error al cargar presets dinámicos, usando predeterminados:', err);
      }
    }

    async function sincronizarConfiguracionInstitucional() {
      try {
        const res = await fetch('/api/configuracion');
        if (res.ok) {
          const data = await res.json();
          const situr = data.config?.situr_codigo;
          if (montado && situr && mode === 'header') {
            setEditorState((prev) => {
              if (!prev || !prev.textos) return prev;
              const nuevosTextos = prev.textos.map((t) => {
                if (t.texto && t.texto.includes('SITUR:') && !t.texto.includes(situr)) {
                  return {
                    ...t,
                    texto: t.texto.replace(/SITUR:\s*[^|,\n]+/, `SITUR: ${situr}`)
                  };
                }
                return t;
              });
              return { ...prev, textos: nuevosTextos };
            });
          }
        }
      } catch (err) {
        // Silencioso
      }
    }

    cargarPresetsDinamicos();
    sincronizarConfiguracionInstitucional();

    const handleConfigUpdate = (e) => {
      const situr = e.detail?.situr_codigo;
      if (situr && mode === 'header') {
        setEditorState((prev) => {
          if (!prev || !prev.textos) return prev;
          const nuevosTextos = prev.textos.map((t) => {
            if (t.texto && t.texto.includes('SITUR:')) {
              return {
                ...t,
                texto: t.texto.replace(/SITUR:\s*[^|,\n]+/, `SITUR: ${situr}`)
              };
            }
            return t;
          });
          return { ...prev, textos: nuevosTextos };
        });
      }
    };
    window.addEventListener('config_updated', handleConfigUpdate);

    return () => {
      montado = false;
      window.removeEventListener('config_updated', handleConfigUpdate);
    };
  }, [mode]);

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

  // Obtener todas las capas del SVG ordenadas de abajo hacia arriba (menor a mayor zIndex)
  const getUnifiedLayers = (state = editorState) => {
    const layers = [];
    const baseShapeId = mode === 'footer' ? '__recuadro_fondo__' : '__linea_divisoria__';
    const baseShapeLabel = mode === 'footer'
      ? 'Recuadro Contenedor QR (Fondo)'
      : 'Línea Divisoria Inferior';
    const baseShapeVisible = mode === 'footer'
      ? state.mostrarRecuadroValidacion !== false
      : state.mostrarLineaDivisoria !== false;

    layers.push({
      id: baseShapeId,
      layerType: 'shape',
      label: baseShapeLabel,
      zIndex: typeof state.fondoZIndex === 'number' ? state.fondoZIndex : 0,
      visible: baseShapeVisible,
      item: { id: baseShapeId, nombre: baseShapeLabel },
    });

    (state.imagenes || []).forEach((img, idx) => {
      layers.push({
        id: img.id,
        layerType: 'image',
        label: img.nombre || `Imagen #${idx + 1}`,
        zIndex: typeof img.zIndex === 'number' ? img.zIndex : (idx + 1) * 10,
        visible: img.visible !== false,
        item: img,
      });
    });

    (state.textos || []).forEach((txt, idx) => {
      layers.push({
        id: txt.id,
        layerType: 'text',
        label: txt.texto || `Texto #${idx + 1}`,
        zIndex: typeof txt.zIndex === 'number' ? txt.zIndex : ((state.imagenes?.length || 0) + idx + 1) * 10,
        visible: txt.visible !== false,
        item: txt,
      });
    });

    return layers.sort((a, b) => a.zIndex - b.zIndex);
  };

  const getMaxZIndex = (state = editorState) => {
    const layers = getUnifiedLayers(state);
    return layers.reduce((max, l) => Math.max(max, l.zIndex || 0), 0);
  };

  // Reordenar cualquier capa del SVG: 'front' (Traer al frente), 'up' (Subir 1 nivel), 'down' (Bajar 1 nivel), 'back' (Enviar al fondo)
  const reorderLayer = (targetId, direction) => {
    setEditorState((prev) => {
      const sorted = getUnifiedLayers(prev);
      const idx = sorted.findIndex((l) => l.id === targetId);
      if (idx === -1) return prev;

      const updatedOrder = [...sorted];
      if (direction === 'up' && idx < updatedOrder.length - 1) {
        const temp = updatedOrder[idx];
        updatedOrder[idx] = updatedOrder[idx + 1];
        updatedOrder[idx + 1] = temp;
      } else if (direction === 'down' && idx > 0) {
        const temp = updatedOrder[idx];
        updatedOrder[idx] = updatedOrder[idx - 1];
        updatedOrder[idx - 1] = temp;
      } else if (direction === 'front' && idx < updatedOrder.length - 1) {
        const [moved] = updatedOrder.splice(idx, 1);
        updatedOrder.push(moved);
      } else if (direction === 'back' && idx > 0) {
        const [moved] = updatedOrder.splice(idx, 1);
        updatedOrder.unshift(moved);
      } else {
        return prev;
      }

      // Asignar zIndex normalizados (0, 10, 20, 30...) según el nuevo orden de abajo hacia arriba
      const zMap = {};
      updatedOrder.forEach((layer, newIndex) => {
        zMap[layer.id] = newIndex * 10;
      });

      const baseShapeId = mode === 'footer' ? '__recuadro_fondo__' : '__linea_divisoria__';
      return {
        ...prev,
        fondoZIndex: zMap[baseShapeId] ?? prev.fondoZIndex ?? 0,
        imagenes: (prev.imagenes || []).map((img) => ({
          ...img,
          zIndex: zMap[img.id] ?? img.zIndex ?? 10,
        })),
        textos: (prev.textos || []).map((txt) => ({
          ...txt,
          zIndex: zMap[txt.id] ?? txt.zIndex ?? 100,
        })),
      };
    });
  };

  // Mostrar u ocultar una capa específica
  const toggleLayerVisibility = (targetId, layerType) => {
    setEditorState((prev) => {
      if (layerType === 'shape') {
        if (mode === 'footer') {
          return { ...prev, mostrarRecuadroValidacion: prev.mostrarRecuadroValidacion === false };
        }
        return { ...prev, mostrarLineaDivisoria: prev.mostrarLineaDivisoria === false };
      }
      if (layerType === 'image') {
        return {
          ...prev,
          imagenes: prev.imagenes.map((img) =>
            img.id === targetId ? { ...img, visible: img.visible === false } : img
          ),
        };
      }
      if (layerType === 'text') {
        return {
          ...prev,
          textos: prev.textos.map((txt) =>
            txt.id === targetId ? { ...txt, visible: txt.visible === false } : txt
          ),
        };
      }
      return prev;
    });
  };

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
      const newId = `img-${Date.now()}`;

      setEditorState((prev) => {
        const nextZ = getMaxZIndex(prev) + 10;
        const newImg = {
          id: newId,
          nombre: file.name.replace(/\.[^/.]+$/, ''),
          url: finalUrl,
          x: Math.round(CANVAS_WIDTH / 2 - defaultDim / 2),
          y: Math.round(canvasHeight / 2 - defaultDim / 2),
          width: defaultDim,
          height: defaultDim,
          opacity: 1,
          lockRatio: true,
          zIndex: nextZ,
          visible: true,
        };
        return {
          ...prev,
          imagenes: [...prev.imagenes, newImg],
        };
      });
      setSelectedId(newId);
      setSelectedType('image');
      setActiveTab('propiedades');
    }
    e.target.value = '';
  };

  // Agregar preset de imagen (se agrega en la capa superior por encima del recuadro de fondo)
  const handleAddPresetImage = (preset) => {
    const newId = `img-${Date.now()}`;
    setEditorState((prev) => {
      const nextZ = getMaxZIndex(prev) + 10;
      const newImg = {
        id: newId,
        nombre: preset.name,
        url: preset.url,
        x: Math.round(CANVAS_WIDTH / 2 - preset.defaultW / 2),
        y: 20,
        width: preset.defaultW,
        height: preset.defaultH,
        opacity: 1,
        lockRatio: Boolean(preset.lockRatio),
        zIndex: nextZ,
        visible: true,
      };
      return {
        ...prev,
        imagenes: [...prev.imagenes, newImg],
      };
    });
    setSelectedId(newId);
    setSelectedType('image');
    setActiveTab('propiedades');
  };

  // AGREGAR NUEVO TEXTO (Tanto en Cabecera como en Footer, en la capa superior)
  const handleAddNewText = () => {
    const newId = `txt-${Date.now()}`;
    setEditorState((prev) => {
      const nextZ = getMaxZIndex(prev) + 10;
      const newTxt = {
        id: newId,
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
        zIndex: nextZ,
        visible: true,
      };
      return {
        ...prev,
        textos: [...prev.textos, newTxt],
      };
    });
    setSelectedId(newId);
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

          <button
            onClick={() => setActiveTab('capas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'capas'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                : 'text-amber-400/90 hover:text-amber-300 bg-amber-950/20 border border-amber-800/30'
            }`}
            title="Organizar qué elementos van arriba (frente) y cuáles van abajo (fondo) en el SVG"
          >
            <Layers className="w-3.5 h-3.5" /> Capas SVG ({getUnifiedLayers(editorState).length})
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
              <span className="text-[11px] text-slate-400 font-semibold">Presets oficiales:</span>
              {presetsDisponibles.map((preset) => (
                <button
                  key={preset.id || preset.name}
                  onClick={() => handleAddPresetImage(preset)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 transition flex items-center gap-1.5 shadow-sm"
                  title={`Insertar ${preset.name} (${preset.defaultW}x${preset.defaultH})`}
                >
                  <img src={preset.url} alt="" className="w-3.5 h-3.5 object-contain rounded" />
                  <span>+ {preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Lista de imágenes añadidas */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-850 flex-wrap gap-2">
            <div className="flex flex-wrap gap-2">
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
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      reorderLayer(img.id, 'front');
                      toast.success(`"${img.nombre}" traído al frente (capa superior)`);
                    }}
                    className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-[10px] font-bold transition flex items-center gap-0.5"
                    title="Traer esta imagen al frente (encima del recuadro y demás elementos)"
                  >
                    <ChevronsUp className="w-3 h-3" /> Al Frente
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('capas')}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Layers className="w-3.5 h-3.5" /> Organizar Capas SVG
            </button>
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
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        reorderLayer(txt.id, 'front');
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold transition"
                      title="Traer texto al frente"
                    >
                      Al Frente
                    </button>
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

      {/* Panel de Controles: Gestor de Capas SVG (Orden de Superposición Z-Index) */}
      {activeTab === 'capas' && (
        <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3 animate-in fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-extrabold text-white uppercase tracking-wide">
                  Gestor de Capas del SVG (Orden de Superposición: Arriba vs. Abajo)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Las capas en la parte <strong className="text-amber-300">SUPERIOR (Frente)</strong> se dibujan encima de las capas en la parte <strong className="text-slate-300">INFERIOR (Fondo)</strong> tanto en el visor como en el PDF.
              </p>
            </div>

            {mode === 'footer' && (
              <button
                type="button"
                onClick={() => {
                  reorderLayer('__recuadro_fondo__', 'back');
                  toast.success('Recuadro contenedor QR enviado al fondo detrás de todas las imágenes y textos');
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow transition"
              >
                <ChevronsDown className="w-3.5 h-3.5" /> Enviar Recuadro QR al Fondo
              </button>
            )}
          </div>

          {/* Lista de Capas desde la más alta (Frente) hasta la más baja (Fondo) */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {(() => {
              const allLayersBottomToTop = getUnifiedLayers(editorState);
              const totalLayers = allLayersBottomToTop.length;
              // Mostrar de Arriba (Frente = último elemento) hacia Abajo (Fondo = índice 0)
              const layersTopToBottom = [...allLayersBottomToTop].reverse();

              return layersTopToBottom.map((layer, displayIdx) => {
                const isTop = displayIdx === 0;
                const isBottom = displayIdx === totalLayers - 1;
                const isSelected = selectedId === layer.id;

                let badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
                let typeLabel = 'Imagen';
                if (layer.layerType === 'text') {
                  badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                  typeLabel = 'Texto';
                } else if (layer.layerType === 'shape') {
                  badgeColor = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
                  typeLabel = mode === 'footer' ? 'Recuadro Fondo QR' : 'Línea Divisoria';
                }

                return (
                  <div
                    key={layer.id}
                    onClick={() => {
                      if (layer.layerType === 'image' || layer.layerType === 'text') {
                        setSelectedId(layer.id);
                        setSelectedType(layer.layerType);
                      }
                    }}
                    className={`flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border transition ${
                      isSelected
                        ? 'bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/50'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    } ${!layer.visible ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer">
                      {/* Indicador de Nivel de Capa */}
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-extrabold shrink-0 border ${
                          isTop
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : isBottom
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : 'bg-slate-950 text-slate-300 border-slate-800'
                        }`}
                      >
                        {isTop ? '▲ FRENTE (Arriba)' : isBottom ? '▼ FONDO (Abajo)' : `Capa #${totalLayers - displayIdx}`}
                      </span>

                      {/* Miniatura o Icono según tipo */}
                      {layer.layerType === 'image' && (
                        <img
                          src={layer.item.url}
                          alt={layer.label}
                          className="w-6 h-6 object-contain rounded bg-white p-0.5 border border-slate-700 shrink-0"
                        />
                      )}
                      {layer.layerType === 'text' && (
                        <div className="w-6 h-6 rounded bg-slate-950 border border-slate-700 flex items-center justify-center shrink-0 text-emerald-400 font-bold text-xs">
                          T
                        </div>
                      )}
                      {layer.layerType === 'shape' && (
                        <div
                          className="w-6 h-6 rounded border shrink-0 flex items-center justify-center text-[9px] font-bold"
                          style={{
                            backgroundColor: mode === 'footer' ? (editorState.colorFondo || '#F8FAFC') : '#0F172A',
                            borderColor: mode === 'footer' ? (editorState.colorBorde || '#E2E8F0') : (editorState.colorLinea || '#CBD5E1'),
                            color: '#334155',
                          }}
                        >
                          ▢
                        </div>
                      )}

                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${badgeColor}`}>
                        {typeLabel}
                      </span>

                      <span className="text-xs font-semibold text-white truncate" title={layer.label}>
                        {layer.label}
                      </span>
                    </div>

                    {/* Controles de color si es el Recuadro Contenedor QR */}
                    {layer.layerType === 'shape' && mode === 'footer' && (
                      <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] text-slate-300" onClick={(e) => e.stopPropagation()}>
                        <label className="flex items-center gap-1 cursor-pointer" title="Color de relleno del recuadro QR">
                          <span>Fondo:</span>
                          <input
                            type="color"
                            value={editorState.colorFondo || '#F8FAFC'}
                            onChange={(e) => setEditorState((prev) => ({ ...prev, colorFondo: e.target.value }))}
                            className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                          />
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer" title="Color del borde del recuadro QR">
                          <span>Borde:</span>
                          <input
                            type="color"
                            value={editorState.colorBorde || '#E2E8F0'}
                            onChange={(e) => setEditorState((prev) => ({ ...prev, colorBorde: e.target.value }))}
                            className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                          />
                        </label>
                      </div>
                    )}

                    {/* Botones de Orden de Capa (Frente, Subir, Bajar, Fondo, Visibilidad) */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        disabled={isTop}
                        onClick={() => reorderLayer(layer.id, 'front')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-0.5 border transition ${
                          isTop
                            ? 'bg-slate-950 text-slate-600 border-slate-850 cursor-not-allowed'
                            : 'bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border-amber-500/30'
                        }`}
                        title="Traer al Frente (encima de todas las capas)"
                      >
                        <ChevronsUp className="w-3.5 h-3.5" /> Frente
                      </button>

                      <button
                        type="button"
                        disabled={isTop}
                        onClick={() => reorderLayer(layer.id, 'up')}
                        className={`p-1 rounded-lg border transition ${
                          isTop
                            ? 'bg-slate-950 text-slate-600 border-slate-850 cursor-not-allowed'
                            : 'bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white border-slate-700'
                        }`}
                        title="Subir 1 capa (hacia adelante)"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        disabled={isBottom}
                        onClick={() => reorderLayer(layer.id, 'down')}
                        className={`p-1 rounded-lg border transition ${
                          isBottom
                            ? 'bg-slate-950 text-slate-600 border-slate-850 cursor-not-allowed'
                            : 'bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white border-slate-700'
                        }`}
                        title="Bajar 1 capa (hacia atrás)"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        disabled={isBottom}
                        onClick={() => reorderLayer(layer.id, 'back')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-0.5 border transition ${
                          isBottom
                            ? 'bg-slate-950 text-slate-600 border-slate-850 cursor-not-allowed'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                        }`}
                        title="Enviar al Fondo (debajo de todas las capas)"
                      >
                        <ChevronsDown className="w-3.5 h-3.5" /> Fondo
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleLayerVisibility(layer.id, layer.layerType)}
                        className={`p-1 rounded-lg border transition ${
                          layer.visible
                            ? 'bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-700'
                            : 'bg-rose-950/40 text-rose-400 border-rose-800/50'
                        }`}
                        title={layer.visible ? 'Capa visible (clic para ocultar)' : 'Capa oculta (clic para mostrar)'}
                      >
                        {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Panel de Propiedades del Elemento Seleccionado */}
      {activeTab === 'propiedades' && selectedElement && (
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 animate-in fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Elemento Seleccionado:</span>
              <span className="text-xs text-blue-400 font-mono">
                {selectedType === 'image' ? selectedElement.nombre : selectedElement.texto?.slice(0, 30) + '...'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Controles rápidos de Capa para el elemento seleccionado */}
              <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                <Layers className="w-3.5 h-3.5 text-amber-400 mr-0.5" />
                <span className="text-[10px] font-bold text-slate-400 mr-1">Capa:</span>
                <button
                  type="button"
                  onClick={() => reorderLayer(selectedId, 'front')}
                  className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-[10px] font-bold flex items-center gap-0.5 transition"
                  title="Traer al Frente (encima del recuadro y de todos los elementos)"
                >
                  <ChevronsUp className="w-3 h-3" /> Traer al Frente
                </button>
                <button
                  type="button"
                  onClick={() => reorderLayer(selectedId, 'up')}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white text-[10px] font-semibold flex items-center gap-0.5 transition"
                  title="Subir 1 capa"
                >
                  <ArrowUp className="w-3 h-3" /> Subir
                </button>
                <button
                  type="button"
                  onClick={() => reorderLayer(selectedId, 'down')}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white text-[10px] font-semibold flex items-center gap-0.5 transition"
                  title="Bajar 1 capa"
                >
                  <ArrowDown className="w-3 h-3" /> Bajar
                </button>
                <button
                  type="button"
                  onClick={() => reorderLayer(selectedId, 'back')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-semibold flex items-center gap-0.5 transition"
                  title="Enviar al Fondo (debajo de todos los elementos)"
                >
                  <ChevronsDown className="w-3 h-3" /> Al Fondo
                </button>
              </div>

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

      {/* LIENZO SVG INTERACTIVO (Simula la sección de la hoja de papel Carta respetando el orden exacto de Capas) */}
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

            {/* Renderizado unificado por Orden de Capas (de abajo hacia arriba según zIndex) */}
            {getUnifiedLayers(editorState).map((layer) => {
              if (!layer.visible) return null;

              if (layer.layerType === 'shape') {
                if (mode === 'footer') {
                  return (
                    <rect
                      key={layer.id}
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
                  );
                }
                return (
                  <line
                    key={layer.id}
                    x1={25}
                    y1={canvasHeight - 15}
                    x2={CANVAS_WIDTH - 25}
                    y2={canvasHeight - 15}
                    stroke={editorState.colorLinea || '#CBD5E1'}
                    strokeWidth={1.5}
                  />
                );
              }

              if (layer.layerType === 'text') {
                const txt = layer.item;
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
              }

              if (layer.layerType === 'image') {
                const img = layer.item;
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
                  </g>
                );
              }

              return null;
            })}

            {/* Controles de Selección y Puntos de Redimensionamiento siempre en el frente para facilitar su uso */}
            {selectedType === 'image' && selectedElement && selectedElement.visible !== false && (
              <g transform={`translate(${selectedElement.x}, ${selectedElement.y})`}>
                <rect
                  x={0}
                  y={0}
                  width={selectedElement.width}
                  height={selectedElement.height}
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  className="pointer-events-none"
                />
                {/* Badge flotante que muestra el tamaño exacto y simetría */}
                <g transform="translate(0, -22)" className="pointer-events-none select-none">
                  <rect
                    x={0}
                    y={0}
                    width={Math.max(85, (selectedElement.nombre || '').length * 6 + 45)}
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
                    {selectedElement.width}×{selectedElement.height}px {selectedElement.lockRatio ? '🔒1:1' : ''}
                  </text>
                </g>

                {/* PUNTOS INTERACTIVOS DE REDIMENSIONAMIENTO (8 Resize Handles) */}
                <g>
                  <circle
                    cx={0}
                    cy={0}
                    r={5.5}
                    fill="#FFFFFF"
                    stroke="#2563EB"
                    strokeWidth={2}
                    className="cursor-nwse-resize hover:fill-blue-600 transition-colors"
                    onMouseDown={(e) => handleResizeStart(e, 'nw', selectedElement)}
                  />
                  <circle
                    cx={selectedElement.width}
                    cy={0}
                    r={5.5}
                    fill="#FFFFFF"
                    stroke="#2563EB"
                    strokeWidth={2}
                    className="cursor-nesw-resize hover:fill-blue-600 transition-colors"
                    onMouseDown={(e) => handleResizeStart(e, 'ne', selectedElement)}
                  />
                  <circle
                    cx={selectedElement.width}
                    cy={selectedElement.height}
                    r={5.5}
                    fill="#FFFFFF"
                    stroke="#2563EB"
                    strokeWidth={2}
                    className="cursor-nwse-resize hover:fill-blue-600 transition-colors"
                    onMouseDown={(e) => handleResizeStart(e, 'se', selectedElement)}
                  />
                  <circle
                    cx={0}
                    cy={selectedElement.height}
                    r={5.5}
                    fill="#FFFFFF"
                    stroke="#2563EB"
                    strokeWidth={2}
                    className="cursor-nesw-resize hover:fill-blue-600 transition-colors"
                    onMouseDown={(e) => handleResizeStart(e, 'sw', selectedElement)}
                  />
                  <rect
                    x={selectedElement.width / 2 - 4}
                    y={-4}
                    width={8}
                    height={8}
                    rx={2}
                    fill="#FFFFFF"
                    stroke="#2563EB"
                    strokeWidth={1.5}
                    className="cursor-ns-resize hover:fill-blue-600 transition-colors"
                    onMouseDown={(e) => handleResizeStart(e, 'n', selectedElement)}
                  />
                  <rect
                    x={selectedElement.width / 2 - 4}
                    y={selectedElement.height - 4}
                    width={8}
                    height={8}
                    rx={2}
                    fill="#FFFFFF"
                    stroke="#2563EB"
                    strokeWidth={1.5}
                    className="cursor-ns-resize hover:fill-blue-600 transition-colors"
                    onMouseDown={(e) => handleResizeStart(e, 's', selectedElement)}
                  />
                  <rect
                    x={selectedElement.width - 4}
                    y={selectedElement.height / 2 - 4}
                    width={8}
                    height={8}
                    rx={2}
                    fill="#FFFFFF"
                    stroke="#2563EB"
                    strokeWidth={1.5}
                    className="cursor-ew-resize hover:fill-blue-600 transition-colors"
                    onMouseDown={(e) => handleResizeStart(e, 'e', selectedElement)}
                  />
                  <rect
                    x={-4}
                    y={selectedElement.height / 2 - 4}
                    width={8}
                    height={8}
                    rx={2}
                    fill="#FFFFFF"
                    stroke="#2563EB"
                    strokeWidth={1.5}
                    className="cursor-ew-resize hover:fill-blue-600 transition-colors"
                    onMouseDown={(e) => handleResizeStart(e, 'w', selectedElement)}
                  />
                </g>
              </g>
            )}

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

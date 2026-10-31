import { jsPDF } from 'jspdf';
import { generarQrDataUrl } from './qrCodeHelper';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

/**
 * Convierte un Blob a Data URL
 */
function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

/**
 * Rasteriza cualquier recurso de imagen (especialmente SVG o WebP) a un Data URL PNG
 * usando un elemento Canvas de HTML5 con escalado de alta densidad para máxima nitidez en PDF.
 */
async function rasterizeToPngDataUrl(sourceUrlOrDataUrl, defaultW = 400, defaultH = 400) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      // Timeout de seguridad para evitar bloqueos
      const timer = setTimeout(() => {
        resolve(null);
      }, 6000);

      img.onload = () => {
        clearTimeout(timer);
        try {
          const canvas = document.createElement('canvas');
          // Factor de escala 3x para nitidez heráldica e institucional
          const dpr = 3;
          const w = Math.round((img.naturalWidth || defaultW) * dpr);
          const h = Math.round((img.naturalHeight || defaultH) * dpr);

          canvas.width = Math.min(Math.max(w, 200), 2400);
          canvas.height = Math.min(Math.max(h, 200), 2400);

          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const pngData = canvas.toDataURL('image/png');
          resolve(pngData);
        } catch (e) {
          console.warn('Error rasterizando en canvas:', e);
          resolve(null);
        }
      };

      img.onerror = (e) => {
        clearTimeout(timer);
        console.warn('Error cargando Image() para rasterizar:', sourceUrlOrDataUrl, e);
        resolve(null);
      };

      img.src = sourceUrlOrDataUrl;
    } catch (err) {
      console.warn('Error en rasterizeToPngDataUrl:', err);
      resolve(null);
    }
  });
}

const R2_WEB_IMG_BASE = 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img';

/**
 * Normaliza cualquier ruta local heredada (/img/...) para que apunte siempre al servidor Cloudflare R2 oficial.
 */
export function normalizeToR2ImageUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('data:')) return trimmed;

  // Si es una ruta relativa local /img/..., redirigir al bucket R2 oficial
  if (trimmed === '/img/logo.png' || trimmed.endsWith('/img/logo.png')) {
    if (!trimmed.includes('r2.dev')) return `${R2_WEB_IMG_BASE}/logo.png`;
  }
  if (trimmed === '/img/mppcomunas.png' || trimmed.endsWith('/img/mppcomunas.png')) {
    if (!trimmed.includes('r2.dev')) return `${R2_WEB_IMG_BASE}/mppcomunas.png`;
  }
  if (trimmed === '/img/sello.png' || trimmed.endsWith('/img/sello.png')) {
    if (!trimmed.includes('r2.dev')) return `${R2_WEB_IMG_BASE}/sello.png`;
  }
  if (trimmed === '/img/tei.png' || trimmed.endsWith('/img/tei.png')) {
    if (!trimmed.includes('r2.dev')) return `${R2_WEB_IMG_BASE}/tei.png`;
  }
  if (trimmed === '/img/escudo_venezuela.png' || trimmed === '/img/escudo_venezuela.svg') {
    return `${R2_WEB_IMG_BASE}/escudo_venezuela.svg`;
  }
  if (trimmed.startsWith('/img/')) {
    return `${R2_WEB_IMG_BASE}/${trimmed.replace(/^\/img\//, '')}`;
  }

  return trimmed;
}

/**
 * Convierte una imagen URL a base64 Data URL compatible con jsPDF (PNG o JPEG)
 * obteniendo los recursos directamente desde el servidor Cloudflare R2.
 * Si la imagen es un SVG, la rasteriza a PNG para garantizar compatibilidad total con jsPDF.
 */
async function getBase64ImageFromUrl(imageUrl, widthPx = 300, heightPx = 300) {
  if (!imageUrl) return null;

  const resolvedUrl = normalizeToR2ImageUrl(imageUrl);

  // 1. Si ya es un Data URL directo compatible (PNG o JPEG)
  if (
    resolvedUrl.startsWith('data:image/png') ||
    resolvedUrl.startsWith('data:image/jpeg') ||
    resolvedUrl.startsWith('data:image/jpg')
  ) {
    return resolvedUrl;
  }

  // 2. Si es un Data URL de SVG o WebP, rasterizar a PNG de alta densidad
  if (resolvedUrl.startsWith('data:image/svg+xml') || resolvedUrl.startsWith('data:image/webp')) {
    const pngFromDataUrl = await rasterizeToPngDataUrl(resolvedUrl, widthPx, heightPx);
    if (pngFromDataUrl) return pngFromDataUrl;
  }

  // 3. Para URLs externas (como Cloudflare R2 https://pub-...r2.dev/...),
  // obtener a través del endpoint proxy del servidor (/api/upload?url=...) para evitar bloqueos CORS en el navegador
  if (resolvedUrl.startsWith('https://') || resolvedUrl.startsWith('http://')) {
    try {
      const proxyRes = await fetch(`/api/upload?url=${encodeURIComponent(resolvedUrl)}`, {
        cache: 'no-store',
      });
      if (proxyRes.ok) {
        const proxyData = await proxyRes.json();
        if (proxyData?.dataUrl) {
          const dt = proxyData.dataUrl;
          const ct = (proxyData.contentType || '').toLowerCase();
          if (ct.includes('svg') || dt.startsWith('data:image/svg+xml') || dt.startsWith('data:image/webp') || resolvedUrl.toLowerCase().endsWith('.svg')) {
            const rasterized = await rasterizeToPngDataUrl(dt, widthPx, heightPx);
            if (rasterized) return rasterized;
          }
          return dt;
        }
      }
    } catch (proxyErr) {
      console.warn('Fallback a fetch directo tras error en proxy de imagen R2:', proxyErr);
    }
  }

  // 4. Intento directo mediante fetch con CORS
  try {
    const res = await fetch(resolvedUrl, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentType = res.headers.get('content-type') || '';
    const blob = await res.blob();

    // Si la respuesta es SVG (por extensión o Content-Type), rasterizar a PNG
    if (contentType.includes('svg') || resolvedUrl.toLowerCase().endsWith('.svg')) {
      const dataUrlSvg = await blobToDataUrl(blob);
      if (dataUrlSvg) {
        const pngData = await rasterizeToPngDataUrl(dataUrlSvg, widthPx, heightPx);
        if (pngData) return pngData;
      }
    }

    // Para PNG / JPEG estándar
    return await blobToDataUrl(blob);
  } catch (err) {
    console.warn('No se pudo cargar imagen para PDF:', resolvedUrl, err);
    try {
      const fallbackPng = await rasterizeToPngDataUrl(resolvedUrl, widthPx, heightPx);
      if (fallbackPng) return fallbackPng;
    } catch (e) {}
    return null;
  }
}

/**
 * Renderiza texto enriquecido en jsPDF con soporte para Negrita, Cursiva,
 * Subrayado, Mayúsculas, Alineación, Tamaño y Color HEX
 */
function renderStyledPdfText(doc, txtItem, xMm, yMm, align = 'center') {
  const isBold = txtItem.fontWeight === 'bold';
  const isItalic = txtItem.fontStyle === 'italic';
  let fontStyle = 'normal';
  if (isBold && isItalic) fontStyle = 'bolditalic';
  else if (isBold) fontStyle = 'bold';
  else if (isItalic) fontStyle = 'italic';

  doc.setFont('helvetica', fontStyle);
  doc.setFontSize(Math.max(6, Math.round((txtItem.fontSize || 10) * 0.75)));

  let r = 30, g = 41, b = 59;
  if (txtItem.color && txtItem.color.startsWith('#') && txtItem.color.length === 7) {
    r = parseInt(txtItem.color.slice(1, 3), 16) || 0;
    g = parseInt(txtItem.color.slice(3, 5), 16) || 0;
    b = parseInt(txtItem.color.slice(5, 7), 16) || 0;
  }
  doc.setTextColor(r, g, b);

  let textToRender = txtItem.texto || '';
  if (txtItem.textTransform === 'uppercase') {
    textToRender = textToRender.toUpperCase();
  }

  doc.text(textToRender, xMm, yMm, { align });

  if (txtItem.textDecoration === 'underline' && textToRender) {
    const textW = doc.getTextWidth(textToRender);
    let startX = xMm;
    if (align === 'center') startX = xMm - (textW / 2);
    else if (align === 'right') startX = xMm - textW;

    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.3);
    doc.line(startX, yMm + 0.6, startX + textW, yMm + 0.6);
  }
}

/**
 * Renderiza la Cabecera Única de Documentos en jsPDF a partir de la configuración SVG o el fallback oficial
 */
export async function renderCabeceraOficialPdf({
  doc,
  encabezadoConfig,
  config = {},
  pageWidth = 215.9,
  marginX = 22,
  mmPerPx = 215.9 / 750,
  situr = '08-11-04-001-0033',
  rif = 'C299916862',
  urbanizacion = 'Dr. Alfredo Travieso Paúl',
  parroquia = 'Goaigoaza',
  municipio = 'Puerto Cabello',
  estado = 'Carabobo',
  defaultY = 14,
}) {
  let y = defaultY;

  if (encabezadoConfig && ((encabezadoConfig.imagenes && encabezadoConfig.imagenes.length > 0) || (encabezadoConfig.textos && encabezadoConfig.textos.length > 0))) {
    const customHeaderH = encabezadoConfig.height ? parseInt(encabezadoConfig.height, 10) : 180;
    const headerBottomY = Math.max(38, (customHeaderH - 12) * mmPerPx);

    const headerLayers = [];
    if (encabezadoConfig.mostrarLineaDivisoria !== false) {
      headerLayers.push({
        layerType: 'shape',
        zIndex: typeof encabezadoConfig.fondoZIndex === 'number' ? encabezadoConfig.fondoZIndex : 0,
      });
    }

    (encabezadoConfig.imagenes || []).forEach((imgItem, idx) => {
      if (imgItem.visible !== false && imgItem.url) {
        headerLayers.push({
          layerType: 'image',
          zIndex: typeof imgItem.zIndex === 'number' ? imgItem.zIndex : (idx + 1) * 10,
          item: imgItem,
        });
      }
    });

    (encabezadoConfig.textos || []).forEach((rawTxtItem, idx) => {
      if (rawTxtItem.visible !== false) {
        headerLayers.push({
          layerType: 'text',
          zIndex: typeof rawTxtItem.zIndex === 'number'
            ? rawTxtItem.zIndex
            : ((encabezadoConfig.imagenes?.length || 0) + idx + 1) * 10,
          item: rawTxtItem,
        });
      }
    });

    headerLayers.sort((a, b) => a.zIndex - b.zIndex);

    for (const layer of headerLayers) {
      if (layer.layerType === 'shape') {
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.4);
        doc.line(marginX, headerBottomY, pageWidth - marginX, headerBottomY);
      } else if (layer.layerType === 'image') {
        const imgItem = layer.item;
        const b64 = await getBase64ImageFromUrl(
          imgItem.url,
          Math.max(100, Math.round((imgItem.width || 60) * 3)),
          Math.max(100, Math.round((imgItem.height || 60) * 3))
        );
        if (b64) {
          try {
            const xMm = imgItem.x * mmPerPx;
            const yMm = Math.max(4, imgItem.y * mmPerPx);
            const wMm = imgItem.width * mmPerPx;
            const hMm = imgItem.height * mmPerPx;
            const fmt = b64.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
            doc.addImage(b64, fmt, xMm, yMm, wMm, hMm);
          } catch (e) {
            console.warn('Error renderizando imagen de cabecera:', imgItem.nombre, e);
          }
        }
      } else if (layer.layerType === 'text') {
        let txtItem = { ...layer.item };
        if (txtItem.texto && txtItem.texto.includes('SITUR:') && situr) {
          txtItem.texto = txtItem.texto.replace(/SITUR:\s*[^|,\n]+/, `SITUR: ${situr}`);
        }
        if (txtItem.texto && txtItem.texto.includes('RIF:') && rif) {
          txtItem.texto = txtItem.texto.replace(/RIF:\s*[^|,\n]+/, `RIF: ${rif}`);
        }

        const xMm = txtItem.x * mmPerPx;
        const yMm = Math.max(10, txtItem.y * mmPerPx);
        let align = 'center';
        if (txtItem.align === 'start') align = 'left';
        if (txtItem.align === 'end') align = 'right';

        renderStyledPdfText(doc, txtItem, xMm, yMm, align);
      }
    }

    return headerBottomY;
  } else {
    // Fallback: Cabecera predeterminada oficial
    const logoUrl = config.logo_url || 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/logo.png';
    const mppcomunasUrl = config.mppcomunas_url || 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/mppcomunas.png';

    const [logoB64, mppcomunasB64] = await Promise.all([
      getBase64ImageFromUrl(logoUrl),
      getBase64ImageFromUrl(mppcomunasUrl),
    ]);

    if (mppcomunasB64) {
      try {
        doc.addImage(mppcomunasB64, 'PNG', marginX, y, 32, 16);
      } catch (e) {
        console.warn('Error agregando logo MPP Comunas', e);
      }
    }

    if (logoB64) {
      try {
        doc.addImage(logoB64, 'PNG', pageWidth - marginX - 22, y - 2, 22, 22);
      } catch (e) {
        console.warn('Error agregando logo CC', e);
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('REPÚBLICA BOLIVARIANA DE VENEZUELA', pageWidth / 2, y + 4, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('MINISTERIO DEL PODER POPULAR PARA LAS COMUNAS Y LOS MOVIMIENTOS SOCIALES', pageWidth / 2, y + 8, { align: 'center' });
    doc.text('CONSEJO COMUNAL "LAS LLAVES"', pageWidth / 2, y + 12, { align: 'center' });
    doc.text(`Urbanización ${urbanizacion} - Parroquia ${parroquia}`, pageWidth / 2, y + 16, { align: 'center' });
    doc.text(`Municipio ${municipio}, Estado ${estado} | RIF: ${rif} | SITUR: ${situr}`, pageWidth / 2, y + 20, { align: 'center' });

    y += 24;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(marginX, y, pageWidth - marginX, y);
    return y;
  }
}

/**
 * Renderiza el Footer Único de Documentos en jsPDF con validador QR y recuadro oficial
 */
export async function renderFooterOficialPdf({
  doc,
  pieConfig,
  config = {},
  qrDataUrl = null,
  validationUrl = '',
  codigoQr = '',
  fechaEmision = '',
  fechaVencimiento = '',
  vigenciaDias = 60,
  tituloCertificacion = 'CERTIFICACIÓN Y VALIDACIÓN DIGITAL DE CONSTANCIA',
  pageWidth = 215.9,
  pageHeight = 279.4,
  marginX = 22,
  mmPerPx = 215.9 / 750,
}) {
  const y = pageHeight - 38;
  const footerInnerW = pageWidth - (marginX * 2);
  const footerCanvasW = 750;
  const footerBoxH = 28;
  const footerCanvasH = pieConfig?.height ? parseInt(pieConfig.height, 10) : 150;

  if (pieConfig && ((pieConfig.imagenes && pieConfig.imagenes.length > 0) || (pieConfig.textos && pieConfig.textos.length > 0))) {
    const footerLayers = [];

    if (pieConfig.mostrarRecuadroValidacion !== false) {
      footerLayers.push({
        layerType: 'shape',
        zIndex: typeof pieConfig.fondoZIndex === 'number' ? pieConfig.fondoZIndex : 0,
      });
    }

    let hasQrPlaceholderLayer = false;
    (pieConfig.imagenes || []).forEach((imgItem, idx) => {
      if (imgItem.id === 'img-qr-placeholder') {
        hasQrPlaceholderLayer = true;
      }
      if (imgItem.visible !== false && (imgItem.url || imgItem.id === 'img-qr-placeholder')) {
        footerLayers.push({
          layerType: 'image',
          zIndex: typeof imgItem.zIndex === 'number' ? imgItem.zIndex : (idx + 1) * 10,
          item: imgItem,
        });
      }
    });

    if (!hasQrPlaceholderLayer && qrDataUrl) {
      footerLayers.push({
        layerType: 'image',
        zIndex: 10,
        item: { id: 'img-qr-placeholder', x: 25, y: 22, width: 85, height: 85, lockRatio: true },
      });
    }

    (pieConfig.textos || []).forEach((txtItem, idx) => {
      if (txtItem.visible !== false) {
        footerLayers.push({
          layerType: 'text',
          zIndex: typeof txtItem.zIndex === 'number'
            ? txtItem.zIndex
            : ((pieConfig.imagenes?.length || 0) + idx + 1) * 10,
          item: txtItem,
        });
      }
    });

    footerLayers.sort((a, b) => a.zIndex - b.zIndex);

    for (const layer of footerLayers) {
      if (layer.layerType === 'shape') {
        let fr = 248, fg = 250, fb = 252;
        if (pieConfig.colorFondo && pieConfig.colorFondo.startsWith('#') && pieConfig.colorFondo.length === 7) {
          fr = parseInt(pieConfig.colorFondo.slice(1, 3), 16) || 248;
          fg = parseInt(pieConfig.colorFondo.slice(3, 5), 16) || 250;
          fb = parseInt(pieConfig.colorFondo.slice(5, 7), 16) || 252;
        }
        let br = 226, bg = 232, bb = 240;
        if (pieConfig.colorBorde && pieConfig.colorBorde.startsWith('#') && pieConfig.colorBorde.length === 7) {
          br = parseInt(pieConfig.colorBorde.slice(1, 3), 16) || 226;
          bg = parseInt(pieConfig.colorBorde.slice(3, 5), 16) || 232;
          bb = parseInt(pieConfig.colorBorde.slice(5, 7), 16) || 240;
        }
        doc.setFillColor(fr, fg, fb);
        doc.setDrawColor(br, bg, bb);
        doc.roundedRect(marginX, y, footerInnerW, footerBoxH, 2, 2, 'FD');
      } else if (layer.layerType === 'image') {
        const imgItem = layer.item;
        if (imgItem.id === 'img-qr-placeholder') {
          if (qrDataUrl) {
            const qrX = marginX + Math.max(2, ((imgItem.x - 20) * (footerInnerW / (footerCanvasW - 40))));
            const qrY = y + Math.max(1.5, ((imgItem.y - 10) * (footerBoxH / Math.max(40, footerCanvasH - 20))));
            const qrSize = Math.min(24, Math.max(16, (imgItem.height || 85) * (footerBoxH / Math.max(40, footerCanvasH - 20))));
            doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
          }
        } else if (imgItem.url) {
          const b64 = await getBase64ImageFromUrl(
            imgItem.url,
            Math.max(100, Math.round((imgItem.width || 60) * 3)),
            Math.max(100, Math.round((imgItem.height || 60) * 3))
          );
          if (b64) {
            try {
              const scaleX = footerInnerW / (footerCanvasW - 40);
              const scaleY = footerBoxH / Math.max(40, footerCanvasH - 20);
              const xMm = marginX + ((imgItem.x - 20) * scaleX);
              const yMm = y + ((imgItem.y - 10) * scaleY);
              const hMm = (imgItem.height || 60) * scaleY;
              const wMm = imgItem.lockRatio ? hMm * ((imgItem.width || 60) / Math.max(1, imgItem.height || 60)) : (imgItem.width || 60) * scaleX;
              const fmt = b64.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
              doc.addImage(b64, fmt, xMm, yMm, wMm, hMm);
            } catch (e) {
              console.warn('Error agregando imagen de capa al footer:', e);
            }
          }
        }
      } else if (layer.layerType === 'text') {
        let txtItem = { ...layer.item };
        if (txtItem.texto) {
          txtItem.texto = txtItem.texto
            .replace(/CCLL-EJEMPLO-001/g, `CCLL-${codigoQr}`)
            .replace(/{codigo_qr}/g, codigoQr || '')
            .replace(/DD\/MM\/AAAA/g, fechaEmision || '');
        }
        const xMm = marginX + ((txtItem.x - 20) * (footerInnerW / (footerCanvasW - 40)));
        const yMm = y + Math.max(3.5, Math.min(footerBoxH - 1.5, (txtItem.y - 10) * (footerBoxH / Math.max(40, footerCanvasH - 20))));
        let align = 'left';
        if (txtItem.align === 'middle') align = 'center';
        if (txtItem.align === 'end') align = 'right';

        renderStyledPdfText(doc, txtItem, xMm, yMm, align);
      }
    }
  } else {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(marginX, y, footerInnerW, footerBoxH, 2, 2, 'FD');

    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', marginX + 3, y + 2, 24, 24);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(tituloCertificacion, marginX + 30, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(71, 85, 105);
    doc.text('Código Único de Validación:', marginX + 30, y + 10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(codigoQr, marginX + 66, y + 10);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Fecha de Emisión: ${fechaEmision}   |   Válido hasta: ${fechaVencimiento} (${vigenciaDias} días)`, marginX + 30, y + 14.5);
    doc.text('Verifique este documento escaneando el código QR o ingresando en:', marginX + 30, y + 19);
    doc.setTextColor(37, 99, 235);
    doc.text(validationUrl, marginX + 30, y + 23);
  }
}

/**
 * Genera y descarga el documento oficial en formato PDF Carta
 */
export async function generarDocumentoPdf({
  documento, // { codigo_qr, tipo_documento, cedula, nombres_apellidos, vereda, casa, tiempo_residencia, fecha_emision, fecha_vencimiento, vigencia_dias }
  firmas = [], // array con las firmas autorizadas
  config = {},
  plantilla = null, // modelo de plantilla con encabezado_svg, pie_svg, cuerpo_template
  appUrl = (typeof window !== 'undefined' ? window.location.origin : 'https://lasllaves.org'),
}) {
  // Formato oficial 100% CARTA (Letter: 215.9 mm x 279.4 mm / 8.5 x 11 pulgadas)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
    compress: true,
  });

  doc.setProperties({
    title: `Documento Oficial Comunal - ${documento.codigo_qr}`,
    subject: 'Constancia Oficial Tamaño Carta (Letter)',
    author: 'Consejo Comunal Las Llaves',
    keywords: 'constancia, carta, letter, consejo comunal, las llaves',
    creator: 'Sistema de Gestión Documental Las Llaves'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 215.9 mm (Carta)
  const pageHeight = doc.internal.pageSize.getHeight(); // 279.4 mm (Carta)
  const marginX = 22;

  const situr = config.situr_codigo || '08-11-04-001-0033';
  const rif = config.rif || 'C299916862';
  const urbanizacion = config.urbanizacion || 'Dr. Alfredo Travieso Paúl';
  const parroquia = config.parroquia || 'Goaigoaza';
  const municipio = config.municipio || 'Puerto Cabello';
  const estado = config.estado || 'Carabobo';
  const selloPrincipalUrl = config.sello_principal_url || 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/sello.png';

  // 0. Auto-resolver plantilla y Cabecera/Footer únicos si no fueron proporcionados
  let plantillaEfectiva = plantilla;
  let cabeceraGlobalRaw = config.encabezado_svg_global || plantillaEfectiva?.encabezado_svg || '';
  let footerGlobalRaw = config.pie_svg_global || plantillaEfectiva?.pie_svg || '';

  if ((!plantillaEfectiva || !cabeceraGlobalRaw || !footerGlobalRaw) && typeof fetch !== 'undefined') {
    try {
      const targetId = documento?.tipo_documento || 'RESIDENCIA';
      const resMod = await fetch(`/api/modelador?id=${encodeURIComponent(targetId)}`);
      if (resMod.ok) {
        const dataMod = await resMod.json();
        if (dataMod?.plantilla && !plantillaEfectiva) {
          plantillaEfectiva = dataMod.plantilla;
        }
        if (dataMod?.cabecera_global && !cabeceraGlobalRaw) {
          cabeceraGlobalRaw = dataMod.cabecera_global;
        }
        if (dataMod?.footer_global && !footerGlobalRaw) {
          footerGlobalRaw = dataMod.footer_global;
        }
      }
    } catch (e) {
      console.warn('No se pudo autodescargar plantilla/cabecera global para PDF:', e);
    }
  }

  // 1. Parsear configuración visual de Cabecera Única de Documentos (encabezado_svg)
  let encabezadoConfig = null;
  const rawHeader = cabeceraGlobalRaw || plantillaEfectiva?.encabezado_svg;
  if (rawHeader) {
    try {
      encabezadoConfig = typeof rawHeader === 'string'
        ? JSON.parse(rawHeader)
        : rawHeader;
    } catch (e) {
      console.warn('Error parseando encabezado_svg único, usando predeterminado:', e);
    }
  }

  // 2. Parsear configuración visual de Footer Único de Documentos (pie_svg)
  let pieConfig = null;
  const rawFooter = footerGlobalRaw || plantillaEfectiva?.pie_svg;
  if (rawFooter) {
    try {
      pieConfig = typeof rawFooter === 'string'
        ? JSON.parse(rawFooter)
        : rawFooter;
    } catch (e) {
      console.warn('Error parseando pie_svg único, usando predeterminado:', e);
    }
  }

  // Factor de escala: convierte el lienzo de 750px de ancho a los 215.9mm de la hoja Carta
  const mmPerPx = pageWidth / 750;

  // 3. Renderizar Cabecera Dinámica / Oficial
  let y = await renderCabeceraOficialPdf({
    doc,
    encabezadoConfig,
    config,
    pageWidth,
    marginX,
    mmPerPx,
    situr,
    rif,
    urbanizacion,
    parroquia,
    municipio,
    estado,
  });

  // 4. Número de Oficio / Código de Registro
  y += 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`NRO: CCLL-${documento.codigo_qr}`, marginX, y);

  // 5. Título Principal
  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.setTextColor(15, 23, 42);

  let titulo = 'CONSTANCIA DE RESIDENCIA';
  if (documento.tipo_documento === 'BUENA_CONDUCTA') {
    titulo = 'CONSTANCIA DE BUENA CONDUCTA';
  } else if (documento.tipo_documento === 'FALLECIMIENTO') {
    titulo = 'CONSTANCIA DE NOTIFICACIÓN DE FALLECIMIENTO';
  } else if (documento.tipo_documento === 'FUNCIONAMIENTO') {
    titulo = 'CARTA COMUNAL DE FUNCIONAMIENTO COMERCIAL';
  }
  if (plantillaEfectiva?.titulo) {
    titulo = plantillaEfectiva.titulo;
  }
  doc.text(titulo, pageWidth / 2, y, { align: 'center' });

  // 6. Cuerpo del documento (Interpola plantilla dinámica si existe)
  y += 11;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);

  const fechaObj = new Date(documento.fecha_emision || Date.now());
  const dia = fechaObj.getDate();
  const mes = MESES[fechaObj.getMonth()];
  const ano = fechaObj.getFullYear();
  const tiempoRes = documento.tiempo_residencia || 'varios';

  let textoCuerpo = '';

  if (plantillaEfectiva?.cuerpo_template && plantillaEfectiva.cuerpo_template.trim().length > 0) {
    // Reemplazo de variables dinámicas configuradas por el usuario en el modelador
    textoCuerpo = plantillaEfectiva.cuerpo_template
      .replace(/{nombre_completo}/g, documento.nombres_apellidos || '')
      .replace(/{cedula}/g, documento.cedula || '')
      .replace(/{vereda}/g, documento.vereda || '')
      .replace(/{casa}/g, documento.casa || '')
      .replace(/{tiempo_residencia}/g, String(tiempoRes))
      .replace(/{codigo_qr}/g, documento.codigo_qr || '')
      .replace(/{dias}/g, String(dia))
      .replace(/{mes}/g, mes)
      .replace(/{ano}/g, String(ano))
      .replace(/{nombre_comercio}/g, documento.datos_extra?.nombre_comercio || documento.nombre_comercio || 'ESTABLECIMIENTO COMERCIAL')
      .replace(/{rif_comercio}/g, documento.datos_extra?.rif_comercio || documento.rif_comercio || 'J-00000000-0')
      .replace(/{tamano_espacio}/g, documento.datos_extra?.tamano_espacio || documento.tamano_espacio || 'área delimitada')
      .replace(/{rubro_establecimiento}/g, documento.datos_extra?.rubro_establecimiento || documento.rubro_establecimiento || 'Comercial')
      .replace(/{fecha_alquiler}/g, documento.datos_extra?.fecha_inicio_alquiler || documento.fecha_inicio_alquiler || `${dia} de ${mes} de ${ano}`);
  } else {
    // Redacción oficial estándar conforme a la Ley Orgánica de los Consejos Comunales (Reforma 2023)
    if (documento.tipo_documento === 'RESIDENCIA') {
      textoCuerpo = `Quienes suscriben, voceras y voceros integrantes del Colectivo de Gobierno Comunal, la Unidad Ejecutiva y la Comisión Electoral del Consejo Comunal "LAS LLAVES" de la Urbanización Dr. Alfredo Travieso Paúl, en ejercicio de las atribuciones legales conferidas en los artículos 18, 23, 25 y 34 numerales 19 y 20 de la Ley Orgánica de los Consejos Comunales (Reforma 2023), por medio de la presente hacemos constar que la ciudadana o ciudadano: ${documento.nombres_apellidos}, titular de la cédula de identidad N°: ${documento.cedula}, reside en esta comunidad desde hace ${tiempoRes} años, en la Vereda ${documento.vereda}, Casa N° ${documento.casa}, según consta en el Censo Demográfico Comunal.\n\nConstancia que se expide a solicitud de la parte interesada, en la ciudad de Puerto Cabello, a los ${dia} días del mes de ${mes} del año ${ano}.`;
    } else if (documento.tipo_documento === 'BUENA_CONDUCTA') {
      textoCuerpo = `Quienes suscriben, voceras y voceros del Colectivo de Gobierno Comunal y la Unidad Ejecutiva del Consejo Comunal de la Urbanización Dr. Alfredo Travieso Paúl "LAS LLAVES", de conformidad con los principios de corresponsabilidad y convivencia comunitaria previstos en los artículos 4, 18, 23 y 25 de la Ley Orgánica de los Consejos Comunales (Reforma 2023), hacemos constar por medio de la presente que conocemos de vista, trato y comunicación a la ciudadana o ciudadano: ${documento.nombres_apellidos}, C.I.: ${documento.cedula}, quien reside en la Vereda ${documento.vereda}, Casa N° ${documento.casa}, desde hace ${tiempoRes} años y demuestra una conducta cívica, pacífica y de respeto ciudadano dentro del ámbito geográfico de nuestra comunidad.\n\nConstancia que se expide a solicitud de la parte interesada, en la ciudad de Puerto Cabello, a los ${dia} días del mes de ${mes} del año ${ano}.`;
    } else if (documento.tipo_documento === 'FUNCIONAMIENTO') {
      const nomCom = documento.datos_extra?.nombre_comercio || documento.nombre_comercio || 'Establecimiento Comercial';
      const rifCom = documento.datos_extra?.rif_comercio || documento.rif_comercio || 'J-00000000-0';
      const tamEsp = documento.datos_extra?.tamano_espacio || documento.tamano_espacio || 'Área acondicionada';
      const rubro = documento.datos_extra?.rubro_establecimiento || documento.rubro_establecimiento || 'General';
      const fAlq = documento.datos_extra?.fecha_inicio_alquiler || documento.fecha_inicio_alquiler || `${dia} de ${mes} de ${ano}`;
      textoCuerpo = `Quienes suscriben, voceras y voceros del Colectivo de Gobierno Comunal, la Unidad Ejecutiva y la Unidad de Contraloría Social del Consejo Comunal de la Urbanización Dr. Alfredo Travieso Paúl "LAS LLAVES", en el marco de los artículos 18, 23, 25, 26 y 32 de la Ley Orgánica de los Consejos Comunales (Reforma 2023), hacen constar por medio de la presente que la ciudadana o ciudadano: ${documento.nombres_apellidos}, titular de la cédula de identidad N°: ${documento.cedula}, propietario(a) del inmueble ubicado en la Vereda ${documento.vereda}, Casa N° ${documento.casa}, posee en su vivienda un espacio comercial en calidad de arrendamiento.\n\nSe deja constancia comunal que en dicho inmueble funciona el establecimiento: ${nomCom}, RIF: ${rifCom}, bajo el rubro: ${rubro}, ocupando un área aproximada de ${tamEsp}, activo en esta dirección comunitaria desde la fecha ${fAlq}.\n\nConstancia que se expide a solicitud del propietario del inmueble para fines comerciales, legales y tributarios correspondientes, en la ciudad de Puerto Cabello, a los ${dia} días del mes de ${mes} del año ${ano}.`;
    } else {
      textoCuerpo = `Quienes suscriben, voceras y voceros integrantes del Colectivo de Gobierno Comunal, la Unidad Ejecutiva y la Comisión Electoral del Consejo Comunal de la Urbanización Dr. Alfredo Travieso Paúl "LAS LLAVES", en ejercicio de las atribuciones establecidas en la Ley Orgánica de los Consejos Comunales (Reforma 2023), hacen constar por medio de la presente que quien en vida fuera la ciudadana o ciudadano: ${documento.nombres_apellidos}, titular de la cédula de identidad N°: ${documento.cedula}, habitaba en esta comunidad en la Vereda ${documento.vereda}, Casa N° ${documento.casa}, según registro del Censo Demográfico Comunal, y se certifica la debida notificación de su sensible fallecimiento para los trámites civiles, legales y comunitarios pertinentes.\n\nConstancia que se expide a solicitud de parte interesada para trámites de ley, en la ciudad de Puerto Cabello, a los ${dia} días del mes de ${mes} del año ${ano}.`;
    }
  }

  const textLines = doc.splitTextToSize(textoCuerpo, pageWidth - (marginX * 2));
  doc.text(textLines, marginX, y, { lineHeightFactor: 1.45 });
  y += textLines.length * 6.5 + 5;

  // 7. Sección de Despedida
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Atentamente.', pageWidth / 2, y, { align: 'center' });
  y += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.text('Por el Consejo Comunal "LAS LLAVES"', pageWidth / 2, y, { align: 'center' });
  y += 18; // Espacio para las firmas

  // 8. Firmas y Sellos Autorizados (Instancias según Art. 18 Ley Orgánica de los Consejos Comunales 2023)
  const f1 = firmas[0] || { comision: 'Unidad Ejecutiva / Comisión Electoral C.C.', nombre: 'Luis Alberto Peñaloza', cedula: 'V-4839634', telefono: '0424-4098127' };
  const f2 = firmas[1] || { comision: 'Unidad de Contraloría Social C.C.', nombre: 'Pedro Moya', cedula: 'V-4595138', telefono: '0414-0986516' };
  const f3 = firmas[2] || { comision: 'Unidad Administrativa y Financiera C.C.', nombre: 'Vocería Delegada C.C.', cedula: 'V-8912450', telefono: '0412-5551234' };

  // Cargar imágenes de firma y sello en base64 de manera asíncrona
  const [f1FirmaB64, f2FirmaB64, f3FirmaB64, f1SelloB64, f2SelloB64, f3SelloB64, mainSelloB64] = await Promise.all([
    f1.url_firma ? getBase64ImageFromUrl(f1.url_firma) : null,
    f2.url_firma ? getBase64ImageFromUrl(f2.url_firma) : null,
    f3.url_firma ? getBase64ImageFromUrl(f3.url_firma) : null,
    (!f1.usar_sello_principal && f1.url_sello) ? getBase64ImageFromUrl(f1.url_sello) : null,
    (!f2.usar_sello_principal && f2.url_sello) ? getBase64ImageFromUrl(f2.url_sello) : null,
    (!f3.usar_sello_principal && f3.url_sello) ? getBase64ImageFromUrl(f3.url_sello) : null,
    getBase64ImageFromUrl(selloPrincipalUrl),
  ]);

  const col1X = marginX + 10;
  const col2X = pageWidth - marginX - 58;
  const lineLength = 52;

  // FIRMA 1 (Izquierda Superior)
  if (f1FirmaB64) {
    try {
      doc.addImage(f1FirmaB64, 'PNG', col1X + 2, y - 16, 42, 16);
    } catch (e) {
      console.warn('Error agregando imagen de firma 1:', e);
    }
  }
  if (f1SelloB64) {
    try {
      doc.addImage(f1SelloB64, 'PNG', col1X + 28, y - 14, 24, 24);
    } catch (e) {}
  }
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.3);
  doc.line(col1X, y, col1X + lineLength, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(f1.comision || 'Vocero Ejecutivo C.C.', col1X + 26, y + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Nombre: ${f1.nombre}`, col1X + 26, y + 7.5, { align: 'center' });
  doc.text(`C.I.: ${f1.cedula}`, col1X + 26, y + 11, { align: 'center' });
  doc.text(`Telef: ${f1.telefono}`, col1X + 26, y + 14.5, { align: 'center' });

  // FIRMA 2 (Derecha Superior)
  if (f2FirmaB64) {
    try {
      doc.addImage(f2FirmaB64, 'PNG', col2X + 2, y - 16, 42, 16);
    } catch (e) {
      console.warn('Error agregando imagen de firma 2:', e);
    }
  }
  if (f2SelloB64) {
    try {
      doc.addImage(f2SelloB64, 'PNG', col2X + 28, y - 14, 24, 24);
    } catch (e) {}
  }
  doc.line(col2X, y, col2X + lineLength, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(f2.comision || 'Vocero Ejecutivo C.C.', col2X + 26, y + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Nombre: ${f2.nombre}`, col2X + 26, y + 7.5, { align: 'center' });
  doc.text(`C.I.: ${f2.cedula}`, col2X + 26, y + 11, { align: 'center' });
  doc.text(`Telef: ${f2.telefono}`, col2X + 26, y + 14.5, { align: 'center' });

  // Sello Húmedo Principal Comunal Superpuesto en el Centro (Perspectiva y Geometría Configurable: Rectangular, Redondo, Cuadrado u Ovalado)
  if (mainSelloB64 && (f1.usar_sello_principal || f2.usar_sello_principal || f3.usar_sello_principal)) {
    try {
      const forma = config.sello_forma || 'rectangular';
      let stampW = config.sello_ancho_mm ? parseFloat(config.sello_ancho_mm) : 0;
      let stampH = config.sello_alto_mm ? parseFloat(config.sello_alto_mm) : 0;

      // Derivar según forma o tamaño legado si faltan dimensiones
      if (!stampW || !stampH) {
        const legacySize = config.sello_tamano_mm ? parseFloat(config.sello_tamano_mm) : 34;
        if (forma === 'rectangular') {
          stampW = stampW || 48;
          stampH = stampH || 26;
        } else if (forma === 'ovalado') {
          stampW = stampW || 45;
          stampH = stampH || 30;
        } else {
          // Redondo o Cuadrado
          stampW = stampW || legacySize;
          stampH = stampH || legacySize;
        }
      }

      // Si la forma es cuadrada o redonda, garantizar simetría 1:1
      if (forma === 'cuadrado' || forma === 'redondo') {
        const dim = Math.max(stampW, stampH);
        stampW = dim;
        stampH = dim;
      }

      const stampX = (pageWidth / 2) - (stampW / 2);
      const stampY = y - (stampH * 0.38);
      doc.addImage(mainSelloB64, 'PNG', stampX, stampY, stampW, stampH);
    } catch (e) {
      console.warn('Error agregando sello principal:', e);
    }
  }

  // FIRMA 3 (Centrada Inferior)
  y += 24;
  const col3X = (pageWidth / 2) - 26;
  if (f3FirmaB64) {
    try {
      doc.addImage(f3FirmaB64, 'PNG', col3X + 5, y - 16, 42, 16);
    } catch (e) {
      console.warn('Error agregando imagen de firma 3:', e);
    }
  }
  if (f3SelloB64) {
    try {
      doc.addImage(f3SelloB64, 'PNG', col3X + 30, y - 14, 24, 24);
    } catch (e) {}
  }
  doc.line(col3X, y, col3X + lineLength, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(f3.comision || 'Vocero Ejecutivo C.C.', pageWidth / 2, y + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Nombre: ${f3.nombre}`, pageWidth / 2, y + 7.5, { align: 'center' });
  doc.text(`C.I.: ${f3.cedula}`, pageWidth / 2, y + 11, { align: 'center' });
  doc.text(`Telef: ${f3.telefono}`, pageWidth / 2, y + 14.5, { align: 'center' });

  // 9. Pie de Página / Validador Digital (Respetando el orden de Capas zIndex del Editor SVG)
  const validationUrl = `${appUrl}/#validar?codigo=${documento.codigo_qr}`;
  const qrDataUrl = await generarQrDataUrl(validationUrl, { width: 140 });

  await renderFooterOficialPdf({
    doc,
    pieConfig,
    config,
    qrDataUrl,
    validationUrl,
    codigoQr: documento.codigo_qr,
    fechaEmision: documento.fecha_emision,
    fechaVencimiento: documento.fecha_vencimiento,
    vigenciaDias: documento.vigencia_dias || 60,
    tituloCertificacion: 'CERTIFICACIÓN Y VALIDACIÓN DIGITAL DE CONSTANCIA',
    pageWidth,
    pageHeight,
    marginX,
    mmPerPx,
  });

  // Descargar archivo
  const filename = `${titulo.toLowerCase().replace(/[\s"]/g, '_')}_${documento.codigo_qr}.pdf`;
  doc.save(filename);

  return filename;
}

/**
 * Genera y descarga un Reporte Integral de Gestión en PDF para auditorías físicas y archivo comunal,
 * conservando la misma Cabecera Única y Footer Único que los documentos legales oficiales.
 */
export async function generarReporteGestionPdf({
  rango = { fechaInicio: '', fechaFin: '' },
  resumen = {},
  tiposDocs = [],
  veredasData = [],
  parentescoData = [],
  instruccionData = [],
  saludData = [],
  firmas = [],
  firmanteSeleccionado = null,
  config = {},
  plantilla = null,
  appUrl = (typeof window !== 'undefined' ? window.location.origin : 'https://lasllaves.org'),
  usuarioGenerador = 'Administrador del Sistema'
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 215.9 mm (Carta)
  const pageHeight = doc.internal.pageSize.getHeight(); // 279.4 mm (Carta)
  const marginX = 18;
  const mmPerPx = pageWidth / 750;

  const situr = config.situr_codigo || '08-11-04-001-0033';
  const rif = config.rif || 'C299916862';
  const urbanizacion = config.urbanizacion || 'Dr. Alfredo Travieso Paúl';
  const parroquia = config.parroquia || 'Goaigoaza';
  const municipio = config.municipio || 'Puerto Cabello';
  const estado = config.estado || 'Carabobo';

  // 0. Auto-resolver cabecera y footer únicos si no están cargados
  let cabeceraGlobalRaw = config.encabezado_svg_global || plantilla?.encabezado_svg || '';
  let footerGlobalRaw = config.pie_svg_global || plantilla?.pie_svg || '';

  if ((!cabeceraGlobalRaw || !footerGlobalRaw) && typeof fetch !== 'undefined') {
    try {
      const resMod = await fetch('/api/modelador');
      if (resMod.ok) {
        const dataMod = await resMod.json();
        if (dataMod?.cabecera_global && !cabeceraGlobalRaw) {
          cabeceraGlobalRaw = dataMod.cabecera_global;
        }
        if (dataMod?.footer_global && !footerGlobalRaw) {
          footerGlobalRaw = dataMod.footer_global;
        }
      }
    } catch (e) {
      console.warn('Error obteniendo cabecera/footer únicos para reporte:', e);
    }
  }

  let encabezadoConfig = null;
  if (cabeceraGlobalRaw) {
    try {
      encabezadoConfig = typeof cabeceraGlobalRaw === 'string' ? JSON.parse(cabeceraGlobalRaw) : cabeceraGlobalRaw;
    } catch (e) {}
  }

  let pieConfig = null;
  if (footerGlobalRaw) {
    try {
      pieConfig = typeof footerGlobalRaw === 'string' ? JSON.parse(footerGlobalRaw) : footerGlobalRaw;
    } catch (e) {}
  }

  const fechaIso = new Date().toISOString().split('T')[0];
  const codigoReporte = `REP-${fechaIso.replace(/-/g, '')}`;
  const validationUrl = `${appUrl}/#validar?codigo=CCLL-${codigoReporte}`;
  const qrDataUrl = await generarQrDataUrl(validationUrl, { width: 140 });

  // ==========================================
  // PÁGINA 1: CABECERA ÚNICA, BALANCE, TRÁMITES Y DEMOGRAFÍA POR VEREDA
  // ==========================================
  let y = await renderCabeceraOficialPdf({
    doc,
    encabezadoConfig,
    config,
    pageWidth,
    marginX,
    mmPerPx,
    situr,
    rif,
    urbanizacion,
    parroquia,
    municipio,
    estado,
    defaultY: 12,
  });

  y += 5;

  // Número de control / NRO oficial
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`NRO: CCLL-${codigoReporte}`, marginX, y);
  y += 5;

  // Título Principal del Reporte
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(15, 23, 42);
  doc.text('INFORME CONSOLIDADO DE GESTIÓN Y AUDITORÍA COMUNAL', pageWidth / 2, y, { align: 'center' });
  y += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const rangoTexto = (rango.fechaInicio && rango.fechaFin) 
    ? `Periodo Auditado: Del ${rango.fechaInicio} al ${rango.fechaFin}` 
    : `Periodo: Registro Histórico Consolidado y Empadronamiento Continuo`;
  doc.text(`${rangoTexto}  |  Fecha de Generación: ${new Date().toLocaleDateString('es-VE')}`, pageWidth / 2, y, { align: 'center' });
  y += 6;

  // Balance General Cuantitativo (Tarjetas de Indicadores Clave)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, y, pageWidth - (marginX * 2), 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('BALANCE GENERAL DE EMPADRONAMIENTO, VIVIENDA Y TRAMITACIÓN', marginX + 4, y + 4.5);

  const colW = (pageWidth - (marginX * 2)) / 4;
  const metrics = [
    { label: 'Total Habitantes (Censo)', val: resumen.total_habitantes_censo ?? resumen.vecinos_total ?? 0 },
    { label: 'Familias Empadronadas', val: resumen.total_planillas_censo ?? 0 },
    { label: 'Casas en Territorio', val: `${resumen.total_casas_territorio || 0} (${resumen.total_casas_subdivididas || 0} div.)` },
    { label: 'Documentos Emitidos', val: resumen.documentos_total ?? 0 },
  ];

  metrics.forEach((m, idx) => {
    const xPos = marginX + 4 + (idx * colW);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(37, 99, 235);
    doc.text(String(m.val), xPos, y + 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, xPos, y + 18.5);
  });

  y += 28;

  // 1. Distribución de Constancias y Certificaciones por Tipo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Distribución de Constancias y Certificaciones Emitidas', marginX, y);
  y += 4;

  doc.setFillColor(241, 245, 249);
  doc.rect(marginX, y, pageWidth - (marginX * 2), 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text('CÓDIGO / IDENTIFICADOR', marginX + 3, y + 3.8);
  doc.text('TIPO DE DOCUMENTO', marginX + 45, y + 3.8);
  doc.text('CANTIDAD EMITIDA', pageWidth - marginX - 25, y + 3.8, { align: 'right' });
  y += 5.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);

  if (!tiposDocs || tiposDocs.length === 0) {
    doc.text('No hay trámites registrados en el periodo.', marginX + 3, y + 4);
    y += 5.5;
  } else {
    tiposDocs.forEach((t) => {
      let nomTipo = t.tipo_documento;
      if (t.tipo_documento === 'RESIDENCIA') nomTipo = 'Carta de Residencia Comunal';
      else if (t.tipo_documento === 'BUENA_CONDUCTA') nomTipo = 'Constancia de Buena Conducta';
      else if (t.tipo_documento === 'FALLECIMIENTO') nomTipo = 'Notificación de Fallecimiento';
      else if (t.tipo_documento === 'FUNCIONAMIENTO') nomTipo = 'Carta Comunal de Funcionamiento Comercial';

      doc.setDrawColor(241, 245, 249);
      doc.line(marginX, y + 4.8, pageWidth - marginX, y + 4.8);

      doc.text(String(t.tipo_documento), marginX + 3, y + 3.8);
      doc.text(nomTipo, marginX + 45, y + 3.8);
      doc.setFont('helvetica', 'bold');
      doc.text(String(t.total), pageWidth - marginX - 25, y + 3.8, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      y += 5;
    });
  }

  y += 5;

  // 2. Cobertura Demográfica Territorial (Veredas A a la O)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Cobertura Demográfica Territorial por Veredas (A a la O)', marginX, y);
  y += 4;

  const veredasGridCols = 3;
  const colGridW = (pageWidth - (marginX * 2)) / veredasGridCols;
  const totalRowsVeredas = Math.ceil(veredasData.length / veredasGridCols);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  const gridBoxH = Math.max(16, totalRowsVeredas * 5.2 + 8);
  doc.roundedRect(marginX, y, pageWidth - (marginX * 2), gridBoxH, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);

  veredasData.forEach((vItem, i) => {
    const colIdx = Math.floor(i / totalRowsVeredas);
    const rowIdx = i % totalRowsVeredas;
    const xPos = marginX + 4 + (colIdx * colGridW);
    const yPos = y + 4.5 + (rowIdx * 5.2);

    doc.text(`${vItem.vereda}:`, xPos, yPos);
    doc.setFont('helvetica', 'bold');
    const cantHabs = vItem.habitantes ?? (vItem.habitantes_censo || vItem.vecinos || 0);
    const casaTxt = vItem.casas !== undefined ? ` (${vItem.casas} c.)` : '';
    doc.text(`${cantHabs} hab.${casaTxt}`, xPos + 22, yPos);
    doc.setFont('helvetica', 'normal');
  });

  // Nota de pie de recuadro de veredas
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  doc.text(`* Cobertura Habitacional: ${resumen.casas_censadas || 0} viviendas censadas con habitantes confirmados en el Censo Comunal.`, marginX + 4, y + gridBoxH - 2);

  // Pie de nota de continuación en Página 1
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Página 1 de 2  ·  Continúa en la página 2 con Catálogos Oficiales Comunales y Certificación de Firmas', pageWidth / 2, pageHeight - 12, { align: 'center' });

  // ==========================================
  // PÁGINA 2: CATÁLOGOS OFICIALES, FIRMAS ASIGNADAS Y FOOTER ÚNICO
  // ==========================================
  doc.addPage();
  let y2 = 14;

  // Mini-cabecera de continuidad oficial
  const escudoMini = await getBase64ImageFromUrl(
    config.escudo_url || 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/escudo_venezuela.svg',
    100, 100
  );
  if (escudoMini) {
    try { doc.addImage(escudoMini, 'PNG', marginX, y2 - 1, 10, 10); } catch (e) {}
  }
  const logoMini = await getBase64ImageFromUrl(
    config.logo_url || 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/logo.png',
    100, 100
  );
  if (logoMini) {
    try { doc.addImage(logoMini, 'PNG', pageWidth - marginX - 10, y2 - 1, 10, 10); } catch (e) {}
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('REPÚBLICA BOLIVARIANA DE VENEZUELA · CONSEJO COMUNAL "LAS LLAVES"', pageWidth / 2, y2 + 2, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`SITUR: ${situr} · RIF: ${rif} · INFORME CONSOLIDADO DE GESTIÓN Y AUDITORÍA COMUNAL (PÁG. 2)`, pageWidth / 2, y2 + 5.5, { align: 'center' });

  y2 += 9;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(marginX, y2, pageWidth - marginX, y2);
  y2 += 6;

  // 3. Indicadores de Catálogos Oficiales Comunales
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Indicadores de Catálogos Oficiales Comunales (#configuracion)', marginX, y2);
  y2 += 4;

  const catCols = 3;
  const catColW = (pageWidth - (marginX * 2)) / catCols;
  const catSections = [
    { titulo: 'Parentesco Familiar', data: parentescoData },
    { titulo: 'Nivel de Instrucción', data: instruccionData },
    { titulo: 'Condición de Salud', data: saludData },
  ];

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, y2, pageWidth - (marginX * 2), 34, 1.5, 1.5, 'FD');

  catSections.forEach((sec, colIdx) => {
    const xSec = marginX + 3 + (colIdx * catColW);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(sec.titulo, xSec, y2 + 4.5);

    let rowY = y2 + 8.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    (sec.data || []).slice(0, 6).forEach((it) => {
      doc.text(`${(it.codigo || '').toUpperCase()}. ${(it.descripcion || '')}:`, xSec, rowY);
      doc.setFont('helvetica', 'bold');
      doc.text(String(it.cantidad || 0), xSec + catColW - 8, rowY, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      rowY += 4;
    });
  });

  y2 += 42;

  // 4. Conformidad, Certificación y Contraloría Social Comunal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('4. Conformidad, Certificación y Contraloría Social Comunal', marginX, y2);
  y2 += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('Por medio del presente informe, se certifica la exactitud y fidelidad de los datos demográficos y trámites comunitarios consignados.', marginX, y2);
  y2 += 18;

  // Resolver firmante asignado por el usuario
  const firmanteEfectivo = firmanteSeleccionado || (firmas && firmas.length > 0 ? firmas[0] : null) || {
    nombre: usuarioGenerador || 'ADMINISTRADOR DEL SISTEMA',
    comision: 'ADMINISTRADOR DEL SISTEMA Y GESTIÓN COMUNAL',
    cedula: 'V-00.000.000',
    telefono: '',
    url_firma: null,
    usar_sello_principal: 1,
  };

  const xCenter = pageWidth / 2;

  // Cargar imagen de firma digital si existe
  if (firmanteEfectivo.url_firma) {
    const b64Firma = await getBase64ImageFromUrl(firmanteEfectivo.url_firma, 300, 150);
    if (b64Firma) {
      try {
        doc.addImage(b64Firma, 'PNG', xCenter - 25, y2 - 16, 50, 16);
      } catch (e) {
        console.warn('Error agregando imagen de firma:', e);
      }
    }
  }

  // Cargar sello húmedo oficial si está habilitado
  const selloUrl = firmanteEfectivo.url_sello || (firmanteEfectivo.usar_sello_principal !== 0 ? (config.sello_principal_url || 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/sello.png') : null);
  if (selloUrl) {
    const b64Sello = await getBase64ImageFromUrl(selloUrl, 200, 200);
    if (b64Sello) {
      try {
        doc.addImage(b64Sello, 'PNG', xCenter + 18, y2 - 14, 24, 24);
      } catch (e) {}
    }
  }

  // Línea de firma centrada
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.4);
  doc.line(xCenter - 45, y2, xCenter + 45, y2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(firmanteEfectivo.nombre || 'Administrador del Sistema', xCenter, y2 + 4, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(51, 65, 85);
  doc.text(firmanteEfectivo.comision || 'Administrador del Sistema y Gestión Comunal', xCenter, y2 + 7.5, { align: 'center' });

  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text(`C.I.: ${firmanteEfectivo.cedula || 'V-ADMIN'}${firmanteEfectivo.telefono ? `  ·  Tlf: ${firmanteEfectivo.telefono}` : ''}`, xCenter, y2 + 11, { align: 'center' });

  // 5. Renderizar Footer Único de Documentos en la Página 2 (Exactamente idéntico al resto de documentos)
  await renderFooterOficialPdf({
    doc,
    pieConfig,
    config,
    qrDataUrl,
    validationUrl,
    codigoQr: codigoReporte,
    fechaEmision: new Date().toLocaleDateString('es-VE'),
    fechaVencimiento: new Date(Date.now() + 90 * 86400000).toLocaleDateString('es-VE'),
    vigenciaDias: 90,
    tituloCertificacion: 'CERTIFICACIÓN Y AUDITORÍA DIGITAL DE REPORTE ESTADÍSTICO',
    pageWidth,
    pageHeight,
    marginX,
    mmPerPx,
  });

  const filename = `reporte_gestion_comunal_${fechaIso}.pdf`;
  doc.save(filename);
  return filename;
}

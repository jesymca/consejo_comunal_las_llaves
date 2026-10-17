import { NextResponse } from 'next/server';
import { uploadToR2, getR2Client } from '@/lib/r2';
import { extractUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/upload?url=https://pub-...r2.dev/web/img/logo.png
 * Obtiene una imagen remota desde el servidor (evitando bloqueos CORS del navegador al generar PDFs)
 * y la devuelve en formato base64 Data URL lista para jsPDF.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl || (!targetUrl.startsWith('https://') && !targetUrl.startsWith('http://'))) {
      return NextResponse.json({ error: 'URL de imagen externa inválida' }, { status: 400 });
    }

    const response = await fetch(targetUrl, {
      headers: {
        Accept: 'image/*,*/*;q=0.8',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `No se pudo descargar la imagen remota (HTTP ${response.status})` },
        { status: response.status }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let contentType = response.headers.get('content-type') || '';
    const lowerUrl = targetUrl.toLowerCase();
    if (!contentType || contentType === 'application/octet-stream') {
      if (lowerUrl.endsWith('.svg')) contentType = 'image/svg+xml';
      else if (lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg')) contentType = 'image/jpeg';
      else if (lowerUrl.endsWith('.webp')) contentType = 'image/webp';
      else contentType = 'image/png';
    }

    const dataUrl = `data:${contentType};base64,${buffer.toString('base64')}`;
    return NextResponse.json({
      success: true,
      url: targetUrl,
      contentType,
      dataUrl,
    });
  } catch (err) {
    console.error('Error en GET /api/upload (image proxy):', err);
    return NextResponse.json(
      { error: err.message || 'Error al obtener imagen remota desde R2' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    // 1. Validar autenticación básica
    const user = extractUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado para subir archivos' }, { status: 401 });
    }

    // 2. Extraer archivo y metadatos
    const formData = await request.formData();
    const file = formData.get('file');
    const folder = (formData.get('folder') || 'firmas_sellos').toString().replace(/[^a-zA-Z0-9_-]/g, '');
    const customName = formData.get('filename') ? formData.get('filename').toString() : null;

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Archivo no proporcionado o inválido' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const contentType = file.type || 'image/png';

    // Generar nombre de archivo único y limpio
    const extension = (file.name && file.name.includes('.'))
      ? file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '')
      : 'png';

    const timestamp = Date.now();
    const safeBaseName = customName
      ? customName.toLowerCase().replace(/[^a-z0-9_-]/g, '_')
      : file.name
      ? file.name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9_-]/g, '_')
      : 'archivo';

    const finalKey = `web/img/${folder}/${safeBaseName}_${timestamp}.${extension}`;

    // 3. Verificar si R2 está configurado con credenciales
    const r2Client = getR2Client();
    if (!r2Client) {
      // Las credenciales de R2 aún no están en .env.local
      // Devolver advertencia detallada para que el usuario conozca qué variables configurar
      const dataUrl = `data:${contentType};base64,${buffer.toString('base64')}`;
      return NextResponse.json({
        success: true,
        r2_configured: false,
        url: dataUrl,
        key: finalKey,
        warning: 'El bucket de Cloudflare R2 requiere R2_ACCESS_KEY_ID y R2_SECRET_ACCESS_KEY en su archivo .env.local. La imagen se ha cargado en formato seguro Base64 temporalmente.',
      });
    }

    // 4. Subir a Cloudflare R2
    const publicUrl = await uploadToR2({
      buffer,
      key: finalKey,
      contentType,
    });

    return NextResponse.json({
      success: true,
      r2_configured: true,
      url: publicUrl,
      key: finalKey,
      message: 'Archivo subido exitosamente a Cloudflare R2',
    });
  } catch (err) {
    console.error('Error en /api/upload:', err);
    return NextResponse.json(
      { error: err.message || 'Error procesando la subida del archivo a Cloudflare R2' },
      { status: 500 }
    );
  }
}

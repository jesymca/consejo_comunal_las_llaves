import { NextResponse } from 'next/server';
import db from '@/lib/turso';
import { extractUserFromRequest, hasPermission } from '@/lib/auth';
import { registrarAuditoria } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const R2_IMG_BASE = 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img';

function normalizarSvgJsonR2(rawStr) {
  if (!rawStr || typeof rawStr !== 'string') return rawStr || '';
  return rawStr
    .replace(/"\/img\/logo\.png"/g, `"${R2_IMG_BASE}/logo.png"`)
    .replace(/"\/img\/mppcomunas\.png"/g, `"${R2_IMG_BASE}/mppcomunas.png"`)
    .replace(/"\/img\/sello\.png"/g, `"${R2_IMG_BASE}/sello.png"`)
    .replace(/"\/img\/tei\.png"/g, `"${R2_IMG_BASE}/tei.png"`)
    .replace(/"\/img\/escudo_venezuela\.(png|svg)"/g, `"${R2_IMG_BASE}/escudo_venezuela.svg"`);
}

async function obtenerCabeceraYFooterUnicos() {
  let cabeceraGlobal = '';
  let footerGlobal = '';

  try {
    const cfgRes = await db.execute({
      sql: "SELECT clave, valor FROM configuracion_sistema WHERE clave IN ('encabezado_svg_global', 'pie_svg_global')",
      args: [],
    });
    for (const row of cfgRes.rows) {
      if (row.clave === 'encabezado_svg_global' && row.valor) cabeceraGlobal = normalizarSvgJsonR2(row.valor);
      if (row.clave === 'pie_svg_global' && row.valor) footerGlobal = normalizarSvgJsonR2(row.valor);
    }

    if (!cabeceraGlobal || !footerGlobal) {
      const tplRes = await db.execute('SELECT encabezado_svg, pie_svg FROM documentos_plantillas ORDER BY updated_at DESC');
      for (const row of tplRes.rows) {
        if (!cabeceraGlobal && row.encabezado_svg && String(row.encabezado_svg).trim().length > 2) {
          cabeceraGlobal = normalizarSvgJsonR2(row.encabezado_svg);
        }
        if (!footerGlobal && row.pie_svg && String(row.pie_svg).trim().length > 2) {
          footerGlobal = normalizarSvgJsonR2(row.pie_svg);
        }
      }
    }
  } catch (e) {
    console.warn('Error consultando cabecera/footer únicos:', e);
  }

  return { cabeceraGlobal, footerGlobal };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const { cabeceraGlobal, footerGlobal } = await obtenerCabeceraYFooterUnicos();

    if (id) {
      const res = await db.execute({
        sql: 'SELECT * FROM documentos_plantillas WHERE id = ? LIMIT 1',
        args: [id.toUpperCase()]
      });
      if (res.rows.length === 0) return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });
      const plantilla = {
        ...res.rows[0],
        encabezado_svg: cabeceraGlobal || normalizarSvgJsonR2(res.rows[0].encabezado_svg) || '',
        pie_svg: footerGlobal || normalizarSvgJsonR2(res.rows[0].pie_svg) || '',
      };
      return NextResponse.json({
        plantilla,
        cabecera_global: plantilla.encabezado_svg,
        footer_global: plantilla.pie_svg,
      });
    }

    const res = await db.execute('SELECT * FROM documentos_plantillas ORDER BY id ASC');
    const plantillasUnificadas = res.rows.map((p) => ({
      ...p,
      encabezado_svg: cabeceraGlobal || normalizarSvgJsonR2(p.encabezado_svg) || '',
      pie_svg: footerGlobal || normalizarSvgJsonR2(p.pie_svg) || '',
    }));

    return NextResponse.json({
      plantillas: plantillasUnificadas,
      cabecera_global: cabeceraGlobal,
      footer_global: footerGlobal,
    });
  } catch (err) {
    console.error('Error en /api/modelador GET:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const currentUser = extractUserFromRequest(request);
    if (!currentUser || (!hasPermission(currentUser, 'modelador') && !hasPermission(currentUser, 'modelador_edit'))) {
      return NextResponse.json({ error: 'No autorizado para editar modelos de documentos ni plantillas' }, { status: 403 });
    }

    const body = await request.json();
    const { action, id, titulo, subtitulo, cuerpo_template, encabezado_svg, pie_svg } = body;
    const now = new Date().toISOString();

    // 1. Si se envía actualización de la Cabecera Única de Documentos, aplicarla globalmente a TODOS los documentos
    if (encabezado_svg !== undefined) {
      const cabLimpiada = normalizarSvgJsonR2(encabezado_svg);
      await db.execute({
        sql: `INSERT OR REPLACE INTO configuracion_sistema (clave, valor, descripcion, updated_at)
              VALUES ('encabezado_svg_global', ?, 'Cabecera única de documentos comunales (SVG JSON)', ?)`,
        args: [cabLimpiada, now]
      });
      await db.execute({
        sql: `UPDATE documentos_plantillas SET encabezado_svg = ?, updated_at = ?`,
        args: [cabLimpiada, now]
      });
    }

    // 2. Si se envía actualización del Footer Único de Documentos, aplicarlo globalmente a TODOS los documentos
    if (pie_svg !== undefined) {
      const pieLimpiado = normalizarSvgJsonR2(pie_svg);
      await db.execute({
        sql: `INSERT OR REPLACE INTO configuracion_sistema (clave, valor, descripcion, updated_at)
              VALUES ('pie_svg_global', ?, 'Footer único de documentos comunales (SVG JSON)', ?)`,
        args: [pieLimpiado, now]
      });
      await db.execute({
        sql: `UPDATE documentos_plantillas SET pie_svg = ?, updated_at = ?`,
        args: [pieLimpiado, now]
      });
    }

    // Si la acción es exclusivamente guardar la cabecera o el footer global
    if (action === 'guardar_cabecera_global' || action === 'guardar_footer_global') {
      await registrarAuditoria({
        tipo_evento: 'EDICION_MODELADOR_PLANTILLA',
        usuario_id: currentUser.id,
        usuario_nombre: currentUser.nombre,
        request,
        detalles: {
          accion: action === 'guardar_cabecera_global' ? 'Actualización de Cabecera Única Documental (SVG)' : 'Actualización de Footer Único Documental (SVG)',
        }
      });
      return NextResponse.json({
        success: true,
        message: action === 'guardar_cabecera_global'
          ? 'Cabecera única de documentos actualizada para todas las plantillas'
          : 'Footer único de documentos actualizado para todas las plantillas'
      });
    }

    if (!id || !titulo || !cuerpo_template) {
      return NextResponse.json({ error: 'ID, Título y Cuerpo del template son requeridos' }, { status: 400 });
    }

    await db.execute({
      sql: `UPDATE documentos_plantillas SET
        titulo = ?,
        subtitulo = ?,
        cuerpo_template = ?,
        updated_at = ?
        WHERE id = ?`,
      args: [
        titulo,
        subtitulo || '',
        cuerpo_template,
        now,
        id.toUpperCase(),
      ]
    });

    await registrarAuditoria({
      tipo_evento: 'EDICION_MODELADOR_PLANTILLA',
      usuario_id: currentUser.id,
      usuario_nombre: currentUser.nombre,
      tipo_documento: id.toUpperCase(),
      request,
      detalles: {
        accion: `Actualización de plantilla documental (${id.toUpperCase()})`,
        titulo,
        incluyo_cabecera_svg: encabezado_svg !== undefined,
        incluyo_footer_svg: pie_svg !== undefined,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Plantilla y diseño global de documentos actualizados exitosamente'
    });
  } catch (err) {
    console.error('Error en /api/modelador PUT:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const currentUser = extractUserFromRequest(request);
    if (!currentUser || (!hasPermission(currentUser, 'modelador') && !hasPermission(currentUser, 'modelador_edit'))) {
      return NextResponse.json({ error: 'No autorizado para crear modelos de documentos ni plantillas' }, { status: 403 });
    }

    const body = await request.json();
    let { id, titulo, subtitulo, cuerpo_template } = body;

    if (!id || !titulo) {
      return NextResponse.json({ error: 'Identificador único (ID) y Título son requeridos' }, { status: 400 });
    }

    // Normalizar ID en mayúsculas sin espacios
    const cleanId = String(id).trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');

    const existRes = await db.execute({
      sql: 'SELECT id FROM documentos_plantillas WHERE id = ? LIMIT 1',
      args: [cleanId]
    });

    if (existRes.rows.length > 0) {
      return NextResponse.json({ error: `Ya existe una plantilla con el identificador ${cleanId}` }, { status: 400 });
    }

    const { cabeceraGlobal, footerGlobal } = await obtenerCabeceraYFooterUnicos();

    const defaultCuerpo = cuerpo_template || 'Quienes suscriben, voceras y voceros integrantes del Colectivo de Gobierno Comunal, la Unidad Ejecutiva y la Comisión Electoral del Consejo Comunal de la Urbanización Dr. Alfredo Travieso Paúl "LAS LLAVES", en ejercicio de las atribuciones conferidas en los artículos 18, 23, 25 y 34 numeral 19 de la Ley Orgánica de los Consejos Comunales (Reforma 2023), por medio de la presente hacemos constar que la ciudadana o ciudadano: {nombre_completo}, titular de la cédula de identidad N°: {cedula}, es habitante de nuestra comunidad en la Vereda {vereda}, Casa N° {casa}, según consta en el Censo Demográfico Comunal.\n\nConstancia que se expide a solicitud de la parte interesada, en la ciudad de Puerto Cabello, a los {dias} días del mes de {mes} del año {ano}.';

    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO documentos_plantillas (id, titulo, subtitulo, cuerpo_template, encabezado_svg, pie_svg, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        cleanId,
        String(titulo).trim(),
        subtitulo ? String(subtitulo).trim() : 'NRO: {codigo_qr}',
        defaultCuerpo,
        cabeceraGlobal || '',
        footerGlobal || '',
        now,
      ]
    });

    await registrarAuditoria({
      tipo_evento: 'EDICION_MODELADOR_PLANTILLA',
      usuario_id: currentUser.id,
      usuario_nombre: currentUser.nombre,
      tipo_documento: cleanId,
      request,
      detalles: { accion: 'Creación de nueva plantilla documental', id: cleanId, titulo: String(titulo).trim() }
    });

    return NextResponse.json({
      success: true,
      message: 'Nueva plantilla documental creada exitosamente (vinculada a la Cabecera y Footer únicos)',
      plantilla: {
        id: cleanId,
        titulo: String(titulo).trim(),
        subtitulo: subtitulo || 'NRO: {codigo_qr}',
        cuerpo_template: defaultCuerpo,
        encabezado_svg: cabeceraGlobal || '',
        pie_svg: footerGlobal || '',
      }
    });
  } catch (err) {
    console.error('Error en /api/modelador POST:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const currentUser = extractUserFromRequest(request);
    if (!currentUser || currentUser.rol !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Solo el SUPER_ADMIN puede eliminar plantillas documentales' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de la plantilla requerido' }, { status: 400 });
    }

    const cleanId = id.toUpperCase();

    // Proteger plantillas fundamentales del sistema
    const protegidas = ['RESIDENCIA', 'BUENA_CONDUCTA', 'FALLECIMIENTO', 'FUNCIONAMIENTO'];
    if (protegidas.includes(cleanId)) {
      return NextResponse.json({ error: `La plantilla oficial ${cleanId} es un documento base del sistema y no puede ser eliminada` }, { status: 400 });
    }

    await db.execute({
      sql: 'DELETE FROM documentos_plantillas WHERE id = ?',
      args: [cleanId]
    });

    await registrarAuditoria({
      tipo_evento: 'EDICION_MODELADOR_PLANTILLA',
      usuario_id: currentUser.id,
      usuario_nombre: currentUser.nombre,
      tipo_documento: cleanId,
      request,
      detalles: { accion: 'Eliminación de plantilla documental', id: cleanId }
    });

    return NextResponse.json({ success: true, message: 'Plantilla eliminada correctamente' });
  } catch (err) {
    console.error('Error en /api/modelador DELETE:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

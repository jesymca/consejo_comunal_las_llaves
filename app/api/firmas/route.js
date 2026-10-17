import { NextResponse } from 'next/server';
import db from '@/lib/turso';
import { extractUserFromRequest, hasPermission } from '@/lib/auth';
import { registrarAuditoria } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await db.execute('SELECT * FROM firmas_sellos ORDER BY orden ASC, id ASC');
    const configRes = await db.execute("SELECT clave, valor FROM configuracion_sistema WHERE clave IN ('sello_principal_url', 'sello_tamano_mm', 'sello_forma', 'sello_ancho_mm', 'sello_alto_mm')");
    
    let selloPrincipalUrl = 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/sello.png';
    let selloTamanoMm = '34';
    let selloForma = 'rectangular'; // Modelo oficial real del Consejo Comunal
    let selloAnchoMm = '48';
    let selloAltoMm = '26';

    configRes.rows.forEach(r => {
      if (r.clave === 'sello_principal_url') selloPrincipalUrl = r.valor;
      if (r.clave === 'sello_tamano_mm') selloTamanoMm = r.valor;
      if (r.clave === 'sello_forma') selloForma = r.valor;
      if (r.clave === 'sello_ancho_mm') selloAnchoMm = r.valor;
      if (r.clave === 'sello_alto_mm') selloAltoMm = r.valor;
    });

    return NextResponse.json({
      firmas: res.rows,
      sello_principal_url: selloPrincipalUrl,
      sello_tamano_mm: selloTamanoMm,
      sello_forma: selloForma,
      sello_ancho_mm: selloAnchoMm,
      sello_alto_mm: selloAltoMm,
    });
  } catch (err) {
    console.error('Error en /api/firmas GET:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const currentUser = extractUserFromRequest(request);
    if (!currentUser || (!hasPermission(currentUser, 'firmas') && !hasPermission(currentUser, 'firmas_edit'))) {
      return NextResponse.json({ error: 'No autorizado para gestionar firmas y sellos' }, { status: 403 });
    }

    const body = await request.json();
    const { comision, nombre, cedula, telefono, url_firma, url_sello, usar_sello_principal, activo, orden } = body;

    if (!nombre || !comision) {
      return NextResponse.json({ error: 'Nombre y Comisión son obligatorios' }, { status: 400 });
    }

    // Calcular orden si no viene
    let orderNum = parseInt(orden, 10);
    if (isNaN(orderNum)) {
      const maxRes = await db.execute('SELECT MAX(orden) as max_ord FROM firmas_sellos');
      orderNum = (maxRes.rows[0]?.max_ord || 0) + 1;
    }

    const now = new Date().toISOString();

    const insertRes = await db.execute({
      sql: `INSERT INTO firmas_sellos (orden, comision, nombre, cedula, telefono, url_firma, url_sello, usar_sello_principal, activo, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        orderNum,
        comision.trim(),
        nombre.trim(),
        (cedula || '').trim(),
        (telefono || '').trim(),
        url_firma || null,
        url_sello || null,
        usar_sello_principal ? 1 : 0,
        activo !== undefined ? (activo ? 1 : 0) : 1,
        now,
      ]
    });

    await registrarAuditoria({
      tipo_evento: 'GESTION_FIRMAS_SELLOS',
      usuario_id: currentUser.id,
      usuario_nombre: currentUser.nombre,
      cedula: (cedula || '').trim() || null,
      request,
      detalles: { accion: 'Nueva firma autorizada agregada', vocero: nombre.trim(), comision: comision.trim() }
    });

    return NextResponse.json({
      success: true,
      id: Number(insertRes.lastInsertRowid),
      message: 'Firma autorizada agregada exitosamente'
    });
  } catch (err) {
    console.error('Error en /api/firmas POST:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const currentUser = extractUserFromRequest(request);
    if (!currentUser || (!hasPermission(currentUser, 'firmas') && !hasPermission(currentUser, 'firmas_edit'))) {
      return NextResponse.json({ error: 'No autorizado para modificar firmas' }, { status: 403 });
    }

    const body = await request.json();
    const { id, orden, comision, nombre, cedula, telefono, url_firma, url_sello, usar_sello_principal, activo } = body;

    if (!id || !nombre || !comision) {
      return NextResponse.json({ error: 'ID, Nombre y Comisión son obligatorios' }, { status: 400 });
    }

    const now = new Date().toISOString();

    await db.execute({
      sql: `UPDATE firmas_sellos SET
        orden = ?,
        comision = ?,
        nombre = ?,
        cedula = ?,
        telefono = ?,
        url_firma = ?,
        url_sello = ?,
        usar_sello_principal = ?,
        activo = ?,
        updated_at = ?
        WHERE id = ?`,
      args: [
        orden !== undefined ? parseInt(orden, 10) : 1,
        comision.trim(),
        nombre.trim(),
        (cedula || '').trim(),
        (telefono || '').trim(),
        url_firma !== undefined ? url_firma : null,
        url_sello !== undefined ? url_sello : null,
        usar_sello_principal ? 1 : 0,
        activo !== undefined ? (activo ? 1 : 0) : 1,
        now,
        id,
      ]
    });

    await registrarAuditoria({
      tipo_evento: 'GESTION_FIRMAS_SELLOS',
      usuario_id: currentUser.id,
      usuario_nombre: currentUser.nombre,
      cedula: (cedula || '').trim() || null,
      request,
      detalles: { accion: 'Firma autorizada modificada', id, vocero: nombre.trim(), comision: comision.trim(), activo: Boolean(activo) }
    });

    return NextResponse.json({ success: true, message: 'Firma autorizada actualizada correctamente' });
  } catch (err) {
    console.error('Error en /api/firmas PUT:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const currentUser = extractUserFromRequest(request);
    if (!currentUser || (!hasPermission(currentUser, 'firmas') && !hasPermission(currentUser, 'firmas_edit'))) {
      return NextResponse.json({ error: 'No autorizado para eliminar firmas' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido para eliminar' }, { status: 400 });
    }

    await db.execute({
      sql: 'DELETE FROM firmas_sellos WHERE id = ?',
      args: [id]
    });

    await registrarAuditoria({
      tipo_evento: 'GESTION_FIRMAS_SELLOS',
      usuario_id: currentUser.id,
      usuario_nombre: currentUser.nombre,
      request,
      detalles: { accion: 'Firma autorizada eliminada', id }
    });

    return NextResponse.json({ success: true, message: 'Firma eliminada exitosamente' });
  } catch (err) {
    console.error('Error en /api/firmas DELETE:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import db from '@/lib/turso';
import { extractUserFromRequest } from '@/lib/auth';

export async function GET() {
  try {
    const res = await db.execute('SELECT * FROM configuracion_sistema');
    const config = {};
    res.rows.forEach(r => {
      config[r.clave] = r.valor;
    });

    const bancosRes = await db.execute('SELECT * FROM bancos ORDER BY id ASC');

    return NextResponse.json({
      config,
      bancos: bancosRes.rows,
    });
  } catch (err) {
    console.error('Error en /api/configuracion GET:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const currentUser = extractUserFromRequest(request);
    if (!currentUser || (currentUser.rol !== 'SUPER_ADMIN' && currentUser.rol !== 'ADMIN')) {
      return NextResponse.json({ error: 'Solo el SUPER_ADMIN o ADMIN puede actualizar la configuración general' }, { status: 403 });
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Configuraciones requeridas' }, { status: 400 });
    }

    const now = new Date().toISOString();

    for (const [clave, valor] of Object.entries(settings)) {
      await db.execute({
        sql: `INSERT INTO configuracion_sistema (clave, valor, updated_at) VALUES (?, ?, ?)
          ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor, updated_at = excluded.updated_at;`,
        args: [clave, String(valor), now]
      });
    }

    return NextResponse.json({ success: true, message: 'Configuración guardada correctamente' });
  } catch (err) {
    console.error('Error en /api/configuracion PUT:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const currentUser = extractUserFromRequest(request);
    if (!currentUser || currentUser.rol !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acceso restringido únicamente al SUPER_ADMIN del sistema' }, { status: 403 });
    }

    const body = await request.json();
    const { action, confirmacion, limpiarVecinos = true, limpiarCenso = true, limpiarDocumentos = true, limpiarAuditoria = true } = body;

    if (action !== 'reset_produccion') {
      return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 });
    }

    if (confirmacion !== 'PRODUCCION') {
      return NextResponse.json({ error: 'Debe escribir exactamente PRODUCCION en el campo de confirmación' }, { status: 400 });
    }

    const resultados = [];

    // 1. Limpieza de Censo Sociodemográfico y correlativo de planillas
    if (limpiarCenso) {
      await db.execute('DELETE FROM censo_habitantes');
      await db.execute('DELETE FROM censo_planillas');
      try {
        await db.execute('DELETE FROM censo_secuencias');
      } catch (e) {
        // En caso de que no exista aún la tabla
      }
      resultados.push('Censo familiar y correlativo de planillas reiniciados a cero (PLC-0001)');
    }

    // 2. Limpieza de Documentos y Solicitudes
    if (limpiarDocumentos) {
      await db.execute('DELETE FROM documentos_solicitudes');
      resultados.push('Solicitudes y constancias emitidas eliminadas');
    }

    // 3. Limpieza de Vecinos (Padrón electoral/comunitario)
    if (limpiarVecinos) {
      await db.execute('DELETE FROM vecinos');
      resultados.push('Padrón de vecinos purgado');
    }

    // 4. Limpieza de Bitácora de Auditoría
    if (limpiarAuditoria) {
      await db.execute('DELETE FROM bitacora_auditoria');
      resultados.push('Bitácora de auditoría reiniciada');
    }

    // Registrar evento de inicialización limpia de producción
    const now = new Date().toISOString();
    try {
      await db.execute({
        sql: `INSERT INTO bitacora_auditoria (tipo_evento, usuario_id, usuario_nombre, hora, fecha, detalles, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          'SISTEMA_REINICIADO_A_PRODUCCION',
          currentUser.id,
          currentUser.nombre || currentUser.username,
          new Date().getHours(),
          now.split('T')[0],
          `Reinicio total ejecutado por SUPER_ADMIN: ${resultados.join(', ')}`,
          now
        ]
      });
    } catch (e) {
      console.warn('No se pudo registrar bitacora de reinicio:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Sistema purgado y preparado con éxito para el pase a producción.',
      detalles: resultados
    });
  } catch (err) {
    console.error('Error en /api/configuracion POST (reset_produccion):', err);
    return NextResponse.json({ error: err.message || 'Error del servidor al limpiar datos' }, { status: 500 });
  }
}


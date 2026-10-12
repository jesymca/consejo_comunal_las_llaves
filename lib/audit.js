import db from './turso';

/**
 * Registra un evento en la bitácora de auditoría
 */
export async function registrarAuditoria({
  tipo_evento, // 'ACCESO_DASHBOARD', 'DESCARGA_DOCUMENTO', 'APROBACION_VECINO', 'SOLICITUD_DOCUMENTO', etc.
  usuario_id = null,
  usuario_nombre = null,
  vecino_id = null,
  cedula = null,
  codigo_documento = null,
  tipo_documento = null,
  ip = null,
  user_agent = null,
  detalles = null,
}) {
  try {
    const now = new Date();
    // Hora en formato 0 a 23 como entero para indexación estadística rápida
    const hora = now.getHours();
    const fecha = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const createdAt = now.toISOString();

    await db.execute({
      sql: `INSERT INTO bitacora_auditoria (
        tipo_evento, usuario_id, usuario_nombre, vecino_id, cedula,
        codigo_documento, tipo_documento, ip, user_agent, hora, fecha,
        detalles, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        tipo_evento,
        usuario_id,
        usuario_nombre,
        vecino_id,
        cedula,
        codigo_documento,
        tipo_documento,
        ip,
        user_agent,
        hora,
        fecha,
        typeof detalles === 'object' ? JSON.stringify(detalles) : detalles,
        createdAt,
      ]
    });
  } catch (err) {
    console.error('Error registrando evento en auditoría:', err);
  }
}

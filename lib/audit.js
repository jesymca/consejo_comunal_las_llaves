import db from './turso';

let cachedServerPublicIp = null;
let cachedServerPublicIpAt = 0;
const PUBLIC_IP_TTL_MS = 15 * 60 * 1000; // 15 minutos de caché

/**
 * Determina si una cadena IP es local/loopback o privada vacía
 */
export function esIpLocalOPrivada(ip) {
  if (!ip || typeof ip !== 'string') return true;
  const clean = ip.trim().toLowerCase();
  if (
    !clean ||
    clean === 'local' ||
    clean === 'localhost' ||
    clean === '127.0.0.1' ||
    clean === '::1' ||
    clean === '::ffff:127.0.0.1' ||
    clean === '0.0.0.0' ||
    clean === 'unknown'
  ) {
    return true;
  }
  return false;
}

/**
 * Limpia una cabecera de IP (como x-forwarded-for que puede traer múltiples IPs)
 */
function limpiarCandidatoIp(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const parts = raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  for (const part of parts) {
    const sinPrefijo = part.replace(/^::ffff:/i, '');
    if (!esIpLocalOPrivada(sinPrefijo)) {
      return sinPrefijo;
    }
  }
  return parts[0] ? parts[0].replace(/^::ffff:/i, '') : null;
}

/**
 * Obtiene la IP pública real consultando servicios externos rápidos si el servidor está en entorno local/NAT
 */
export async function obtenerIpPublicaExterna() {
  const now = Date.now();
  if (cachedServerPublicIp && now - cachedServerPublicIpAt < PUBLIC_IP_TTL_MS) {
    return cachedServerPublicIp;
  }

  const endpoints = [
    'https://api.ipify.org?format=json',
    'https://api64.ipify.org?format=json',
    'https://ipinfo.io/json',
  ];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1800);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        const ip = data?.ip ? String(data.ip).trim() : null;
        if (ip && !esIpLocalOPrivada(ip)) {
          cachedServerPublicIp = ip;
          cachedServerPublicIpAt = now;
          return ip;
        }
      }
    } catch {
      // Continuar con el siguiente proveedor si falla o expira
    }
  }

  return cachedServerPublicIp || null;
}

/**
 * Extrae y resuelve la IP pública del cliente a partir del objeto Request y/o IP explícita
 */
export async function resolverIpPublica(request = null, explicitIp = null) {
  // 1. Verificar si ya viene una IP pública explícita desde el cliente o llamador
  const limpiaExplicita = limpiarCandidatoIp(explicitIp);
  if (limpiaExplicita && !esIpLocalOPrivada(limpiaExplicita)) {
    return limpiaExplicita;
  }

  // 2. Revisar cabeceras estándar de proxies inversos / CDN / Cliente
  if (request && request.headers && typeof request.headers.get === 'function') {
    const headerKeys = [
      'x-client-public-ip',
      'cf-connecting-ip',
      'x-vercel-forwarded-for',
      'true-client-ip',
      'x-real-ip',
      'x-forwarded-for',
      'fastly-client-ip',
      'x-client-ip',
    ];
    for (const key of headerKeys) {
      const val = request.headers.get(key);
      const candidate = limpiarCandidatoIp(val);
      if (candidate && !esIpLocalOPrivada(candidate)) {
        return candidate;
      }
    }
  }

  // 3. Si estamos en red local / loopback sin cabeceras públicas, resolver IP pública de salida
  const externalIp = await obtenerIpPublicaExterna();
  if (externalIp) {
    return externalIp;
  }

  return limpiaExplicita || 'No disponible';
}

/**
 * Resume el User-Agent en Navegador y Sistema Operativo legibles para Contraloría
 */
export function parsearUserAgent(uaString) {
  if (!uaString || typeof uaString !== 'string') {
    return { navegador: 'Navegador Web', os: 'Sistema', dispositivo: 'Escritorio', resumen: 'Navegador Web' };
  }
  const ua = uaString;
  let navegador = 'Navegador';
  if (/Edg\//i.test(ua)) navegador = 'Microsoft Edge';
  else if (/OPR\/|Opera/i.test(ua)) navegador = 'Opera';
  else if (/Chrome\//i.test(ua)) navegador = 'Google Chrome';
  else if (/Firefox\//i.test(ua)) navegador = 'Mozilla Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) navegador = 'Apple Safari';

  let os = 'Sistema';
  if (/Windows NT 10|Windows NT 11/i.test(ua)) os = 'Windows';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  const esMovil = /Mobile|Android|iPhone|iPad/i.test(ua);
  const dispositivo = esMovil ? 'Móvil / Tablet' : 'Computador';

  return {
    navegador,
    os,
    dispositivo,
    resumen: `${navegador} (${os})`,
  };
}

/**
 * Registra un evento en la bitácora de auditoría garantizando IP pública y trazabilidad completa
 */
export async function registrarAuditoria({
  tipo_evento,
  usuario_id = null,
  usuario_nombre = null,
  vecino_id = null,
  cedula = null,
  codigo_documento = null,
  tipo_documento = null,
  ip = null,
  user_agent = null,
  detalles = null,
  request = null,
}) {
  try {
    const now = new Date();
    // Ajustar hora a huso horario de Venezuela (UTC-4) para estadísticas cuantitativas exactas
    const vzlaDate = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const hora = vzlaDate.getUTCHours();
    const fecha = vzlaDate.toISOString().split('T')[0]; // YYYY-MM-DD en hora Venezuela
    const createdAt = now.toISOString();

    const finalIp = await resolverIpPublica(request, ip);
    const finalUserAgent =
      user_agent ||
      (request && request.headers && typeof request.headers.get === 'function'
        ? request.headers.get('user-agent')
        : null) ||
      'Navegador Web';

    const infoUa = parsearUserAgent(finalUserAgent);
    let detallesObj = {};
    if (detalles && typeof detalles === 'object') {
      detallesObj = { ...detalles };
    } else if (typeof detalles === 'string' && detalles.trim()) {
      try {
        detallesObj = JSON.parse(detalles);
      } catch {
        detallesObj = { descripcion: detalles };
      }
    }

    if (!detallesObj.ip_publica) detallesObj.ip_publica = finalIp;
    if (!detallesObj.dispositivo) detallesObj.dispositivo = infoUa.resumen;

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
        finalIp,
        finalUserAgent,
        hora,
        fecha,
        JSON.stringify(detallesObj),
        createdAt,
      ],
    });
  } catch (err) {
    console.error('Error registrando evento en auditoría:', err);
  }
}

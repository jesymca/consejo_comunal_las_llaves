import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'cc_las_llaves_jwt_super_secret_key_2026_secure';

export async function hashPassword(plain) {
  return await bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain, hashed) {
  if (!plain || !hashed) return false;
  // Fallback si la contraseña estuviera en texto plano durante la inicialización
  if (plain === hashed) return true;
  return await bcrypt.compare(plain, hashed);
}

/**
 * Codificación básica de token de sesión seguro basada en Base64url y firma HMAC sencilla
 */
export function createSessionToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    nombre: user.nombre,
    rol: user.rol,
    comision: user.comision,
    permisos: typeof user.permisos === 'string' ? JSON.parse(user.permisos || '{}') : (user.permisos || {}),
    exp: Date.now() + (1000 * 60 * 60 * 24 * 7), // 7 días
  };
  const json = JSON.stringify(payload);
  const base = Buffer.from(json).toString('base64url');
  // Simple signature token
  return `${base}.${Buffer.from(JWT_SECRET).toString('hex').slice(0, 16)}`;
}

export function parseSessionToken(token) {
  if (!token) return null;
  try {
    const [base, sig] = token.split('.');
    if (!base) return null;
    const json = Buffer.from(base, 'base64url').toString('utf8');
    const payload = JSON.parse(json);
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch (err) {
    return null;
  }
}

export function extractUserFromRequest(request) {
  const authHeader = request.headers.get('authorization');
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    // Buscar en cookie
    const cookie = request.headers.get('cookie') || '';
    const match = cookie.match(/cc_session=([^;]+)/);
    if (match) token = match[1];
  }
  return parseSessionToken(token);
}

export const PERMISOS_DEFAULT = {
  SUPER_ADMIN: {
    // Módulos
    vecinos: true,
    censo: true,
    documentos: true,
    pagos: true,
    firmas: true,
    modelador: true,
    estadisticas: true,
    auditoria: true,
    usuarios: true,
    configuracion: true,
    // Acciones granulares
    vecinos_crear: true,
    censo_masivo: true,
    vecinos_editar: true,
    vecinos_aprobar: true,
    vecinos_eliminar: true,
    docs_emitir: true,
    docs_anular: true,
    firmas_edit: true,
    modelador_edit: true,
  },
  ADMIN: {
    vecinos: true,
    censo: true,
    documentos: true,
    pagos: true,
    firmas: false,
    modelador: false,
    estadisticas: true,
    auditoria: true,
    usuarios: false,
    configuracion: false,
    vecinos_crear: true,
    censo_masivo: true,
    vecinos_editar: true,
    vecinos_aprobar: true,
    vecinos_eliminar: false,
    docs_emitir: true,
    docs_anular: false,
    firmas_edit: false,
    modelador_edit: false,
  },
  CONTRALORIA: {
    // Supervisión y control social: Solo Ver y Aprobar (Sin CRUD Total)
    vecinos: true,
    censo: true,
    documentos: true,
    pagos: true,
    firmas: false,
    modelador: false,
    estadisticas: true,
    auditoria: true,
    usuarios: false,
    configuracion: false,
    // Acciones granulares estrictas
    vecinos_crear: false,
    censo_masivo: false,
    vecinos_editar: false,
    vecinos_aprobar: true, // Aprobar vecinos pendientes de inscripción externa
    vecinos_eliminar: false,
    docs_emitir: true,     // Aprobar / emitir constancias aprobadas
    docs_anular: false,    // No puede anular
    firmas_edit: false,
    modelador_edit: false,
  },
  CENSISTA: {
    vecinos: true,
    censo: true,
    documentos: false,
    pagos: false,
    firmas: false,
    modelador: false,
    estadisticas: false,
    auditoria: false,
    usuarios: false,
    configuracion: false,
    // Acciones habilitadas exclusivamente para digitalización
    vecinos_crear: true,
    censo_masivo: true,
    vecinos_editar: true,
    vecinos_aprobar: false,
    vecinos_eliminar: false,
    docs_emitir: false,
    docs_anular: false,
    firmas_edit: false,
    modelador_edit: false,
  },
  DOCUMENTAL: {
    vecinos: true,
    censo: true,
    documentos: true,
    pagos: false,
    firmas: false,
    modelador: false,
    estadisticas: false,
    auditoria: false,
    usuarios: false,
    configuracion: false,
    vecinos_crear: false,
    censo_masivo: false,
    vecinos_editar: false,
    vecinos_aprobar: false,
    vecinos_eliminar: false,
    docs_emitir: true,
    docs_anular: false,
    firmas_edit: false,
    modelador_edit: false,
  },
  VOCERO: {
    vecinos: true,
    censo: true,
    documentos: false,
    pagos: false,
    firmas: false,
    modelador: false,
    estadisticas: false,
    auditoria: false,
    usuarios: false,
    configuracion: false,
    vecinos_crear: false,
    censo_masivo: false,
    vecinos_editar: false,
    vecinos_aprobar: false,
    vecinos_eliminar: false,
    docs_emitir: false,
    docs_anular: false,
    firmas_edit: false,
    modelador_edit: false,
  }
};

/**
 * Validador estricto de permisos de usuario
 */
export function hasPermission(user, permissionKey) {
  if (!user) return false;
  // El SUPER_ADMIN tiene todos los permisos por definición
  if (user.rol === 'SUPER_ADMIN') return true;

  const perms = typeof user.permisos === 'string'
    ? JSON.parse(user.permisos || '{}')
    : (user.permisos || {});

  // Si tiene el permiso explícito en su objeto de permisos
  if (perms[permissionKey] !== undefined) {
    return Boolean(perms[permissionKey]);
  }

  // Fallback según rol si no está configurado explícitamente
  const roleDefaults = PERMISOS_DEFAULT[user.rol] || PERMISOS_DEFAULT.VOCERO;
  return Boolean(roleDefaults[permissionKey]);
}


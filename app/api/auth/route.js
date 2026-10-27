import { NextResponse } from 'next/server';
import db from '@/lib/turso';
import { verifyPassword, hashPassword, createSessionToken, extractUserFromRequest, PERMISOS_DEFAULT } from '@/lib/auth';
import { registrarAuditoria } from '@/lib/audit';

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    // 1. INICIAR SESIÓN
    if (!action || action === 'login') {
      const { username, password } = body;
      if (!username || !password) {
        return NextResponse.json({ error: 'Usuario y contraseña requeridos' }, { status: 400 });
      }

      const res = await db.execute({
        sql: 'SELECT * FROM usuarios WHERE username = ? AND activo = 1 LIMIT 1',
        args: [username.trim().toUpperCase()]
      });

      if (res.rows.length === 0) {
        await registrarAuditoria({
          tipo_evento: 'INTENTO_ACCESO_FALLIDO',
          usuario_nombre: username.trim().toUpperCase(),
          request,
          detalles: { motivo: 'Usuario inexistente o cuenta deshabilitada', username: username.trim().toUpperCase() }
        });
        return NextResponse.json({ error: 'Credenciales inválidas o cuenta deshabilitada' }, { status: 401 });
      }

      const user = res.rows[0];
      const valid = (await verifyPassword(password, user.password_hash)) || (await verifyPassword(password.trim(), user.password_hash));
      if (!valid) {
        await registrarAuditoria({
          tipo_evento: 'INTENTO_ACCESO_FALLIDO',
          usuario_id: user.id,
          usuario_nombre: (user.nombre || '').toUpperCase(),
          request,
          detalles: { motivo: 'Contraseña incorrecta', username: user.username, rol: user.rol }
        });
        return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
      }

      const normalizedUser = {
        ...user,
        username: String(user.username || '').trim().toUpperCase(),
        nombre: String(user.nombre || '').trim().toUpperCase(),
        comision: user.comision ? String(user.comision).trim().toUpperCase() : null,
      };

      const token = createSessionToken(normalizedUser);

      // Registrar auditoría con IP pública
      await registrarAuditoria({
        tipo_evento: 'ACCESO_DASHBOARD',
        usuario_id: normalizedUser.id,
        usuario_nombre: normalizedUser.nombre,
        request,
        detalles: { username: normalizedUser.username, rol: normalizedUser.rol, comision: normalizedUser.comision || 'GENERAL', accion: 'Inicio de sesión en Panel Administrativo' }
      });

      const response = NextResponse.json({
        success: true,
        token,
        user: {
          id: normalizedUser.id,
          username: normalizedUser.username,
          nombre: normalizedUser.nombre,
          rol: normalizedUser.rol,
          comision: normalizedUser.comision,
          permisos: typeof normalizedUser.permisos === 'string' ? JSON.parse(normalizedUser.permisos || '{}') : (normalizedUser.permisos || {}),
        }
      });

      // Configurar cookie HTTP-Only para persistencia
      response.cookies.set('cc_session', token, {
        path: '/',
        httpOnly: false, // accesibilidad cliente para SPA hash navigation
        maxAge: 60 * 60 * 24 * 7,
        sameSite: 'lax',
      });

      return response;
    }

    // 1.B CERRAR SESIÓN
    if (action === 'logout') {
      const currentUser = extractUserFromRequest(request);
      if (currentUser) {
        await registrarAuditoria({
          tipo_evento: 'CIERRE_SESION',
          usuario_id: currentUser.id,
          usuario_nombre: currentUser.nombre || currentUser.username,
          request,
          detalles: { username: currentUser.username, rol: currentUser.rol, accion: 'Cierre de sesión voluntario' }
        });
      }
      const response = NextResponse.json({ success: true, message: 'Sesión cerrada' });
      response.cookies.delete('cc_session');
      return response;
    }

    // 2. CREAR NUEVO USUARIO (Solo SUPER_ADMIN)
    if (action === 'create_user') {
      const currentUser = extractUserFromRequest(request);
      if (!currentUser || currentUser.rol !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Solo el SUPER_ADMIN puede crear administradores o voceros' }, { status: 403 });
      }

      const { username, password, nombre, rol, comision, email, telefono, permisos } = body;
      if (!username || !password || !nombre || !rol) {
        return NextResponse.json({ error: 'Faltan campos requeridos (usuario, contraseña, nombre, rol)' }, { status: 400 });
      }

      const cleanUsername = username.trim().toUpperCase();
      const cleanNombre = nombre.trim().toUpperCase();
      const cleanComision = comision ? comision.trim().toUpperCase() : null;
      const existing = await db.execute({
        sql: 'SELECT id FROM usuarios WHERE username = ?',
        args: [cleanUsername]
      });

      if (existing.rows.length > 0) {
        return NextResponse.json({ error: 'El nombre de usuario ya está registrado' }, { status: 409 });
      }

      const passHash = await hashPassword(password.trim());
      const now = new Date().toISOString();
      const userPermisos = permisos || PERMISOS_DEFAULT[rol] || PERMISOS_DEFAULT.ADMIN;

      const result = await db.execute({
        sql: `INSERT INTO usuarios (username, password_hash, nombre, email, telefono, rol, comision, permisos, activo, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        args: [
          cleanUsername,
          passHash,
          cleanNombre,
          email ? email.trim() : null,
          telefono ? telefono.trim() : null,
          rol,
          cleanComision,
          JSON.stringify(userPermisos),
          now,
          now
        ]
      });

      await registrarAuditoria({
        tipo_evento: 'CREACION_USUARIO',
        usuario_id: currentUser.id,
        usuario_nombre: currentUser.nombre,
        request,
        detalles: {
          nuevo_usuario_id: Number(result.lastInsertRowid),
          nuevo_username: cleanUsername,
          nuevo_nombre: cleanNombre,
          rol_asignado: rol,
          comision: cleanComision || 'GENERAL'
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Usuario creado exitosamente',
        userId: Number(result.lastInsertRowid)
      });
    }

    return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
  } catch (err) {
    console.error('Error en /api/auth POST:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const currentUser = extractUserFromRequest(request);

    if (!currentUser) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Listar usuarios (solo SUPER_ADMIN)
    if (searchParams.get('list') === '1') {
      if (currentUser.rol !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
      }

      const res = await db.execute('SELECT id, username, nombre, email, telefono, rol, comision, permisos, activo, created_at, updated_at FROM usuarios ORDER BY id ASC');
      const users = res.rows.map(r => ({
        ...r,
        username: String(r.username || '').trim().toUpperCase(),
        nombre: String(r.nombre || '').trim().toUpperCase(),
        comision: r.comision ? String(r.comision).trim().toUpperCase() : r.comision,
        permisos: typeof r.permisos === 'string' ? JSON.parse(r.permisos || '{}') : (r.permisos || {})
      }));

      return NextResponse.json({ users });
    }

    // Obtener datos del usuario logueado
    const res = await db.execute({
      sql: 'SELECT id, username, nombre, email, telefono, rol, comision, permisos, activo FROM usuarios WHERE id = ?',
      args: [currentUser.id]
    });

    if (res.rows.length === 0 || !res.rows[0].activo) {
      return NextResponse.json({ authenticated: false, error: 'Usuario no activo' }, { status: 401 });
    }

    const u = res.rows[0];
    return NextResponse.json({
      authenticated: true,
      user: {
        id: u.id,
        username: String(u.username || '').trim().toUpperCase(),
        nombre: String(u.nombre || '').trim().toUpperCase(),
        email: u.email,
        telefono: u.telefono,
        rol: u.rol,
        comision: u.comision ? String(u.comision).trim().toUpperCase() : u.comision,
        permisos: typeof u.permisos === 'string' ? JSON.parse(u.permisos || '{}') : (u.permisos || {}),
      }
    });
  } catch (err) {
    console.error('Error en /api/auth GET:', err);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const currentUser = extractUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;
    const now = new Date().toISOString();

    // 1. CAMBIAR CONTRASEÑA PROPIA
    if (action === 'change_my_password') {
      const { currentPassword, newPassword } = body;
      if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: 'Debe ingresar la contraseña actual y la nueva' }, { status: 400 });
      }

      const res = await db.execute({
        sql: 'SELECT password_hash FROM usuarios WHERE id = ?',
        args: [currentUser.id]
      });

      if (res.rows.length === 0) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

      const valid = await verifyPassword(currentPassword, res.rows[0].password_hash);
      if (!valid) {
        return NextResponse.json({ error: 'La contraseña actual no coincide' }, { status: 400 });
      }

      const newHash = await hashPassword(newPassword);
      await db.execute({
        sql: 'UPDATE usuarios SET password_hash = ?, updated_at = ? WHERE id = ?',
        args: [newHash, now, currentUser.id]
      });

      await registrarAuditoria({
        tipo_evento: 'CAMBIO_CLAVE',
        usuario_id: currentUser.id,
        usuario_nombre: currentUser.nombre || currentUser.username,
        request,
        detalles: { username: currentUser.username, accion: 'Actualización de contraseña personal' }
      });

      return NextResponse.json({ success: true, message: 'Contraseña actualizada con éxito' });
    }

    // 2. MODIFICAR USUARIO (CRUD TOTAL Solo SUPER_ADMIN)
    if (action === 'update_user') {
      if (currentUser.rol !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Solo el SUPER_ADMIN puede modificar o deshabilitar usuarios' }, { status: 403 });
      }

      const { userId, username, nombre, rol, comision, email, telefono, permisos, activo, newPassword } = body;
      if (!userId) return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });

      // Obtener usuario actual
      const prevRes = await db.execute({
        sql: 'SELECT * FROM usuarios WHERE id = ?',
        args: [userId]
      });
      if (prevRes.rows.length === 0) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
      const prevUser = prevRes.rows[0];

      if (Number(userId) === Number(currentUser.id) && activo !== undefined && !activo) {
        return NextResponse.json({ error: 'No puedes inhabilitar tu propia cuenta activa de sesión' }, { status: 400 });
      }

      const nuevoUsername = username !== undefined && String(username).trim().length > 0
        ? String(username).trim().toUpperCase()
        : String(prevUser.username).trim().toUpperCase();

      if (nuevoUsername !== String(prevUser.username).trim().toUpperCase()) {
        const dupRes = await db.execute({
          sql: 'SELECT id FROM usuarios WHERE username = ? AND id != ?',
          args: [nuevoUsername, userId]
        });
        if (dupRes.rows.length > 0) {
          return NextResponse.json({ error: `El nombre de usuario "${nuevoUsername}" ya está ocupado por otro registro` }, { status: 409 });
        }
      }

      const nuevoNombre = nombre !== undefined ? String(nombre).trim().toUpperCase() : String(prevUser.nombre || '').trim().toUpperCase();
      const nuevoRol = rol !== undefined ? rol : prevUser.rol;
      const nuevaComision = comision !== undefined
        ? (comision && String(comision).trim() ? String(comision).trim().toUpperCase() : null)
        : (prevUser.comision ? String(prevUser.comision).trim().toUpperCase() : null);
      const nuevoEmail = email !== undefined ? (email ? String(email).trim() : null) : prevUser.email;
      const nuevoTelf = telefono !== undefined ? (telefono ? String(telefono).trim() : null) : prevUser.telefono;
      const nuevoActivo = activo !== undefined ? (activo ? 1 : 0) : prevUser.activo;
      const nuevosPermisos = permisos !== undefined
        ? (typeof permisos === 'string' ? permisos : JSON.stringify(permisos))
        : (prevUser.permisos || '{}');

      // Si se envía nueva contraseña para este usuario
      let passUpdateSql = '';
      const args = [nuevoUsername, nuevoNombre, nuevoRol, nuevaComision, nuevoEmail, nuevoTelf, nuevosPermisos, nuevoActivo, now];

      if (newPassword && newPassword.trim().length > 0) {
        const passHash = await hashPassword(newPassword.trim());
        passUpdateSql = ', password_hash = ?';
        args.push(passHash);
      }

      args.push(userId);

      await db.execute({
        sql: `UPDATE usuarios SET
          username = ?, nombre = ?, rol = ?, comision = ?, email = ?, telefono = ?,
          permisos = ?, activo = ?, updated_at = ?
          ${passUpdateSql}
          WHERE id = ?`,
        args
      });

      await registrarAuditoria({
        tipo_evento: 'MODIFICACION_USUARIO',
        usuario_id: currentUser.id,
        usuario_nombre: currentUser.nombre,
        request,
        detalles: {
          usuario_modificado_id: userId,
          username_anterior: prevUser.username,
          username_modificado: nuevoUsername,
          nombre_modificado: nuevoNombre,
          rol: nuevoRol,
          comision: nuevaComision,
          activo: Boolean(nuevoActivo),
          cambio_clave: Boolean(newPassword && newPassword.trim().length > 0),
        }
      });

      const response = NextResponse.json({
        success: true,
        message: 'Usuario y permisos modificados correctamente',
        updatedUser: {
          id: Number(userId),
          username: nuevoUsername,
          nombre: nuevoNombre,
          rol: nuevoRol,
          comision: nuevaComision,
          email: nuevoEmail,
          telefono: nuevoTelf,
          activo: nuevoActivo,
          permisos: typeof nuevosPermisos === 'string' ? JSON.parse(nuevosPermisos || '{}') : nuevosPermisos,
        }
      });

      // Si el SUPER_ADMIN editó su propio perfil activo, actualizar su cookie de sesión
      if (Number(userId) === Number(currentUser.id)) {
        const newToken = createSessionToken({
          id: Number(userId),
          username: nuevoUsername,
          nombre: nuevoNombre,
          rol: nuevoRol,
          comision: nuevaComision,
          permisos: nuevosPermisos,
        });
        response.cookies.set('cc_session', newToken, {
          path: '/',
          httpOnly: false,
          maxAge: 60 * 60 * 24 * 7,
          sameSite: 'lax',
        });
      }

      return response;
    }

    return NextResponse.json({ error: 'Acción no permitida' }, { status: 400 });
  } catch (err) {
    console.error('Error en /api/auth PUT:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const currentUser = extractUserFromRequest(request);
    if (!currentUser || currentUser.rol !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Solo el SUPER_ADMIN puede eliminar usuarios' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
    }

    const check = await db.execute({
      sql: 'SELECT username, nombre FROM usuarios WHERE id = ?',
      args: [userId]
    });

    if (check.rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (Number(userId) === Number(currentUser.id)) {
      return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta en sesión activa' }, { status: 400 });
    }

    await db.execute({
      sql: 'DELETE FROM usuarios WHERE id = ?',
      args: [userId]
    });

    await registrarAuditoria({
      tipo_evento: 'ELIMINACION_USUARIO',
      usuario_id: currentUser.id,
      usuario_nombre: currentUser.nombre,
      request,
      detalles: {
        usuario_eliminado_id: userId,
        username_eliminado: check.rows[0].username,
        nombre_eliminado: check.rows[0].nombre,
      }
    });

    return NextResponse.json({ success: true, message: 'Usuario eliminado exitosamente' });
  } catch (err) {
    console.error('Error en /api/auth DELETE:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

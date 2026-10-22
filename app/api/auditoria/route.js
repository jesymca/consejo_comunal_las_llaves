import { NextResponse } from 'next/server';
import db from '@/lib/turso';
import { extractUserFromRequest } from '@/lib/auth';
import {
  registrarAuditoria,
  resolverIpPublica,
  parsearUserAgent,
  esIpLocalOPrivada,
} from '@/lib/audit';

export const dynamic = 'force-dynamic';

const CATALOGO_EVENTOS = {
  ACCESO_DASHBOARD: { etiqueta: 'Inicio de Sesión en Dashboard', categoria: 'ACCESOS', critico: false, interno: true },
  CIERRE_SESION: { etiqueta: 'Cierre de Sesión', categoria: 'ACCESOS', critico: false, interno: true },
  INTENTO_ACCESO_FALLIDO: { etiqueta: 'Intento de Acceso Fallido', categoria: 'ACCESOS', critico: true, interno: true },
  CAMBIO_CLAVE: { etiqueta: 'Cambio de Contraseña', categoria: 'ACCESOS', critico: true, interno: true },
  SOLICITUD_DOCUMENTO: { etiqueta: 'Emisión / Solicitud de Constancia', categoria: 'DOCUMENTOS', critico: false, interno: false },
  DESCARGA_DOCUMENTO: { etiqueta: 'Descarga de Constancia PDF', categoria: 'DOCUMENTOS', critico: false, interno: false },
  RENOVACION_DOCUMENTO: { etiqueta: 'Renovación de Constancia', categoria: 'DOCUMENTOS', critico: false, interno: false },
  REVOCACION_DOCUMENTO: { etiqueta: 'Revocación / Anulación de Documento', categoria: 'DOCUMENTOS', critico: true, interno: true },
  CONSULTA_VALIDADOR: { etiqueta: 'Verificación de Código QR / Validador', categoria: 'DOCUMENTOS', critico: false, interno: false },
  REGISTRO_VECINO: { etiqueta: 'Inscripción de Vecino en Padrón', categoria: 'PADRON_CENSO', critico: false, interno: false },
  APROBACION_VECINO: { etiqueta: 'Aprobación Oficial de Vecino', categoria: 'PADRON_CENSO', critico: true, interno: true },
  RECHAZO_VECINO: { etiqueta: 'Rechazo / Observación de Vecino', categoria: 'PADRON_CENSO', critico: true, interno: true },
  IMPORTACION_CSV_VECINOS: { etiqueta: 'Importación Masiva CSV al Padrón', categoria: 'PADRON_CENSO', critico: true, interno: true },
  REGISTRO_PLANILLA_CENSO: { etiqueta: 'Guardado de Planilla de Censo Familiar', categoria: 'PADRON_CENSO', critico: false, interno: true },
  ELIMINACION_PLANILLA_CENSO: { etiqueta: 'Eliminación de Planilla de Censo', categoria: 'PADRON_CENSO', critico: true, interno: true },
  CREACION_USUARIO: { etiqueta: 'Creación de Vocero / Usuario', categoria: 'ADMINISTRACION', critico: true, interno: true },
  MODIFICACION_USUARIO: { etiqueta: 'Modificación de Permisos / Usuario', categoria: 'ADMINISTRACION', critico: true, interno: true },
  ELIMINACION_USUARIO: { etiqueta: 'Eliminación de Usuario', categoria: 'ADMINISTRACION', critico: true, interno: true },
  GESTION_FIRMAS_SELLOS: { etiqueta: 'Gestión de Firmas y Sellos Autorizados', categoria: 'ADMINISTRACION', critico: true, interno: true },
  EDICION_MODELADOR_PLANTILLA: { etiqueta: 'Edición de Plantilla / Cabecera / Footer SVG', categoria: 'ADMINISTRACION', critico: true, interno: true },
  ACTUALIZACION_CONFIGURACION: { etiqueta: 'Actualización de Configuración General', categoria: 'ADMINISTRACION', critico: true, interno: true },
  GESTION_TERRITORIO: { etiqueta: 'Modificación de Veredas y Casas', categoria: 'ADMINISTRACION', critico: true, interno: true },
  RESPALDO_BASE_DATOS: { etiqueta: 'Respaldo Integral de Base de Datos', categoria: 'ADMINISTRACION', critico: true, interno: true },
  SISTEMA_REINICIADO_A_PRODUCCION: { etiqueta: 'Reinicio de Base de Datos a Producción', categoria: 'ADMINISTRACION', critico: true, interno: true },
  NAVEGACION_MODULO: { etiqueta: 'Ingreso / Navegación en Módulo del Sistema', categoria: 'NAVEGACION', critico: false, interno: true },
  EXPORTACION_REPORTE: { etiqueta: 'Generación de Reporte / Exportación de Datos', categoria: 'NAVEGACION', critico: false, interno: true },
  DESCARGA_MUESTRA_PDF: { etiqueta: 'Descarga de Muestra PDF en Modelador', categoria: 'NAVEGACION', critico: false, interno: true },
};

function obtenerMetaEvento(tipo) {
  return (
    CATALOGO_EVENTOS[tipo] || {
      etiqueta: String(tipo || 'EVENTO_SISTEMA').replace(/_/g, ' '),
      categoria: 'NAVEGACION',
      critico: false,
      interno: true,
    }
  );
}

function construirResumenDetalle(row, detallesObj) {
  const t = row.tipo_evento;
  const d = detallesObj && typeof detallesObj === 'object' ? detallesObj : {};

  if (t === 'ACCESO_DASHBOARD') {
    return `Inició sesión en el sistema (${d.rol || 'Vocero'} - ${d.comision || 'Comisión General'})`;
  }
  if (t === 'CIERRE_SESION') {
    return `Cerró sesión en el panel administrativo (${d.username || ''})`;
  }
  if (t === 'INTENTO_ACCESO_FALLIDO') {
    return `Intento fallido de inicio de sesión: ${d.motivo || 'Credenciales inválidas'} (${d.username || ''})`;
  }
  if (t === 'SOLICITUD_DOCUMENTO') {
    const monto = d.exonerado ? 'Exonerado' : d.monto_bs ? `Bs. ${Number(d.monto_bs).toFixed(2)}` : '';
    return `Emitió constancia ${row.tipo_documento || d.tipo || ''} [${row.codigo_documento || ''}] ${monto ? `(${monto})` : ''}`.trim();
  }
  if (t === 'DESCARGA_DOCUMENTO') {
    return `Descargó PDF de constancia ${row.tipo_documento || ''} con código ${row.codigo_documento || 'N/A'}`;
  }
  if (t === 'RENOVACION_DOCUMENTO') {
    return `Renovó constancia ${row.tipo_documento || ''} (Anterior: ${d.renovado_de || 'N/A'} → Nuevo: ${row.codigo_documento || ''})`;
  }
  if (t === 'REVOCACION_DOCUMENTO') {
    return `Revocó documento ${row.codigo_documento || ''}. Motivo: ${d.motivo || 'Administrativo'}`;
  }
  if (t === 'CONSULTA_VALIDADOR') {
    if (d.encontrado === false) {
      return `Consultó en validador público el código/cédula "${d.criterio || row.codigo_documento || row.cedula || ''}" (No encontrado)`;
    }
    return `Verificó validez del documento ${row.codigo_documento || ''} (${d.estado || 'VIGENTE'}, ${d.diasRestantes ?? ''} días restantes)`;
  }
  if (t === 'APROBACION_VECINO') {
    return `Aprobó en el padrón a ${d.nombres || row.cedula || 'vecino'} (Vereda ${d.vereda || '?'}, Casa ${d.casa || '?'})`;
  }
  if (t === 'REGISTRO_VECINO') {
    return `Registró solicitud de vecino ${d.nombres || row.cedula || ''} en Vereda ${d.vereda || '?'}, Casa ${d.casa || '?'}`;
  }
  if (t === 'RECHAZO_VECINO') {
    return `Rechazó registro de ${d.nombres || row.cedula || 'vecino'}. Motivo: ${d.motivo || 'No especificado'}`;
  }
  if (t === 'IMPORTACION_CSV_VECINOS') {
    return `Importó lote CSV al padrón: ${d.insertados ?? 0} nuevos, ${d.duplicadosOmitidos ?? 0} duplicados omitidos`;
  }
  if (t === 'REGISTRO_PLANILLA_CENSO') {
    return `Guardó planilla de censo ${row.codigo_documento || d.numero_planilla || ''} (Vereda ${d.vereda || '?'}, Casa ${d.casa || '?'}, ${d.total_habitantes || 1} hab.)`;
  }
  if (t === 'ELIMINACION_PLANILLA_CENSO') {
    return `Eliminó planilla de censo ${row.codigo_documento || d.numero_planilla || ''}`;
  }
  if (t === 'EDICION_MODELADOR_PLANTILLA') {
    return d.accion || `Modificó diseño/plantilla en el Modelador Documental (${row.tipo_documento || 'Global'})`;
  }
  if (t === 'GESTION_FIRMAS_SELLOS') {
    return `${d.accion || 'Actualizó firmas autorizadas'}: ${d.vocero ? `${d.vocero} (${d.comision || ''})` : ''}`;
  }
  if (t === 'ACTUALIZACION_CONFIGURACION') {
    return `Actualizó configuración del sistema (${Array.isArray(d.claves_actualizadas) ? d.claves_actualizadas.slice(0, 4).join(', ') : 'parámetros'})`;
  }
  if (t === 'CREACION_USUARIO' || t === 'MODIFICACION_USUARIO' || t === 'ELIMINACION_USUARIO') {
    return `${d.accion || obtenerMetaEvento(t).etiqueta}: ${d.nuevo_username || d.username_modificado || d.username_eliminado || ''}`;
  }
  if (t === 'GESTION_TERRITORIO') {
    return `${d.accion || 'Gestión territorial'} en Vereda ${d.vereda || ''}`;
  }
  if (t === 'RESPALDO_BASE_DATOS') {
    return `Descargó respaldo integral de la BD (${d.formato || 'JSON'} - ${d.total_tablas || 0} tablas, ${d.total_registros || 0} registros)`;
  }
  if (t === 'NAVEGACION_MODULO') {
    return `Accedió al módulo "${d.modulo_nombre || d.modulo || 'Panel'}" ${d.descripcion ? `- ${d.descripcion}` : ''}`.trim();
  }
  if (t === 'EXPORTACION_REPORTE' || t === 'DESCARGA_MUESTRA_PDF') {
    return d.descripcion || d.accion || obtenerMetaEvento(t).etiqueta;
  }

  if (typeof detallesObj === 'string' && detallesObj.trim()) return detallesObj;
  if (d.accion) return d.accion;
  if (d.motivo) return d.motivo;
  return obtenerMetaEvento(t).etiqueta;
}

export async function GET(request) {
  try {
    const currentUser = extractUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Resolver la IP pública real actual y actualizar registros antiguos que tengan IP local/vacía
    const ipPublicaActual = await resolverIpPublica(request);
    if (ipPublicaActual && !esIpLocalOPrivada(ipPublicaActual)) {
      try {
        await db.execute({
          sql: `UPDATE bitacora_auditoria
                SET ip = ?
                WHERE ip IS NULL OR ip = '' OR ip IN ('127.0.0.1', '::1', '::ffff:127.0.0.1', 'Local', 'localhost')`,
          args: [ipPublicaActual],
        });
      } catch (e) {
        console.warn('No se pudo actualizar IPs históricas locales:', e.message);
      }
    }

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo') || '';
    const categoria = searchParams.get('categoria') || '';
    const cedula = searchParams.get('cedula') || '';
    const persona = searchParams.get('persona') || '';
    const ipFiltro = searchParams.get('ip') || '';
    const fechaInicio = searchParams.get('fechaInicio') || '';
    const fechaFin = searchParams.get('fechaFin') || '';
    const limit = Math.min(2000, Math.max(50, parseInt(searchParams.get('limit') || '500', 10)));

    let sql = `SELECT * FROM bitacora_auditoria WHERE 1=1`;
    const args = [];

    if (tipo) {
      sql += ` AND tipo_evento = ?`;
      args.push(tipo);
    }
    if (cedula) {
      sql += ` AND (cedula LIKE ? OR codigo_documento LIKE ? OR usuario_nombre LIKE ? OR detalles LIKE ?)`;
      const likeVal = `%${cedula.trim()}%`;
      args.push(likeVal, likeVal, likeVal, likeVal);
    }
    if (persona) {
      sql += ` AND (usuario_nombre = ? OR cedula = ?)`;
      args.push(persona, persona);
    }
    if (ipFiltro) {
      sql += ` AND ip LIKE ?`;
      args.push(`%${ipFiltro.trim()}%`);
    }
    if (fechaInicio) {
      sql += ` AND COALESCE(fecha, SUBSTR(created_at, 1, 10)) >= ?`;
      args.push(fechaInicio);
    }
    if (fechaFin) {
      sql += ` AND COALESCE(fecha, SUBSTR(created_at, 1, 10)) <= ?`;
      args.push(fechaFin);
    }

    sql += ` ORDER BY id DESC LIMIT ?`;
    args.push(limit);

    const res = await db.execute({ sql, args });

    // Procesar registros y enriquecer metadatos para la vista de Contraloría
    let logs = res.rows.map((r) => {
      let parsedDetalles = r.detalles;
      try {
        if (typeof r.detalles === 'string' && r.detalles.trim().startsWith('{')) {
          parsedDetalles = JSON.parse(r.detalles);
        }
      } catch {
        parsedDetalles = r.detalles;
      }

      const meta = obtenerMetaEvento(r.tipo_evento);
      const uaInfo = parsearUserAgent(r.user_agent);
      const ipMostrada =
        !esIpLocalOPrivada(r.ip)
          ? r.ip
          : (parsedDetalles && typeof parsedDetalles === 'object' && !esIpLocalOPrivada(parsedDetalles.ip_publica))
          ? parsedDetalles.ip_publica
          : ipPublicaActual || r.ip || 'No disponible';

      // Calcular fecha y hora en formato legible
      const fechaEvento = r.fecha || (r.created_at ? String(r.created_at).slice(0, 10) : '');
      let horaNum = typeof r.hora === 'number' && !isNaN(r.hora) ? Number(r.hora) : null;
      if (horaNum === null && r.created_at) {
        const d = new Date(r.created_at);
        if (!isNaN(d.getTime())) {
          const vzla = new Date(d.getTime() - 4 * 60 * 60 * 1000);
          horaNum = vzla.getUTCHours();
        }
      }
      if (horaNum === null || horaNum < 0 || horaNum > 23) horaNum = 0;

      const resumenAccion = construirResumenDetalle(r, parsedDetalles);

      return {
        ...r,
        ip: ipMostrada,
        fecha_limpia: fechaEvento,
        hora_num: horaNum,
        etiqueta_evento: meta.etiqueta,
        categoria_evento: meta.categoria,
        es_critico: meta.critico,
        es_interno: meta.interno,
        navegador: uaInfo.navegador,
        sistema_operativo: uaInfo.os,
        dispositivo: uaInfo.dispositivo,
        dispositivo_resumen: uaInfo.resumen,
        resumen_accion: resumenAccion,
        detalles: parsedDetalles,
      };
    });

    if (categoria) {
      logs = logs.filter((l) => l.categoria_evento === categoria);
    }

    // =========================================================================
    // CÁLCULO CUANTITATIVO DE CONTRALORÍA Y AUDITORÍA
    // =========================================================================

    // 1. Tráfico por Hora del Día (00:00 a 23:00)
    const mapaHoras = {};
    for (let h = 0; h < 24; h++) {
      mapaHoras[h] = {
        hora: `${String(h).padStart(2, '0')}:00`,
        horaCorta: `${String(h).padStart(2, '0')}h`,
        horaNum: h,
        total: 0,
        gestion_interna: 0,
        tramites_publicos: 0,
        accesos: 0,
        documentos: 0,
        padron_censo: 0,
        administracion: 0,
      };
    }

    // 2. Tráfico por Día (Rango de Fechas)
    const mapaDias = {};

    // 3. Conteo por Tipo de Evento y por Categoría
    const mapaTipos = {};
    const mapaCategorias = {
      ACCESOS: { codigo: 'ACCESOS', nombre: 'Accesos y Seguridad', total: 0, color: '#3b82f6' },
      DOCUMENTOS: { codigo: 'DOCUMENTOS', nombre: 'Trámites, Descargas y QR', total: 0, color: '#10b981' },
      PADRON_CENSO: { codigo: 'PADRON_CENSO', nombre: 'Padrón y Censo Comunal', total: 0, color: '#f59e0b' },
      ADMINISTRACION: { codigo: 'ADMINISTRACION', nombre: 'Administración y Configuración', total: 0, color: '#8b5cf6' },
      NAVEGACION: { codigo: 'NAVEGACION', nombre: 'Navegación y Consultas', total: 0, color: '#06b6d4' },
    };

    // 4. Historial y Estado Actual por Persona / Operador
    const mapaPersonas = {};

    // 5. Control por Dirección IP Pública
    const mapaIps = {};

    let totalEventos = logs.length;
    let totalCriticos = 0;
    let totalDocumentos = 0;

    // Franjas horarias
    const franjas = {
      MADRUGADA: { nombre: 'Madrugada (00:00 - 05:59)', total: 0, rango: '00h - 05h' },
      MANANA: { nombre: 'Mañana (06:00 - 11:59)', total: 0, rango: '06h - 11h' },
      TARDE: { nombre: 'Tarde (12:00 - 17:59)', total: 0, rango: '12h - 17h' },
      NOCHE: { nombre: 'Noche (18:00 - 23:59)', total: 0, rango: '18h - 23h' },
    };

    for (const log of logs) {
      const h = log.hora_num;
      if (mapaHoras[h]) {
        mapaHoras[h].total += 1;
        if (log.es_interno) mapaHoras[h].gestion_interna += 1;
        else mapaHoras[h].tramites_publicos += 1;

        if (log.categoria_evento === 'ACCESOS') mapaHoras[h].accesos += 1;
        else if (log.categoria_evento === 'DOCUMENTOS') mapaHoras[h].documentos += 1;
        else if (log.categoria_evento === 'PADRON_CENSO') mapaHoras[h].padron_censo += 1;
        else if (log.categoria_evento === 'ADMINISTRACION') mapaHoras[h].administracion += 1;
      }

      if (h >= 0 && h <= 5) franjas.MADRUGADA.total += 1;
      else if (h >= 6 && h <= 11) franjas.MANANA.total += 1;
      else if (h >= 12 && h <= 17) franjas.TARDE.total += 1;
      else franjas.NOCHE.total += 1;

      if (log.es_critico) totalCriticos += 1;
      if (log.categoria_evento === 'DOCUMENTOS') totalDocumentos += 1;

      // Por día
      const diaKey = log.fecha_limpia || 'Sin fecha';
      if (!mapaDias[diaKey]) {
        mapaDias[diaKey] = {
          fecha: diaKey,
          total: 0,
          gestion_interna: 0,
          tramites_publicos: 0,
          criticos: 0,
          ipsSet: new Set(),
          usuariosSet: new Set(),
        };
      }
      mapaDias[diaKey].total += 1;
      if (log.es_interno) mapaDias[diaKey].gestion_interna += 1;
      else mapaDias[diaKey].tramites_publicos += 1;
      if (log.es_critico) mapaDias[diaKey].criticos += 1;
      if (log.ip) mapaDias[diaKey].ipsSet.add(log.ip);

      // Por tipo de evento
      if (!mapaTipos[log.tipo_evento]) {
        mapaTipos[log.tipo_evento] = {
          tipo_evento: log.tipo_evento,
          etiqueta: log.etiqueta_evento,
          categoria: log.categoria_evento,
          critico: log.es_critico,
          total: 0,
        };
      }
      mapaTipos[log.tipo_evento].total += 1;

      // Por categoría
      if (mapaCategorias[log.categoria_evento]) {
        mapaCategorias[log.categoria_evento].total += 1;
      }

      // Identificar Persona (Vocero o Ciudadano)
      const nombrePersona =
        (log.usuario_nombre && String(log.usuario_nombre).trim()) ||
        (log.detalles?.titular && String(log.detalles.titular).trim()) ||
        (log.detalles?.nombres && String(log.detalles.nombres).trim()) ||
        (log.cedula ? `Ciudadano (${log.cedula})` : 'Visitante Público');

      const personaKey = log.usuario_id
        ? `USR_${log.usuario_id}`
        : log.cedula
        ? `CED_${log.cedula}`
        : `NOM_${nombrePersona.toUpperCase()}`;

      mapaDias[diaKey].usuariosSet.add(personaKey);

      if (!mapaPersonas[personaKey]) {
        mapaPersonas[personaKey] = {
          persona_key: personaKey,
          usuario_id: log.usuario_id || null,
          nombre: nombrePersona,
          cedula: log.cedula || null,
          es_vocero: Boolean(log.usuario_id) || ['SUPER_ADMIN', 'ADMIN', 'VOCERO'].includes(log.detalles?.rol),
          rol: log.detalles?.rol || (log.usuario_id ? 'VOCERO / ADMIN' : 'CIUDADANO / VECINO'),
          total_acciones: 0,
          accesos: 0,
          documentos: 0,
          padron_censo: 0,
          administracion: 0,
          navegacion: 0,
          acciones_criticas: 0,
          accion_actual: null, // El evento más reciente (lo que está haciendo)
          historial_acciones: [], // Todo lo que ha hecho cronológicamente
          ipsSet: new Set(),
          dispositivosSet: new Set(),
          primera_actividad: log.created_at,
          ultima_actividad: log.created_at,
        };
      }

      const pEntry = mapaPersonas[personaKey];
      pEntry.total_acciones += 1;
      if (!pEntry.cedula && log.cedula) pEntry.cedula = log.cedula;
      if (log.usuario_id && !pEntry.es_vocero) pEntry.es_vocero = true;

      if (log.categoria_evento === 'ACCESOS') pEntry.accesos += 1;
      else if (log.categoria_evento === 'DOCUMENTOS') pEntry.documentos += 1;
      else if (log.categoria_evento === 'PADRON_CENSO') pEntry.padron_censo += 1;
      else if (log.categoria_evento === 'ADMINISTRACION') pEntry.administracion += 1;
      else pEntry.navegacion += 1;

      if (log.es_critico) pEntry.acciones_criticas += 1;
      if (log.ip) pEntry.ipsSet.add(log.ip);
      if (log.dispositivo_resumen) pEntry.dispositivosSet.add(log.dispositivo_resumen);

      // Como logs viene ordenado por id DESC, el primero que entra es lo que está haciendo actualmente
      if (!pEntry.accion_actual) {
        pEntry.accion_actual = {
          id: log.id,
          tipo_evento: log.tipo_evento,
          etiqueta: log.etiqueta_evento,
          categoria: log.categoria_evento,
          resumen: log.resumen_accion,
          created_at: log.created_at,
          fecha: log.fecha_limpia,
          ip: log.ip,
          dispositivo: log.dispositivo_resumen,
          codigo_documento: log.codigo_documento,
        };
        pEntry.ultima_actividad = log.created_at;
      }
      pEntry.primera_actividad = log.created_at;

      if (pEntry.historial_acciones.length < 80) {
        pEntry.historial_acciones.push({
          id: log.id,
          tipo_evento: log.tipo_evento,
          etiqueta: log.etiqueta_evento,
          categoria: log.categoria_evento,
          es_critico: log.es_critico,
          resumen: log.resumen_accion,
          created_at: log.created_at,
          fecha: log.fecha_limpia,
          hora: `${String(log.hora_num).padStart(2, '0')}:00`,
          ip: log.ip,
          dispositivo: log.dispositivo_resumen,
          cedula: log.cedula,
          codigo_documento: log.codigo_documento,
          tipo_documento: log.tipo_documento,
        });
      }

      // Por IP Pública
      const ipKey = log.ip || 'No disponible';
      if (!mapaIps[ipKey]) {
        mapaIps[ipKey] = {
          ip: ipKey,
          total_eventos: 0,
          eventos_criticos: 0,
          personasSet: new Set(),
          dispositivosSet: new Set(),
          tiposSet: new Set(),
          ultima_actividad: log.created_at,
          primera_actividad: log.created_at,
        };
      }
      mapaIps[ipKey].total_eventos += 1;
      if (log.es_critico) mapaIps[ipKey].eventos_criticos += 1;
      mapaIps[ipKey].personasSet.add(nombrePersona);
      if (log.dispositivo_resumen) mapaIps[ipKey].dispositivosSet.add(log.dispositivo_resumen);
      mapaIps[ipKey].tiposSet.add(log.etiqueta_evento);
      mapaIps[ipKey].primera_actividad = log.created_at;
    }

    // Determinar Hora Pico
    let maxHoraObj = { hora: '00:00', total: 0, horaNum: 0 };
    Object.values(mapaHoras).forEach((item) => {
      if (item.total > maxHoraObj.total) {
        maxHoraObj = item;
      }
    });

    const traficoPorHora = Object.values(mapaHoras).map((item) => ({
      ...item,
      esHoraPico: item.total > 0 && item.total === maxHoraObj.total,
      porcentaje: totalEventos > 0 ? Number(((item.total / totalEventos) * 100).toFixed(1)) : 0,
    }));

    // Ordenar días cronológicamente ASC para gráfico de evolución
    const traficoPorDia = Object.values(mapaDias)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((d) => ({
        fecha: d.fecha,
        total: d.total,
        gestion_interna: d.gestion_interna,
        tramites_publicos: d.tramites_publicos,
        criticos: d.criticos,
        ips_unicas: d.ipsSet.size,
        personas_activas: d.usuariosSet.size,
      }));

    // Tipos de evento ordenados por cantidad DESC
    const porTipoEvento = Object.values(mapaTipos)
      .sort((a, b) => b.total - a.total)
      .map((t) => ({
        ...t,
        porcentaje: totalEventos > 0 ? Number(((t.total / totalEventos) * 100).toFixed(1)) : 0,
      }));

    const porCategoria = Object.values(mapaCategorias).map((c) => ({
      ...c,
      porcentaje: totalEventos > 0 ? Number(((c.total / totalEventos) * 100).toFixed(1)) : 0,
    }));

    // Historial por persona ordenado por última actividad / total de acciones
    const historialPorPersona = Object.values(mapaPersonas)
      .map((p) => ({
        persona_key: p.persona_key,
        usuario_id: p.usuario_id,
        nombre: p.nombre,
        cedula: p.cedula,
        es_vocero: p.es_vocero,
        rol: p.rol,
        total_acciones: p.total_acciones,
        historial_previo_count: Math.max(0, p.total_acciones - 1),
        accesos: p.accesos,
        documentos: p.documentos,
        padron_censo: p.padron_censo,
        administracion: p.administracion,
        navegacion: p.navegacion,
        acciones_criticas: p.acciones_criticas,
        accion_actual: p.accion_actual,
        historial_acciones: p.historial_acciones,
        ips_utilizadas: Array.from(p.ipsSet),
        dispositivos: Array.from(p.dispositivosSet),
        primera_actividad: p.primera_actividad,
        ultima_actividad: p.ultima_actividad,
      }))
      .sort((a, b) => new Date(b.ultima_actividad || 0).getTime() - new Date(a.ultima_actividad || 0).getTime());

    // Control por IP pública ordenado por volumen de tráfico DESC
    const controlPorIp = Object.values(mapaIps)
      .map((ipObj) => ({
        ip: ipObj.ip,
        total_eventos: ipObj.total_eventos,
        eventos_criticos: ipObj.eventos_criticos,
        porcentaje: totalEventos > 0 ? Number(((ipObj.total_eventos / totalEventos) * 100).toFixed(1)) : 0,
        usuarios_count: ipObj.personasSet.size,
        usuarios: Array.from(ipObj.personasSet),
        dispositivos: Array.from(ipObj.dispositivosSet),
        tipos_operacion: Array.from(ipObj.tiposSet).slice(0, 6),
        primera_actividad: ipObj.primera_actividad,
        ultima_actividad: ipObj.ultima_actividad,
      }))
      .sort((a, b) => b.total_eventos - a.total_eventos);

    // Franja horaria dominante
    const listaFranjas = Object.values(franjas).map((f) => ({
      ...f,
      porcentaje: totalEventos > 0 ? Number(((f.total / totalEventos) * 100).toFixed(1)) : 0,
    }));
    const franjaMayorTrafico = [...listaFranjas].sort((a, b) => b.total - a.total)[0] || listaFranjas[0];

    return NextResponse.json({
      ip_publica_actual: ipPublicaActual,
      logs,
      cuantitativo: {
        kpis: {
          total_eventos: totalEventos,
          ips_unicas: controlPorIp.length,
          personas_activas: historialPorPersona.length,
          voceros_activos: historialPorPersona.filter((p) => p.es_vocero).length,
          ciudadanos_activos: historialPorPersona.filter((p) => !p.es_vocero).length,
          acciones_criticas: totalCriticos,
          documentos_operados: totalDocumentos,
          dias_con_actividad: traficoPorDia.length,
          promedio_eventos_dia:
            traficoPorDia.length > 0 ? Number((totalEventos / traficoPorDia.length).toFixed(1)) : totalEventos,
          hora_pico: {
            hora: maxHoraObj.hora,
            rango: `${String(maxHoraObj.horaNum).padStart(2, '0')}:00 - ${String(maxHoraObj.horaNum).padStart(2, '0')}:59`,
            cantidad: maxHoraObj.total,
            porcentaje: totalEventos > 0 ? Number(((maxHoraObj.total / totalEventos) * 100).toFixed(1)) : 0,
          },
          franja_mayor_trafico: franjaMayorTrafico,
        },
        traficoPorHora,
        traficoPorDia,
        franjasHorarias: listaFranjas,
        porTipoEvento,
        porCategoria,
        historialPorPersona,
        controlPorIp,
      },
    });
  } catch (err) {
    console.error('Error en /api/auditoria GET:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;
    const currentUser = extractUserFromRequest(request);

    // 1. Registrar evento de descarga por parte del vecino o administrador
    if (action === 'registrar_descarga') {
      const { cedula, codigo_documento, tipo_documento, vecino_id, usuario_nombre, client_ip } = body;

      await registrarAuditoria({
        tipo_evento: 'DESCARGA_DOCUMENTO',
        usuario_id: currentUser?.id || null,
        usuario_nombre: currentUser?.nombre || usuario_nombre || 'Vecino / Ciudadano',
        cedula: cedula || null,
        codigo_documento: codigo_documento || null,
        tipo_documento: tipo_documento || null,
        vecino_id: vecino_id || null,
        ip: client_ip || null,
        request,
        detalles: {
          timestamp: new Date().toISOString(),
          metodo: 'Descarga Digital PDF',
        },
      });

      return NextResponse.json({ success: true, message: 'Evento de descarga registrado' });
    }

    // 2. Registrar actividad o navegación de módulo dentro del sistema (trazabilidad de lo que hace la persona)
    if (action === 'registrar_actividad') {
      const {
        tipo_evento = 'NAVEGACION_MODULO',
        modulo,
        modulo_nombre,
        descripcion,
        cedula,
        codigo_documento,
        tipo_documento,
        client_ip,
        detalles = {},
      } = body;

      await registrarAuditoria({
        tipo_evento,
        usuario_id: currentUser?.id || body.usuario_id || null,
        usuario_nombre: currentUser?.nombre || body.usuario_nombre || 'Usuario del Sistema',
        cedula: cedula || null,
        codigo_documento: codigo_documento || null,
        tipo_documento: tipo_documento || null,
        ip: client_ip || null,
        request,
        detalles: {
          ...detalles,
          modulo: modulo || detalles.modulo || null,
          modulo_nombre: modulo_nombre || detalles.modulo_nombre || null,
          descripcion: descripcion || detalles.descripcion || null,
          rol: currentUser?.rol || detalles.rol || null,
        },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
  } catch (err) {
    console.error('Error en /api/auditoria POST:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

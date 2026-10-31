import { NextResponse } from 'next/server';
import db from '@/lib/turso';
import { extractUserFromRequest, hasPermission } from '@/lib/auth';
import {
  esCasaValida,
  normalizarCasaVereda,
  normalizarCedula,
  MAPEO_PARENTESCO,
  MAPEO_INSTRUCCION,
  MAPEO_SALUD,
  decodificarParentesco,
  decodificarInstruccion,
  decodificarSalud,
  normalizarTextoComparacion,
  extraerDigitosCedula,
  tokensSimilares,
  esMismaPersonaEnVivienda,
  validarFechaValida,
  normalizarFechaISO,
} from '@/lib/territory';
import { cargarTerritorio } from '@/lib/territoryServer';
import { registrarAuditoria } from '@/lib/audit';
import { asegurarTablaCatalogos } from '@/app/api/catalogos/route';

export const dynamic = 'force-dynamic';

async function obtenerMapasCatalogosBidireccional() {
  const codigoADesc = {
    parentesco: { ...MAPEO_PARENTESCO },
    instruccion: { ...MAPEO_INSTRUCCION },
    salud: { ...MAPEO_SALUD },
  };
  const descACodigo = {
    parentesco: {},
    instruccion: {},
    salud: {},
  };

  try {
    await asegurarTablaCatalogos();
    const res = await db.execute('SELECT tipo, codigo, descripcion FROM catalogos_sistema WHERE activo = 1');
    for (const r of res.rows) {
      const t = String(r.tipo || '').toLowerCase();
      const c = String(r.codigo || '').toLowerCase().trim();
      const d = String(r.descripcion || '').trim();
      if (codigoADesc[t] && c && d) {
        codigoADesc[t][c] = d;
      }
    }
  } catch (e) {
    // Fallback a catálogos base
  }

  for (const tipo of ['parentesco', 'instruccion', 'salud']) {
    for (const [cod, desc] of Object.entries(codigoADesc[tipo])) {
      descACodigo[tipo][normalizarTextoComparacion(desc)] = cod;
      descACodigo[tipo][cod.toLowerCase()] = cod;
    }
  }

  return { codigoADesc, descACodigo };
}

function resolverCodigoCatalogo(tipo, valor, mapas, defaultCod) {
  if (!valor) return defaultCod;
  const raw = String(valor).trim();
  const lower = raw.toLowerCase();
  if (mapas.codigoADesc[tipo]?.[lower]) return lower;
  const norm = normalizarTextoComparacion(raw);
  if (mapas.descACodigo[tipo]?.[norm]) return mapas.descACodigo[tipo][norm];
  for (const [descNorm, cod] of Object.entries(mapas.descACodigo[tipo] || {})) {
    if (descNorm.length >= 3 && (norm.includes(descNorm) || descNorm.includes(norm))) {
      return cod;
    }
  }
  return defaultCod;
}

function parsearDemografiaVecino(vec, mapas, esPrimerIntegrante = false) {
  let parsed = {};
  const obsRaw = String(vec?.observaciones || '').trim();
  if (obsRaw) {
    try {
      const jsonIdx = obsRaw.indexOf('{');
      if (jsonIdx !== -1) {
        parsed = JSON.parse(obsRaw.slice(jsonIdx));
      }
    } catch (e) {}
  }

  const parentescoTexto = parsed.parentesco || '';
  const instruccionTexto = parsed.nivel_instruccion || parsed.instruccion || '';
  const saludTexto = parsed.condicion_salud || parsed.salud || '';
  const ocupacionTexto = String(parsed.profesion_ocupacion || parsed.ocupacion || '').trim();
  const numFamilia = Number(parsed.fam || parsed.numero_familia) || 1;

  return {
    numero_familia: numFamilia,
    parentesco_codigo: resolverCodigoCatalogo('parentesco', parentescoTexto, mapas, esPrimerIntegrante ? 'a' : 'c'),
    instruccion_codigo: resolverCodigoCatalogo('instruccion', instruccionTexto, mapas, 'c'),
    salud_codigo: resolverCodigoCatalogo('salud', saludTexto, mapas, 'e'),
    profesion_ocupacion: ocupacionTexto,
    parentesco_declarado: parentescoTexto || null,
    instruccion_declarada: instruccionTexto || null,
    salud_declarada: saludTexto || null,
  };
}

function fusionarHabitantesConVecinosDeCasa(habitantesPlanilla, vecinosCasa, mapas) {
  const resultado = habitantesPlanilla.map((h) => ({ ...h }));
  const vecinosUsados = new Set();

  for (const vec of vecinosCasa) {
    const idxMatch = resultado.findIndex((h, idx) => !h.vecino_id && esMismaPersonaEnVivienda(h, vec));
    const demo = parsearDemografiaVecino(vec, mapas, resultado.length === 0);
    const nombreCompletoVec = `${String(vec.nombres || '').trim()} ${String(vec.apellidos || '').trim()}`.trim().toUpperCase();

    if (idxMatch !== -1) {
      vecinosUsados.add(vec.id);
      const actual = resultado[idxMatch];
      const digHab = extraerDigitosCedula(actual.cedula);
      const digVec = extraerDigitosCedula(vec.cedula);

      let cedulaFinal = actual.cedula;
      if (!cedulaFinal || cedulaFinal === '0') {
        cedulaFinal = vec.cedula || '';
      } else if (digHab === digVec && vec.cedula && String(vec.cedula).includes('-')) {
        cedulaFinal = normalizarCedula(vec.cedula);
      }

      resultado[idxMatch] = {
        ...actual,
        cedula: cedulaFinal,
        sexo: actual.sexo || vec.sexo || 'M',
        fecha_nacimiento: actual.fecha_nacimiento || vec.fecha_nacimiento || '',
        telefono_movil: actual.telefono_movil || vec.telefono || '',
        profesion_ocupacion: actual.profesion_ocupacion || demo.profesion_ocupacion || '',
        vecino_id: vec.id,
        estado_vecino: vec.estado_aprobacion,
        origen_vecinos: 'EN_PLANILLA',
        aprobar_en_padron: vec.estado_aprobacion === 'APROBADO',
        datos_vecino_portal: {
          id: vec.id,
          cedula: vec.cedula,
          nombre_completo: nombreCompletoVec,
          parentesco_declarado: demo.parentesco_declarado,
          instruccion_declarada: demo.instruccion_declarada,
          ocupacion_declarada: demo.profesion_ocupacion,
          salud_declarada: demo.salud_declarada,
          telefono: vec.telefono || '',
          fecha_nacimiento: vec.fecha_nacimiento || '',
          estado_aprobacion: vec.estado_aprobacion,
          cedula_difiere: Boolean(digHab && digVec && digHab !== digVec),
        },
      };
    } else {
      vecinosUsados.add(vec.id);
      resultado.push({
        id: null,
        numero_habitante: resultado.length + 1,
        numero_familia: demo.numero_familia || 1,
        nombres_apellidos: nombreCompletoVec,
        cedula: vec.cedula ? normalizarCedula(vec.cedula) : '',
        sexo: vec.sexo || 'M',
        fecha_nacimiento: vec.fecha_nacimiento || '',
        parentesco: demo.parentesco_codigo || (resultado.length === 0 ? 'a' : 'c'),
        instruccion: demo.instruccion_codigo || 'c',
        profesion_ocupacion: demo.profesion_ocupacion || '',
        salud: demo.salud_codigo || 'e',
        telefono_movil: vec.telefono || '',
        vecino_id: vec.id,
        estado_vecino: vec.estado_aprobacion,
        origen_vecinos: 'DESDE_VECINOS',
        aprobar_en_padron: false,
        datos_vecino_portal: {
          id: vec.id,
          cedula: vec.cedula,
          nombre_completo: nombreCompletoVec,
          parentesco_declarado: demo.parentesco_declarado,
          instruccion_declarada: demo.instruccion_declarada,
          ocupacion_declarada: demo.profesion_ocupacion,
          salud_declarada: demo.salud_declarada,
          telefono: vec.telefono || '',
          fecha_nacimiento: vec.fecha_nacimiento || '',
          estado_aprobacion: vec.estado_aprobacion,
          cedula_difiere: false,
        },
      });
    }
  }

  return resultado.map((h, i) => ({
    ...h,
    numero_habitante: i + 1,
  }));
}

/**
 * Genera un número de planilla alfanumérico único aleatorio (Ej: PLC-A0A0A0)
 * para evitar números vacíos o saltos por planillas físicas no ejecutadas.
 */
async function generarNumeroPlanillaAlfanumericoUnico() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let intento = 0; intento < 20; intento++) {
    let rand = '';
    for (let i = 0; i < 6; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const candidate = `PLC-${rand}`;
    const check = await db.execute({
      sql: 'SELECT 1 FROM censo_planillas WHERE numero_planilla = ? LIMIT 1',
      args: [candidate]
    });
    if (check.rows.length === 0) {
      return candidate;
    }
  }
  return `PLC-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const vereda = searchParams.get('vereda');
    const casa = searchParams.get('casa');
    const cargarVivienda = searchParams.get('cargar_vivienda');

    if (searchParams.get('proximo_numero')) {
      const sugerido = await generarNumeroPlanillaAlfanumericoUnico();
      return NextResponse.json({ sugerido, tipo: 'ALFANUMERICO_ALEATORIO' });
    }

    // Buscar o pre-cargar datos de una vivienda específica (Vereda + Casa) cruzando con #vecinos
    if (cargarVivienda && vereda && casa) {
      const vUpper = vereda.trim().toUpperCase();
      const cUpper = normalizarCasaVereda(vUpper, casa);
      const mapas = await obtenerMapasCatalogosBidireccional();

      const planillaExistenteRes = await db.execute({
        sql: 'SELECT * FROM censo_planillas WHERE UPPER(calle_vereda_av) = ? AND UPPER(numero_casa) = ? ORDER BY id DESC LIMIT 1',
        args: [vUpper, cUpper],
      });

      const vecinosCasaRes = await db.execute({
        sql: `SELECT * FROM vecinos WHERE UPPER(vereda) = ? AND UPPER(casa) = ? AND estado_aprobacion != 'RECHAZADO' ORDER BY id ASC`,
        args: [vUpper, cUpper],
      });

      if (planillaExistenteRes.rows.length > 0) {
        const planillaRow = planillaExistenteRes.rows[0];
        const habRes = await db.execute({
          sql: 'SELECT * FROM censo_habitantes WHERE planilla_id = ? ORDER BY numero_habitante ASC, id ASC',
          args: [planillaRow.id],
        });
        const vistos = new Set();
        const habsBase = [];
        for (const h of habRes.rows) {
          const nomNorm = String(h.nombres_apellidos || '').trim().toUpperCase().replace(/\s+/g, ' ');
          const cedNorm = String(h.cedula || '').trim().toUpperCase();
          const clave = `${nomNorm}|${cedNorm}`;
          if (!vistos.has(clave)) {
            vistos.add(clave);
            habsBase.push(h);
          }
        }
        const fusionados = fusionarHabitantesConVecinosDeCasa(habsBase, vecinosCasaRes.rows, mapas);
        const jefeC = fusionados.find((h) => String(h.parentesco || '').toLowerCase() === 'a') || fusionados[0] || null;
        return NextResponse.json({
          existe_planilla: true,
          planilla: {
            ...planillaRow,
            total_habitantes: fusionados.length > 0 ? fusionados.length : planillaRow.total_habitantes,
            jefe_casa_nombre: jefeC?.nombres_apellidos || null,
            jefe_casa_cedula: jefeC?.cedula || null,
            jefe_casa: jefeC?.nombres_apellidos || null,
          },
          habitantes: fusionados,
          vecinos_casa: vecinosCasaRes.rows,
        });
      }

      // No existe planilla aún para esta casa, pre-cargar con los vecinos registrados en #vecinos
      const sugeridoNum = await generarNumeroPlanillaAlfanumericoUnico();
      const primerVec = vecinosCasaRes.rows[0] || null;
      const fusionados = fusionarHabitantesConVecinosDeCasa([], vecinosCasaRes.rows, mapas);

      return NextResponse.json({
        existe_planilla: false,
        sugerido: sugeridoNum,
        planilla: {
          numero_planilla: sugeridoNum,
          fecha: new Date().toISOString().split('T')[0],
          calle_vereda_av: vUpper,
          numero_casa: cUpper,
          telefono_contacto: primerVec?.telefono || '',
          tenencia_vivienda: primerVec?.calidad_tenencia || 'Propia',
          tiempo_residencia_desde: primerVec?.tiempo_residencia || '',
          total_familias: 1,
          total_habitantes: Math.max(1, fusionados.length),
          observaciones: '',
        },
        habitantes: fusionados,
        vecinos_casa: vecinosCasaRes.rows,
      });
    }

    if (id) {
      const planillaRes = await db.execute({
        sql: 'SELECT * FROM censo_planillas WHERE id = ? LIMIT 1',
        args: [id]
      });

      if (planillaRes.rows.length === 0) {
        return NextResponse.json({ error: 'Planilla no encontrada' }, { status: 404 });
      }

      const planillaRow = planillaRes.rows[0];
      const habitantesRes = await db.execute({
        sql: 'SELECT * FROM censo_habitantes WHERE planilla_id = ? ORDER BY numero_habitante ASC, id ASC',
        args: [id]
      });

      // Deduplicar defensivamente por (nombres_apellidos, cedula) dentro de la misma planilla
      const vistos = new Set();
      const habitantesUnicos = [];
      for (const h of habitantesRes.rows) {
        const nomNorm = String(h.nombres_apellidos || '').trim().toUpperCase().replace(/\s+/g, ' ');
        const cedNorm = String(h.cedula || '').trim().toUpperCase();
        const clave = `${nomNorm}|${cedNorm}`;
        if (!vistos.has(clave)) {
          vistos.add(clave);
          habitantesUnicos.push({
            ...h,
            numero_habitante: habitantesUnicos.length + 1,
          });
        }
      }

      // Cruzar con registros de #vecinos en la misma Vereda y Casa para completar datos faltantes o incluir integrantes pendientes sin duplicar
      const vUpper = String(planillaRow.calle_vereda_av || '').trim().toUpperCase();
      const cUpper = normalizarCasaVereda(vUpper, planillaRow.numero_casa || '');
      const vecinosCasaRes = await db.execute({
        sql: `SELECT * FROM vecinos WHERE UPPER(vereda) = ? AND UPPER(casa) = ? AND estado_aprobacion != 'RECHAZADO' ORDER BY id ASC`,
        args: [vUpper, cUpper],
      });

      const mapas = await obtenerMapasCatalogosBidireccional();
      const habitantesFusionados = fusionarHabitantesConVecinosDeCasa(habitantesUnicos, vecinosCasaRes.rows, mapas);
      const jefeIndiv = habitantesFusionados.find((h) => String(h.parentesco || '').toLowerCase() === 'a') || habitantesFusionados[0] || null;

      return NextResponse.json({
        planilla: {
          ...planillaRow,
          telefono_contacto: planillaRow.telefono_contacto || vecinosCasaRes.rows[0]?.telefono || '',
          tiempo_residencia_desde: planillaRow.tiempo_residencia_desde || vecinosCasaRes.rows[0]?.tiempo_residencia || '',
          total_habitantes: habitantesFusionados.length > 0 ? habitantesFusionados.length : planillaRow.total_habitantes,
          jefe_casa_nombre: jefeIndiv?.nombres_apellidos || null,
          jefe_casa_cedula: jefeIndiv?.cedula || null,
          jefe_casa: jefeIndiv?.nombres_apellidos || null,
        },
        habitantes: habitantesFusionados,
        vecinos_casa: vecinosCasaRes.rows,
      });
    }

    // Listado general de planillas con filtros y conteo real de habitantes
    let sql = `
      SELECT p.*,
        (SELECT COUNT(*) FROM censo_habitantes h WHERE h.planilla_id = p.id) AS habitantes_reales
      FROM censo_planillas p
      WHERE 1=1
    `;
    const args = [];

    if (vereda) {
      sql += ` AND p.calle_vereda_av = ?`;
      args.push(vereda.toUpperCase());
    }
    if (casa) {
      sql += ` AND p.numero_casa = ?`;
      args.push(casa.toUpperCase());
    }

    sql += ` ORDER BY p.id DESC LIMIT 200`;

    const [res, todosVecinosRes, todosHabsRes] = await Promise.all([
      db.execute({ sql, args }),
      db.execute(`SELECT * FROM vecinos WHERE estado_aprobacion != 'RECHAZADO' ORDER BY CASE WHEN estado_aprobacion = 'PENDIENTE' THEN 0 ELSE 1 END ASC, id DESC`),
      db.execute(`SELECT id, planilla_id, numero_habitante, numero_familia, nombres_apellidos, cedula, parentesco, fecha_nacimiento, telefono_movil, profesion_ocupacion FROM censo_habitantes ORDER BY numero_habitante ASC, id ASC`),
    ]);

    const habsPorPlanilla = {};
    for (const h of todosHabsRes.rows) {
      if (!habsPorPlanilla[h.planilla_id]) habsPorPlanilla[h.planilla_id] = [];
      habsPorPlanilla[h.planilla_id].push(h);
    }

    const planillaPorCasa = {};
    for (const p of res.rows) {
      const k = `${String(p.calle_vereda_av || '').trim().toUpperCase()}|${ normalizarCasaVereda(p.calle_vereda_av, p.numero_casa) }`;
      if (!planillaPorCasa[k]) planillaPorCasa[k] = p;
    }

    const vecinosVinculadosCenso = [];
    for (const v of todosVecinosRes.rows) {
      const vVereda = String(v.vereda || '').trim().toUpperCase();
      const vCasa = normalizarCasaVereda(vVereda, v.casa || '');
      const kCasa = `${vVereda}|${vCasa}`;
      const planillaCasa = planillaPorCasa[kCasa] || null;
      const listaHabs = planillaCasa ? (habsPorPlanilla[planillaCasa.id] || []) : [];
      const habMatch = listaHabs.find((h) => esMismaPersonaEnVivienda(h, v)) || null;

      let parsedObs = {};
      try {
        const obsStr = String(v.observaciones || '');
        const idx = obsStr.indexOf('{');
        if (idx !== -1) parsedObs = JSON.parse(obsStr.slice(idx));
      } catch (e) {}

      vecinosVinculadosCenso.push({
        id: v.id,
        cedula: v.cedula,
        nombres: v.nombres,
        apellidos: v.apellidos,
        nombre_completo: `${String(v.nombres || '').trim()} ${String(v.apellidos || '').trim()}`.trim(),
        vereda: vVereda,
        casa: vCasa,
        telefono: v.telefono || '',
        fecha_nacimiento: v.fecha_nacimiento || '',
        tiempo_residencia: v.tiempo_residencia || '',
        calidad_tenencia: v.calidad_tenencia || 'Propia',
        estado_aprobacion: v.estado_aprobacion,
        parentesco_declarado: parsedObs.parentesco || 'Jefe(a)',
        planilla_id: planillaCasa ? planillaCasa.id : null,
        numero_planilla: planillaCasa ? planillaCasa.numero_planilla : null,
        ya_en_planilla: Boolean(habMatch),
        habitante_planilla_nombre: habMatch ? habMatch.nombres_apellidos : null,
      });
    }

    const planillas = res.rows.map((p) => {
      const kCasa = `${String(p.calle_vereda_av || '').trim().toUpperCase()}|${normalizarCasaVereda(p.calle_vereda_av, p.numero_casa)}`;
      const vecinosDeEstaCasa = vecinosVinculadosCenso.filter((vc) => `${vc.vereda}|${vc.casa}` === kCasa);
      const pendientesCount = vecinosDeEstaCasa.filter((vc) => vc.estado_aprobacion === 'PENDIENTE').length;
      const nuevosSinIntegrarCount = vecinosDeEstaCasa.filter((vc) => !vc.ya_en_planilla).length;

      // Obtener el Jefe de esa Casa: aquel con parentesco 'a' (Jefe/a) o el primer habitante registrado
      const listaHabs = habsPorPlanilla[p.id] || [];
      const jefe = listaHabs.find((h) => String(h.parentesco || '').toLowerCase() === 'a') || listaHabs[0] || null;
      const jefeNombre = jefe ? jefe.nombres_apellidos : (vecinosDeEstaCasa[0]?.nombre_completo || null);
      const jefeCedula = jefe ? jefe.cedula : (vecinosDeEstaCasa[0]?.cedula || null);
      const jefeTelefono = jefe ? jefe.telefono_movil : (vecinosDeEstaCasa[0]?.telefono || null);

      return {
        ...p,
        total_habitantes: Number(p.habitantes_reales) > 0 ? Number(p.habitantes_reales) : Number(p.total_habitantes || 0),
        vecinos_portal_count: vecinosDeEstaCasa.length,
        vecinos_pendientes_count: pendientesCount,
        vecinos_por_integrar_count: nuevosSinIntegrarCount,
        jefe_casa_nombre: jefeNombre,
        jefe_casa_cedula: jefeCedula,
        jefe_casa_telefono: jefeTelefono,
        jefe_casa: jefeNombre,
      };
    });

    return NextResponse.json({
      planillas,
      vecinos_censo: vecinosVinculadosCenso,
    });
  } catch (err) {
    console.error('Error en /api/censo GET:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const currentUser = extractUserFromRequest(request);
    if (!currentUser || currentUser.rol !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acceso restringido: Solo el SUPER_ADMIN tiene permitido eliminar planillas de censo' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de planilla requerido' }, { status: 400 });
    }

    const planInfoRes = await db.execute({ sql: 'SELECT numero_planilla, calle_vereda_av, numero_casa FROM censo_planillas WHERE id = ? LIMIT 1', args: [id] });
    const planInfo = planInfoRes.rows[0] || {};

    // Eliminar habitantes asociados
    await db.execute({
      sql: 'DELETE FROM censo_habitantes WHERE planilla_id = ?',
      args: [id]
    });

    // Eliminar la planilla
    const delRes = await db.execute({
      sql: 'DELETE FROM censo_planillas WHERE id = ?',
      args: [id]
    });

    if (delRes.rowsAffected === 0) {
      return NextResponse.json({ error: 'No se encontró la planilla especificada' }, { status: 404 });
    }

    await registrarAuditoria({
      tipo_evento: 'ELIMINACION_PLANILLA_CENSO',
      usuario_id: currentUser.id,
      usuario_nombre: currentUser.nombre,
      codigo_documento: planInfo.numero_planilla || `ID-${id}`,
      request,
      detalles: {
        numero_planilla: planInfo.numero_planilla,
        vereda: planInfo.calle_vereda_av,
        casa: planInfo.numero_casa,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Planilla y sus habitantes eliminados satisfactoriamente'
    });
  } catch (err) {
    console.error('Error en /api/censo DELETE:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const currentUser = extractUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Sesión no válida o no autenticado' }, { status: 401 });
    }
    // El perfil CONTRALORIA solo puede ver y aprobar, no crear/editar planillas
    if (currentUser.rol === 'CONTRALORIA') {
      return NextResponse.json({ error: 'Los voceros de Contraloría solo tienen autorización para ver y aprobar registros, no para modificar censo' }, { status: 403 });
    }

    const body = await request.json();
    const {
      numero_planilla,
      fecha,
      empadronador_nombre,
      calle_vereda_av,
      numero_casa,
      telefono_contacto,
      tenencia_vivienda,
      tiempo_residencia_desde,
      total_familias,
      total_habitantes,
      observaciones,
      habitantes, // Array de habitantes
    } = body;

    let numPlanillaFinal = (numero_planilla || '').trim();

    // Si no enviaron número o enviaron AUTO, asignar código alfanumérico único aleatorio
    if (!numPlanillaFinal || numPlanillaFinal.toUpperCase() === 'AUTO') {
      numPlanillaFinal = await generarNumeroPlanillaAlfanumericoUnico();
    }

    if (!numPlanillaFinal || !calle_vereda_av || !numero_casa) {
      return NextResponse.json({ error: 'Número de planilla, vereda y casa son obligatorios' }, { status: 400 });
    }

    const vUpper = calle_vereda_av.trim().toUpperCase();
    const cUpper = normalizarCasaVereda(vUpper, numero_casa);

    await cargarTerritorio();
    if (!esCasaValida(vUpper, cUpper)) {
      return NextResponse.json({
        error: `La casa ${cUpper} no es válida para la Vereda ${vUpper}`
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Validar fecha de aplicación de la planilla (no puede ser texto arbitrario ni futura)
    let fechaPlanilla = now.split('T')[0];
    if (fecha) {
      const resFecPlanilla = validarFechaValida(fecha, false);
      if (!resFecPlanilla.valida) {
        return NextResponse.json({
          error: `La fecha de aplicación de la planilla no es válida: ${resFecPlanilla.error}. Debe ser una fecha real (DD/MM/AAAA o AAAA-MM-DD) y no futura.`
        }, { status: 400 });
      }
      fechaPlanilla = resFecPlanilla.iso;
    }

    // Limpiar y deduplicar habitantes recibidos (evita duplicados dentro de la misma vivienda)
    const habitantesLimpios = [];
    const vistosPayload = new Set();
    if (Array.isArray(habitantes)) {
      for (const h of habitantes) {
        const nomNorm = String(h?.nombres_apellidos || '').trim().toUpperCase().replace(/\s+/g, ' ');
        if (!nomNorm) continue;
        const cedNorm = String(h?.cedula || '').trim().toUpperCase();

        // Validar y normalizar fecha de nacimiento a formato ISO (YYYY-MM-DD)
        let nacNorm = '';
        if (h?.fecha_nacimiento) {
          const resNac = validarFechaValida(h.fecha_nacimiento, false);
          if (!resNac.valida) {
            return NextResponse.json({
              error: `Fecha de nacimiento no válida para el habitante "${nomNorm}": ${resNac.error}. Debe ser una fecha real (DD/MM/AAAA o AAAA-MM-DD) y no futura.`
            }, { status: 400 });
          }
          nacNorm = resNac.iso;
        }

        const clave = `${nomNorm}|${cedNorm}|${nacNorm}`;
        if (!vistosPayload.has(clave)) {
          vistosPayload.add(clave);
          habitantesLimpios.push({
            ...h,
            nombres_apellidos: nomNorm,
            cedula: cedNorm,
            fecha_nacimiento: nacNorm,
          });
        }
      }
    }

    const conteoHabitantesFinal = habitantesLimpios.length > 0
      ? habitantesLimpios.length
      : (Number(total_habitantes) || 1);

    numPlanillaFinal = numPlanillaFinal.toUpperCase();
    const planillaIdEdicion = Number(body.planilla_id) || null;

    // REGLA: El número de planilla asignado al transcriptor NUNCA se reemplaza silenciosamente.
    // 1) Si el código ya pertenece a OTRA planilla distinta a la que se edita -> rechazar (evita sobrescribir otra vivienda).
    const porNumeroRes = await db.execute({
      sql: 'SELECT id, calle_vereda_av, numero_casa FROM censo_planillas WHERE numero_planilla = ? LIMIT 1',
      args: [numPlanillaFinal],
    });
    const filaPorNumero = porNumeroRes.rows[0] || null;
    if (filaPorNumero && Number(filaPorNumero.id) !== planillaIdEdicion) {
      return NextResponse.json({
        error: `El código de planilla ${numPlanillaFinal} ya está asignado a la Vereda ${filaPorNumero.calle_vereda_av}, Casa ${filaPorNumero.numero_casa}. No se modificó ninguna planilla. Abra esa planilla para editarla o use otro código.`,
        conflicto: 'NUMERO_EN_USO',
      }, { status: 409 });
    }

    // 2) Regla de 1 planilla por vivienda: si la casa ya tiene OTRA planilla, rechazar en lugar de cambiar el número.
    const porCasaRes = await db.execute({
      sql: `SELECT id, numero_planilla FROM censo_planillas
            WHERE UPPER(calle_vereda_av) = ? AND UPPER(numero_casa) = ? LIMIT 1`,
      args: [vUpper, cUpper],
    });
    const filaPorCasa = porCasaRes.rows[0] || null;
    if (filaPorCasa && Number(filaPorCasa.id) !== planillaIdEdicion) {
      return NextResponse.json({
        error: `La Vereda ${vUpper}, Casa ${cUpper} ya tiene registrada la Planilla N° ${filaPorCasa.numero_planilla}. No se cambió el código ${numPlanillaFinal}. Abra la planilla existente para agregar o editar habitantes.`,
        conflicto: 'CASA_CON_PLANILLA',
        numero_planilla_existente: filaPorCasa.numero_planilla,
        planilla_id_existente: Number(filaPorCasa.id),
      }, { status: 409 });
    }

    // 3) Edición por ID: actualizar la fila exacta (permite corregir el código si el transcriptor lo cambia a mano)
    if (planillaIdEdicion) {
      const existeId = await db.execute({ sql: 'SELECT id FROM censo_planillas WHERE id = ? LIMIT 1', args: [planillaIdEdicion] });
      if (existeId.rows.length > 0) {
        await db.execute({
          sql: 'UPDATE censo_planillas SET numero_planilla = ? WHERE id = ?',
          args: [numPlanillaFinal, planillaIdEdicion],
        });
      }
    }

    // Guardar o actualizar planilla
    await db.execute({
      sql: `INSERT INTO censo_planillas (
        numero_planilla, fecha, empadronador_nombre, empadronador_usuario_id,
        calle_vereda_av, numero_casa, telefono_contacto, tenencia_vivienda,
        tiempo_residencia_desde, total_familias, total_habitantes, observaciones,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(numero_planilla) DO UPDATE SET
        fecha = excluded.fecha,
        empadronador_nombre = excluded.empadronador_nombre,
        calle_vereda_av = excluded.calle_vereda_av,
        numero_casa = excluded.numero_casa,
        telefono_contacto = excluded.telefono_contacto,
        tenencia_vivienda = excluded.tenencia_vivienda,
        tiempo_residencia_desde = excluded.tiempo_residencia_desde,
        total_familias = excluded.total_familias,
        total_habitantes = excluded.total_habitantes,
        observaciones = excluded.observaciones,
        updated_at = excluded.updated_at;`,
      args: [
        numPlanillaFinal,
        fechaPlanilla,
        (empadronador_nombre || currentUser?.nombre || '').trim().toUpperCase(),
        currentUser?.id || null,
        vUpper,
        cUpper,
        telefono_contacto || '',
        tenencia_vivienda || 'Propia',
        tiempo_residencia_desde || '',
        Number(total_familias) || 1,
        conteoHabitantesFinal,
        observaciones || '',
        now,
        now,
      ]
    });

    // Consultar SIEMPRE el id exacto por numero_planilla (nunca depender de lastInsertRowid tras ON CONFLICT DO UPDATE)
    const getP = await db.execute({
      sql: 'SELECT id FROM censo_planillas WHERE numero_planilla = ? LIMIT 1',
      args: [numPlanillaFinal]
    });
    const planillaId = Number(getP.rows[0]?.id);

    // Reemplazar habitantes de forma ATÓMICA mediante transacción db.batch(..., 'write')
    // Esto impide condiciones de carrera o duplicados si se presiona Guardar dos veces seguidas
    if (Array.isArray(habitantes) && planillaId) {
      const batchStmts = [
        {
          sql: 'DELETE FROM censo_habitantes WHERE planilla_id = ?',
          args: [planillaId],
        },
      ];

      for (let i = 0; i < habitantesLimpios.length; i++) {
        const h = habitantesLimpios[i];
        batchStmts.push({
          sql: `INSERT INTO censo_habitantes (
            planilla_id, numero_habitante, numero_familia, nombres_apellidos,
            cedula, sexo, fecha_nacimiento, parentesco, instruccion,
            profesion_ocupacion, salud, telefono_movil, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            planillaId,
            i + 1,
            Number(h.numero_familia) || 1,
            h.nombres_apellidos,
            h.cedula || '',
            h.sexo || 'M',
            h.fecha_nacimiento || '',
            h.parentesco || 'a',
            h.instruccion || 'c',
            h.profesion_ocupacion || '',
            h.salud || 'e',
            h.telefono_movil || '',
            now,
          ],
        });
      }

      batchStmts.push({
        sql: 'UPDATE censo_planillas SET total_habitantes = ?, updated_at = ? WHERE id = ?',
        args: [conteoHabitantesFinal, now, planillaId],
      });

      await db.batch(batchStmts, 'write');

      // Sincronizar bidireccionalmente con la tabla `vecinos` para que TODOS los habitantes aparezcan en #vecinos
      try {
        const vecinosCasaRes = await db.execute({
          sql: `SELECT * FROM vecinos WHERE UPPER(vereda) = ? AND UPPER(casa) = ? AND estado_aprobacion != 'RECHAZADO'`,
          args: [vUpper, cUpper],
        });
        const mapas = await obtenerMapasCatalogosBidireccional();
        const puedeAprobar = hasPermission(currentUser, 'vecinos_aprobar');

        for (let i = 0; i < habitantesLimpios.length; i++) {
          const h = habitantesLimpios[i];
          let vecMatch = vecinosCasaRes.rows.find((v) => esMismaPersonaEnVivienda(h, v)) || null;
          if (!vecMatch && h.cedula) {
            const cedNormBusqueda = normalizarCedula(h.cedula);
            const porCedRes = await db.execute({
              sql: 'SELECT * FROM vecinos WHERE cedula = ? LIMIT 1',
              args: [cedNormBusqueda],
            });
            if (porCedRes.rows.length > 0) vecMatch = porCedRes.rows[0];
          }

          const parentescoDesc = decodificarParentesco(h.parentesco || 'a', mapas.codigoADesc.parentesco);
          const instruccionDesc = decodificarInstruccion(h.instruccion || 'c', mapas.codigoADesc.instruccion);
          const saludDesc = decodificarSalud(h.salud || 'e', mapas.codigoADesc.salud);
          const demoActualizado = JSON.stringify({
            fam: Number(h.numero_familia) || 1,
            parentesco: parentescoDesc,
            nivel_instruccion: instruccionDesc,
            profesion_ocupacion: h.profesion_ocupacion || '',
            condicion_salud: saludDesc,
            origen: 'CENSO',
            numero_planilla: numPlanillaFinal,
          });

          if (vecMatch) {
            const cedFinalVecino = h.cedula && extraerDigitosCedula(h.cedula).length >= 5
              ? normalizarCedula(h.cedula)
              : vecMatch.cedula;

            let estadoNuevo = vecMatch.estado_aprobacion;
            let aprobadoPorId = vecMatch.aprobado_por_usuario_id;
            let aprobadoPorNombre = vecMatch.aprobado_por_nombre;
            let aprobadoEn = vecMatch.aprobado_en;

            if (h.aprobar_en_padron && puedeAprobar && vecMatch.estado_aprobacion !== 'APROBADO') {
              estadoNuevo = 'APROBADO';
              aprobadoPorId = currentUser.id;
              aprobadoPorNombre = (currentUser.nombre || '').trim().toUpperCase();
              aprobadoEn = now;
            }

            await db.execute({
              sql: `UPDATE vecinos SET
                cedula = ?,
                vereda = ?,
                casa = ?,
                sexo = ?,
                fecha_nacimiento = ?,
                telefono = ?,
                tiempo_residencia = ?,
                calidad_tenencia = ?,
                estado_aprobacion = ?,
                aprobado_por_usuario_id = ?,
                aprobado_por_nombre = ?,
                aprobado_en = ?,
                observaciones = ?,
                updated_at = ?
              WHERE id = ?`,
              args: [
                cedFinalVecino,
                vUpper,
                cUpper,
                h.sexo || vecMatch.sexo || 'M',
                h.fecha_nacimiento || vecMatch.fecha_nacimiento || '',
                h.telefono_movil || vecMatch.telefono || telefono_contacto || '',
                tiempo_residencia_desde || vecMatch.tiempo_residencia || '',
                tenencia_vivienda || vecMatch.calidad_tenencia || 'Propia',
                estadoNuevo,
                aprobadoPorId,
                aprobadoPorNombre,
                aprobadoEn,
                demoActualizado,
                now,
                vecMatch.id,
              ],
            });
          } else {
            // INSERTAR habitante como vecino en `vecinos` para que se muestre en el Padrón de Vecinos (#vecinos)
            const partes = String(h.nombres_apellidos || '').trim().split(/\s+/);
            let nomVec = partes[0] || 'SIN NOMBRE';
            let apeVec = partes.slice(1).join(' ') || '';
            if (partes.length >= 3) {
              const mitad = Math.ceil(partes.length / 2);
              nomVec = partes.slice(0, mitad).join(' ');
              apeVec = partes.slice(mitad).join(' ');
            }

            let cedulaVecino = '';
            if (h.cedula && extraerDigitosCedula(h.cedula).length >= 5) {
              cedulaVecino = normalizarCedula(h.cedula);
            } else {
              cedulaVecino = `S/C-${vUpper}${cUpper}-${i + 1}`;
            }

            const checkExiste = await db.execute({
              sql: 'SELECT id FROM vecinos WHERE cedula = ? LIMIT 1',
              args: [cedulaVecino]
            });

            if (checkExiste.rows.length === 0) {
              await db.execute({
                sql: `INSERT INTO vecinos (
                  cedula, nombres, apellidos, vereda, casa,
                  tiempo_residencia, calidad_tenencia, telefono, email,
                  sexo, fecha_nacimiento, estado_aprobacion,
                  aprobado_por_usuario_id, aprobado_por_nombre, aprobado_en,
                  observaciones, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [
                  cedulaVecino,
                  nomVec.toUpperCase(),
                  apeVec.toUpperCase(),
                  vUpper,
                  cUpper,
                  tiempo_residencia_desde || '',
                  tenencia_vivienda || 'Propia',
                  h.telefono_movil || telefono_contacto || '',
                  '',
                  h.sexo || 'M',
                  h.fecha_nacimiento || '',
                  'APROBADO',
                  currentUser.id,
                  (currentUser.nombre || '').trim().toUpperCase(),
                  now,
                  demoActualizado,
                  now,
                  now,
                ]
              });
            }
          }
        }
      } catch (syncErr) {
        console.warn('Advertencia sincronizando habitante con vecinos:', syncErr);
      }
    }

    const jefeFamiliar = habitantesLimpios[0] || null;
    await registrarAuditoria({
      tipo_evento: 'REGISTRO_PLANILLA_CENSO',
      usuario_id: currentUser?.id || null,
      usuario_nombre: currentUser?.nombre || empadronador_nombre || 'Empadronador Comunal',
      cedula: jefeFamiliar?.cedula || null,
      codigo_documento: numPlanillaFinal,
      request,
      detalles: {
        numero_planilla: numPlanillaFinal,
        vereda: vUpper,
        casa: cUpper,
        total_familias: Number(total_familias) || 1,
        total_habitantes: conteoHabitantesFinal,
        jefe_familia: jefeFamiliar?.nombres_apellidos || null,
      }
    });

    return NextResponse.json({
      success: true,
      message: `Planilla de censo ${numPlanillaFinal} guardada satisfactoriamente`,
      planillaId,
      numero_planilla: numPlanillaFinal,
    });
  } catch (err) {
    console.error('Error en /api/censo POST:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

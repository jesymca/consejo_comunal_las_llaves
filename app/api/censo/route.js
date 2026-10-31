import { NextResponse } from 'next/server';
import db from '@/lib/turso';
import { extractUserFromRequest } from '@/lib/auth';
import { esCasaValida, normalizarCasaVereda } from '@/lib/territory';
import { cargarTerritorio } from '@/lib/territoryServer';
import { registrarAuditoria } from '@/lib/audit';

export const dynamic = 'force-dynamic';

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

    if (searchParams.get('proximo_numero')) {
      const sugerido = await generarNumeroPlanillaAlfanumericoUnico();
      return NextResponse.json({ sugerido, tipo: 'ALFANUMERICO_ALEATORIO' });
    }

    if (id) {
      const planillaRes = await db.execute({
        sql: 'SELECT * FROM censo_planillas WHERE id = ? LIMIT 1',
        args: [id]
      });

      if (planillaRes.rows.length === 0) {
        return NextResponse.json({ error: 'Planilla no encontrada' }, { status: 404 });
      }

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

      return NextResponse.json({
        planilla: {
          ...planillaRes.rows[0],
          total_habitantes: habitantesUnicos.length > 0 ? habitantesUnicos.length : planillaRes.rows[0].total_habitantes,
        },
        habitantes: habitantesUnicos,
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

    const res = await db.execute({ sql, args });
    const planillas = res.rows.map((p) => ({
      ...p,
      total_habitantes: Number(p.habitantes_reales) > 0 ? Number(p.habitantes_reales) : Number(p.total_habitantes || 0),
    }));
    return NextResponse.json({ planillas });
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

    // Limpiar y deduplicar habitantes recibidos (evita duplicados dentro de la misma vivienda)
    const habitantesLimpios = [];
    const vistosPayload = new Set();
    if (Array.isArray(habitantes)) {
      for (const h of habitantes) {
        const nomNorm = String(h?.nombres_apellidos || '').trim().toUpperCase().replace(/\s+/g, ' ');
        if (!nomNorm) continue;
        const cedNorm = String(h?.cedula || '').trim().toUpperCase();
        const nacNorm = String(h?.fecha_nacimiento || '').trim();
        const clave = `${nomNorm}|${cedNorm}|${nacNorm}`;
        if (!vistosPayload.has(clave)) {
          vistosPayload.add(clave);
          habitantesLimpios.push({
            ...h,
            nombres_apellidos: nomNorm,
            cedula: cedNorm,
          });
        }
      }
    }

    const conteoHabitantesFinal = habitantesLimpios.length > 0
      ? habitantesLimpios.length
      : (Number(total_habitantes) || 1);

    // Verificar si ya existe una planilla por numero_planilla o para la misma vivienda (vereda + casa)
    const existenteRes = await db.execute({
      sql: `SELECT id, numero_planilla FROM censo_planillas
            WHERE numero_planilla = ? OR (UPPER(calle_vereda_av) = ? AND UPPER(numero_casa) = ?)
            ORDER BY CASE WHEN numero_planilla = ? THEN 0 ELSE 1 END ASC, id ASC
            LIMIT 1`,
      args: [numPlanillaFinal, vUpper, cUpper, numPlanillaFinal],
    });

    if (existenteRes.rows.length > 0 && existenteRes.rows[0].numero_planilla) {
      numPlanillaFinal = existenteRes.rows[0].numero_planilla;
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
        fecha || now.split('T')[0],
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

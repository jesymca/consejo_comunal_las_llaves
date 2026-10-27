import { NextResponse } from 'next/server';
import db from '@/lib/turso';
import { extractUserFromRequest } from '@/lib/auth';
import { esCasaValida } from '@/lib/territory';
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
        sql: 'SELECT * FROM censo_habitantes WHERE planilla_id = ? ORDER BY numero_habitante ASC',
        args: [id]
      });

      return NextResponse.json({
        planilla: planillaRes.rows[0],
        habitantes: habitantesRes.rows,
      });
    }

    // Listado general de planillas con filtros
    let sql = `SELECT * FROM censo_planillas WHERE 1=1`;
    const args = [];

    if (vereda) {
      sql += ` AND calle_vereda_av = ?`;
      args.push(vereda.toUpperCase());
    }
    if (casa) {
      sql += ` AND numero_casa = ?`;
      args.push(casa.toUpperCase());
    }

    sql += ` ORDER BY id DESC LIMIT 100`;

    const res = await db.execute({ sql, args });
    return NextResponse.json({ planillas: res.rows });
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
    const cUpper = numero_casa.trim().toUpperCase();

    await cargarTerritorio();
    if (!esCasaValida(vUpper, cUpper)) {
      return NextResponse.json({
        error: `La casa ${cUpper} no es válida para la Vereda ${vUpper}`
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Guardar o actualizar planilla
    const planillaRes = await db.execute({
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
        Number(total_habitantes) || (habitantes?.length || 1),
        observaciones || '',
        now,
        now,
      ]
    });

    // Obtener ID de la planilla
    let planillaId = Number(planillaRes.lastInsertRowid);
    if (!planillaId) {
      const getP = await db.execute({
        sql: 'SELECT id FROM censo_planillas WHERE numero_planilla = ?',
        args: [numPlanillaFinal]
      });
      planillaId = getP.rows[0]?.id;
    }

    // Si enviaron habitantes, reemplazar registros de la planilla
    if (habitantes && Array.isArray(habitantes) && planillaId) {
      await db.execute({
        sql: 'DELETE FROM censo_habitantes WHERE planilla_id = ?',
        args: [planillaId]
      });

      for (let i = 0; i < habitantes.length; i++) {
        const h = habitantes[i];
        if (!h.nombres_apellidos) continue;
        await db.execute({
          sql: `INSERT INTO censo_habitantes (
            planilla_id, numero_habitante, numero_familia, nombres_apellidos,
            cedula, sexo, fecha_nacimiento, parentesco, instruccion,
            profesion_ocupacion, salud, telefono_movil, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            planillaId,
            i + 1,
            Number(h.numero_familia) || 1,
            h.nombres_apellidos.trim().toUpperCase(),
            h.cedula || '',
            h.sexo || 'M',
            h.fecha_nacimiento || '',
            h.parentesco || 'a',
            h.instruccion || 'c',
            h.profesion_ocupacion || '',
            h.salud || 'e',
            h.telefono_movil || '',
            now,
          ]
        });
      }
    }

    const jefeFamiliar = Array.isArray(habitantes) && habitantes[0] ? habitantes[0] : null;
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
        total_habitantes: Number(total_habitantes) || (habitantes?.length || 1),
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

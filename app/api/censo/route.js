import { NextResponse } from 'next/server';
import db from '@/lib/turso';
import { extractUserFromRequest } from '@/lib/auth';
import { esCasaValida } from '@/lib/territory';
import { cargarTerritorio } from '@/lib/territoryServer';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const vereda = searchParams.get('vereda');
    const casa = searchParams.get('casa');

    if (searchParams.get('proximo_numero')) {
      // Garantizar tabla de secuencia de planillas para asignación atómica segura
      await db.execute({
        sql: `CREATE TABLE IF NOT EXISTS censo_secuencias (
          id INTEGER PRIMARY KEY,
          ultimo_numero INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT
        );`
      });

      // Asegurar que exista la fila 1 y sincronizar con el mayor ID actual si la tabla estaba vacía
      const secRes = await db.execute({
        sql: `SELECT ultimo_numero FROM censo_secuencias WHERE id = 1 LIMIT 1`
      });

      let nextNum = 1;
      if (secRes.rows.length === 0) {
        // Inicializar con el MAX actual de censo_planillas
        const maxRes = await db.execute({
          sql: `SELECT numero_planilla, id FROM censo_planillas ORDER BY id DESC LIMIT 1`,
        });
        if (maxRes.rows.length > 0) {
          const match = String(maxRes.rows[0].numero_planilla || '').match(/(\d+)$/);
          nextNum = match ? parseInt(match[1], 10) + 1 : (Number(maxRes.rows[0].id) || 0) + 1;
        }
        await db.execute({
          sql: `INSERT OR REPLACE INTO censo_secuencias (id, ultimo_numero, updated_at) VALUES (1, ?, ?)`,
          args: [nextNum, new Date().toISOString()]
        });
      } else {
        // Asignar el siguiente correlativo atómicamente incrementando la secuencia
        const nowIso = new Date().toISOString();
        await db.execute({
          sql: `UPDATE censo_secuencias SET ultimo_numero = ultimo_numero + 1, updated_at = ? WHERE id = 1`,
          args: [nowIso]
        });
        const getUpdated = await db.execute({
          sql: `SELECT ultimo_numero FROM censo_secuencias WHERE id = 1 LIMIT 1`
        });
        nextNum = getUpdated.rows[0]?.ultimo_numero || 1;
      }

      const sugerido = `PLC-${String(nextNum).padStart(4, '0')}`;
      return NextResponse.json({ sugerido, nextNum });
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
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de planilla requerido' }, { status: 400 });
    }

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
    // Puede ser editado por ADMIN, SUPER_ADMIN o el empadronador
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

    // Si no enviaron número o enviaron AUTO, asignar correlativo atómico en el servidor
    if (!numPlanillaFinal || numPlanillaFinal.toUpperCase() === 'AUTO') {
      await db.execute({
        sql: `CREATE TABLE IF NOT EXISTS censo_secuencias (
          id INTEGER PRIMARY KEY,
          ultimo_numero INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT
        );`
      });

      const nowIso = new Date().toISOString();
      const secRes = await db.execute({
        sql: `SELECT ultimo_numero FROM censo_secuencias WHERE id = 1 LIMIT 1`
      });

      let nextNum = 1;
      if (secRes.rows.length === 0) {
        const maxRes = await db.execute({
          sql: `SELECT numero_planilla, id FROM censo_planillas ORDER BY id DESC LIMIT 1`,
        });
        if (maxRes.rows.length > 0) {
          const match = String(maxRes.rows[0].numero_planilla || '').match(/(\d+)$/);
          nextNum = match ? parseInt(match[1], 10) + 1 : (Number(maxRes.rows[0].id) || 0) + 1;
        }
        await db.execute({
          sql: `INSERT OR REPLACE INTO censo_secuencias (id, ultimo_numero, updated_at) VALUES (1, ?, ?)`,
          args: [nextNum, nowIso]
        });
      } else {
        await db.execute({
          sql: `UPDATE censo_secuencias SET ultimo_numero = ultimo_numero + 1, updated_at = ? WHERE id = 1`,
          args: [nowIso]
        });
        const getUp = await db.execute({
          sql: `SELECT ultimo_numero FROM censo_secuencias WHERE id = 1 LIMIT 1`
        });
        nextNum = getUp.rows[0]?.ultimo_numero || 1;
      }
      numPlanillaFinal = `PLC-${String(nextNum).padStart(4, '0')}`;
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
        empadronador_nombre || (currentUser?.nombre || ''),
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

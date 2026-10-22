import { NextResponse } from 'next/server';
import db from '@/lib/turso';
import { extractUserFromRequest } from '@/lib/auth';
import { registrarAuditoria } from '@/lib/audit';

export const dynamic = 'force-dynamic';

function escapeSqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  // String escaping: replace single quotes with two single quotes
  return `'${String(val).replace(/'/g, "''")}'`;
}

export async function GET(request) {
  try {
    const currentUser = extractUserFromRequest(request);
    if (!currentUser || currentUser.rol !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Acceso restringido: Solo el SUPER_ADMIN del sistema tiene autorización para realizar respaldos de la base de datos' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const infoOnly = searchParams.get('info') === '1';
    const format = (searchParams.get('format') || 'json').toLowerCase();

    // Obtener catálogo dinámico de todas las tablas de usuario en la base de datos
    const tablesRes = await db.execute(`
      SELECT name, sql FROM sqlite_master 
      WHERE type = 'table' 
        AND name NOT LIKE 'sqlite_%' 
        AND name NOT LIKE '_litestream_%'
      ORDER BY name ASC
    `);

    const tableNames = tablesRes.rows.map((r) => r.name);

    // Si solo se solicita información/diagnóstico de tablas
    if (infoOnly) {
      const stats = [];
      let totalRegistros = 0;

      for (const tName of tableNames) {
        try {
          const cRes = await db.execute(`SELECT COUNT(*) as total FROM "${tName}"`);
          const count = Number(cRes.rows[0]?.total || 0);
          stats.push({ nombre: tName, registros: count });
          totalRegistros += count;
        } catch (e) {
          stats.push({ nombre: tName, registros: 0, error: e.message });
        }
      }

      let ultimoRespaldo = null;
      try {
        const confRes = await db.execute({
          sql: "SELECT valor FROM configuracion_sistema WHERE clave = 'ultimo_respaldo_bd' LIMIT 1"
        });
        ultimoRespaldo = confRes.rows[0]?.valor || null;
      } catch (e) {}

      return NextResponse.json({
        success: true,
        totalTablas: stats.length,
        totalRegistros,
        ultimoRespaldo,
        motor: 'Turso LibSQL Cloud / SQLite',
        tablas: stats
      });
    }

    // Extraer estructura y datos de cada tabla
    const nowIso = new Date().toISOString();
    const tablesData = {};
    const schemas = {};
    let totalFilas = 0;

    for (const tRow of tablesRes.rows) {
      const tName = tRow.name;
      schemas[tName] = tRow.sql;

      try {
        const rowsRes = await db.execute(`SELECT * FROM "${tName}"`);
        tablesData[tName] = rowsRes.rows;
        totalFilas += rowsRes.rows.length;
      } catch (err) {
        console.error(`Error al exportar tabla ${tName}:`, err.message);
        tablesData[tName] = [];
      }
    }

    // Actualizar registro de último respaldo en la configuración del sistema
    try {
      await db.execute({
        sql: `INSERT INTO configuracion_sistema (clave, valor, descripcion, updated_at)
              VALUES ('ultimo_respaldo_bd', ?, 'Fecha y hora del último respaldo integral descargado', ?)
              ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor, updated_at = excluded.updated_at;`,
        args: [nowIso, nowIso]
      });
    } catch (e) {
      console.warn('No se pudo guardar la marca de último respaldo:', e.message);
    }

    // Registrar en la bitácora de auditoría
    await registrarAuditoria({
      tipo_evento: 'RESPALDO_BASE_DATOS',
      usuario_id: currentUser.id,
      usuario_nombre: currentUser.nombre,
      request,
      detalles: {
        formato: format.toUpperCase(),
        total_tablas: tableNames.length,
        total_registros: totalFilas,
        fecha: nowIso,
        accion: `SUPER_ADMIN descargó respaldo completo de la base de datos (${format.toUpperCase()})`
      }
    });

    const timestampFile = nowIso.replace(/[:.]/g, '-').slice(0, 19);

    // FORMATO 1: VOLCADO SQL (.sql)
    if (format === 'sql') {
      let sqlDump = `-- ====================================================================\n`;
      sqlDump += `-- RESPALDO INTEGRAL DE BASE DE DATOS\n`;
      sqlDump += `-- Organización: Consejo Comunal "Las Llaves"\n`;
      sqlDump += `-- Ámbito: Urbanización Dr. Alfredo Travieso Paúl, Puerto Cabello\n`;
      sqlDump += `-- Código SITUR: 08-11-04-001-0033 | RIF: C299916862\n`;
      sqlDump += `-- Fecha de Creación: ${nowIso}\n`;
      sqlDump += `-- Generado Por: ${currentUser.nombre} (${currentUser.username})\n`;
      sqlDump += `-- Total Tablas: ${tableNames.length} | Total Registros: ${totalFilas}\n`;
      sqlDump += `-- ====================================================================\n\n`;
      sqlDump += `PRAGMA foreign_keys = OFF;\n`;
      sqlDump += `BEGIN TRANSACTION;\n\n`;

      for (const tName of tableNames) {
        const createSql = schemas[tName];
        if (createSql) {
          sqlDump += `-- Estructura de tabla: ${tName}\n`;
          sqlDump += `${createSql};\n\n`;
        }

        const rows = tablesData[tName] || [];
        if (rows.length > 0) {
          sqlDump += `-- Datos de tabla: ${tName} (${rows.length} registros)\n`;
          const firstRow = rows[0];
          const cols = Object.keys(firstRow);
          const colList = cols.map((c) => `"${c}"`).join(', ');

          for (const row of rows) {
            const valList = cols.map((c) => escapeSqlValue(row[c])).join(', ');
            sqlDump += `INSERT OR REPLACE INTO "${tName}" (${colList}) VALUES (${valList});\n`;
          }
          sqlDump += `\n`;
        }
      }

      sqlDump += `COMMIT;\n`;
      sqlDump += `PRAGMA foreign_keys = ON;\n`;
      sqlDump += `-- Fin del Respaldo Oficial\n`;

      const filename = `respaldo_cc_las_llaves_${timestampFile}.sql`;
      return new Response(sqlDump, {
        status: 200,
        headers: {
          'Content-Type': 'application/sql; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
      });
    }

    // FORMATO 2: JSON ESTRUCTURADO (.json - Por Defecto)
    const backupJson = {
      metadata: {
        sistema: 'Consejo Comunal Las Llaves',
        comunidad: 'Urbanización Dr. Alfredo Travieso Paúl',
        parroquia: 'Goaigoaza',
        municipio: 'Puerto Cabello',
        estado: 'Carabobo',
        situr_codigo: '08-11-04-001-0033',
        rif: 'C299916862',
        fecha_respaldo: nowIso,
        generado_por: {
          id: currentUser.id,
          username: currentUser.username,
          nombre: currentUser.nombre,
          rol: currentUser.rol
        },
        motor: 'Turso LibSQL Cloud / SQLite',
        total_tablas: tableNames.length,
        total_registros: totalFilas
      },
      schema: schemas,
      data: tablesData
    };

    const filename = `respaldo_cc_las_llaves_${timestampFile}.json`;
    return new Response(JSON.stringify(backupJson, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });

  } catch (err) {
    console.error('Error al generar respaldo de la base de datos:', err);
    return NextResponse.json({ error: err.message || 'Error interno al generar respaldo' }, { status: 500 });
  }
}

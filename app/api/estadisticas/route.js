import { NextResponse } from 'next/server';
import db from '@/lib/turso';
import { extractUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const currentUser = extractUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 1. Resumen de totales
    const vecinosCountRes = await db.execute(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN estado_aprobacion = 'APROBADO' THEN 1 ELSE 0 END) as aprobados,
        SUM(CASE WHEN estado_aprobacion = 'PENDIENTE' THEN 1 ELSE 0 END) as pendientes
      FROM vecinos
    `);

    const docsCountRes = await db.execute(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN estado = 'VIGENTE' THEN 1 ELSE 0 END) as vigentes,
        SUM(CASE WHEN estado = 'VENCIDO' THEN 1 ELSE 0 END) as vencidos,
        SUM(CASE WHEN estado = 'REVOCADO' THEN 1 ELSE 0 END) as revocados,
        SUM(CASE WHEN es_exonerado = 1 THEN 1 ELSE 0 END) as exonerados,
        SUM(monto_bs) as total_bs,
        SUM(monto_usd) as total_usd
      FROM documentos_solicitudes
    `);

    const censoCountRes = await db.execute('SELECT COUNT(*) as total_planillas, SUM(total_habitantes) as total_habitantes FROM censo_planillas');

    // 2. Gráfico: Horas a las que más descargan / solicitan documentos (0 a 23)
    const horasRes = await db.execute(`
      SELECT hora, COUNT(*) as cantidad
      FROM bitacora_auditoria
      WHERE tipo_evento IN ('DESCARGA_DOCUMENTO', 'SOLICITUD_DOCUMENTO', 'CONSULTA_VALIDADOR')
        AND hora IS NOT NULL
      GROUP BY hora
      ORDER BY hora ASC
    `);

    const horasMap = {};
    for (let h = 0; h < 24; h++) {
      horasMap[h] = 0;
    }
    horasRes.rows.forEach(r => {
      const h = Number(r.hora);
      if (h >= 0 && h < 24) horasMap[h] = Number(r.cantidad);
    });

    const horasDescargas = Object.keys(horasMap).map(h => ({
      hora: `${h.padStart(2, '0')}:00`,
      cantidad: horasMap[h],
    }));

    // 3. Gráfico: Género (Masculino vs Femenino)
    const generoRes = await db.execute(`
      SELECT sexo, COUNT(*) as cantidad
      FROM vecinos
      GROUP BY sexo
    `);

    const generoData = [
      { name: 'Masculino', value: 0, color: '#3b82f6' },
      { name: 'Femenino', value: 0, color: '#ec4899' },
    ];
    generoRes.rows.forEach(r => {
      const s = (r.sexo || '').toUpperCase();
      if (s === 'M') generoData[0].value = Number(r.cantidad);
      else if (s === 'F') generoData[1].value = Number(r.cantidad);
    });

    // 4. Gráfico: Cantidad de usuarios agrupados por edades
    const vecinosNacRes = await db.execute(`SELECT fecha_nacimiento FROM vecinos WHERE fecha_nacimiento IS NOT NULL AND fecha_nacimiento != ''`);
    const hoyYear = new Date().getFullYear();

    const gruposEdades = {
      '0-17': 0,
      '18-30': 0,
      '31-50': 0,
      '51-65': 0,
      '65+': 0,
    };

    vecinosNacRes.rows.forEach(r => {
      const nac = r.fecha_nacimiento;
      let year = null;
      if (nac.includes('-')) {
        year = parseInt(nac.split('-')[0], 10);
      } else if (!isNaN(nac)) {
        year = parseInt(nac, 10);
      }

      if (year && year > 1900 && year <= hoyYear) {
        const edad = hoyYear - year;
        if (edad < 18) gruposEdades['0-17']++;
        else if (edad <= 30) gruposEdades['18-30']++;
        else if (edad <= 50) gruposEdades['31-50']++;
        else if (edad <= 65) gruposEdades['51-65']++;
        else gruposEdades['65+']++;
      } else {
        // Fallback default bracket
        gruposEdades['31-50']++;
      }
    });

    const edadesData = Object.keys(gruposEdades).map(k => ({
      rango: k,
      habitantes: gruposEdades[k],
    }));

    // 5. Gráfico: Distribución por Vereda (A hasta O)
    const veredasRes = await db.execute(`
      SELECT vereda, COUNT(*) as total
      FROM vecinos
      GROUP BY vereda
      ORDER BY vereda ASC
    `);

    const veredasData = veredasRes.rows.map(r => ({
      vereda: `Vereda ${r.vereda}`,
      vecinos: Number(r.total),
    }));

    // 6. Documentos por Tipo
    const tiposDocsRes = await db.execute(`
      SELECT tipo_documento, COUNT(*) as total
      FROM documentos_solicitudes
      GROUP BY tipo_documento
    `);

    return NextResponse.json({
      resumen: {
        vecinos_total: Number(vecinosCountRes.rows[0]?.total || 0),
        vecinos_aprobados: Number(vecinosCountRes.rows[0]?.aprobados || 0),
        vecinos_pendientes: Number(vecinosCountRes.rows[0]?.pendientes || 0),
        documentos_total: Number(docsCountRes.rows[0]?.total || 0),
        documentos_vigentes: Number(docsCountRes.rows[0]?.vigentes || 0),
        documentos_vencidos: Number(docsCountRes.rows[0]?.vencidos || 0),
        documentos_revocados: Number(docsCountRes.rows[0]?.revocados || 0),
        documentos_exonerados: Number(docsCountRes.rows[0]?.exonerados || 0),
        recaudado_bs: Number(docsCountRes.rows[0]?.total_bs || 0),
        recaudado_usd: Number(docsCountRes.rows[0]?.total_usd || 0),
        total_planillas_censo: Number(censoCountRes.rows[0]?.total_planillas || 0),
        total_habitantes_censo: Number(censoCountRes.rows[0]?.total_habitantes || 0),
      },
      graficos: {
        horasDescargas,
        generoData,
        edadesData,
        veredasData,
        tiposDocs: tiposDocsRes.rows,
      }
    });
  } catch (err) {
    console.error('Error en /api/estadisticas GET:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

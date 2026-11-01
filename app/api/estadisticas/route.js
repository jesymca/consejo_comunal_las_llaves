import { NextResponse } from 'next/server';
import db from '@/lib/turso';
import { extractUserFromRequest } from '@/lib/auth';
import { VEREDAS, CASAS_POR_VEREDA, getCasasPorVereda, normalizarCasaVereda, calcularEdad } from '@/lib/territory';
import { asegurarTablaCatalogos } from '@/app/api/catalogos/route';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const currentUser = extractUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const vereda = (searchParams.get('vereda') || '').toUpperCase().trim();
    const casa = (searchParams.get('casa') || '').toUpperCase().trim();

    // Filtros dinámicos por fecha y ubicación territorial
    let docsFilter = ' WHERE 1=1';
    const docsArgs = [];
    if (fechaInicio && fechaFin) {
      docsFilter += ' AND fecha_emision >= ? AND fecha_emision <= ?';
      docsArgs.push(fechaInicio, fechaFin);
    } else if (fechaInicio) {
      docsFilter += ' AND fecha_emision >= ?';
      docsArgs.push(fechaInicio);
    } else if (fechaFin) {
      docsFilter += ' AND fecha_emision <= ?';
      docsArgs.push(fechaFin);
    }
    if (vereda) {
      docsFilter += ' AND UPPER(vereda) = ?';
      docsArgs.push(vereda);
    }
    if (casa) {
      docsFilter += ' AND UPPER(casa) = ?';
      docsArgs.push(casa);
    }

    let vecinosFilter = ' WHERE 1=1';
    const vecinosArgs = [];
    if (vereda) {
      vecinosFilter += ' AND UPPER(vereda) = ?';
      vecinosArgs.push(vereda);
    }
    if (casa) {
      vecinosFilter += ' AND UPPER(casa) = ?';
      vecinosArgs.push(casa);
    }

    let censoFilter = ' WHERE 1=1';
    const censoArgs = [];
    if (vereda) {
      censoFilter += ' AND UPPER(calle_vereda_av) = ?';
      censoArgs.push(vereda);
    }
    if (casa) {
      censoFilter += ' AND UPPER(numero_casa) = ?';
      censoArgs.push(casa);
    }

    // 1. Resumen de totales
    const vecinosCountRes = await db.execute({
      sql: `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN estado_aprobacion = 'APROBADO' THEN 1 ELSE 0 END) as aprobados,
        SUM(CASE WHEN estado_aprobacion = 'PENDIENTE' THEN 1 ELSE 0 END) as pendientes
      FROM vecinos ${vecinosFilter}`,
      args: vecinosArgs
    });

    const docsCountRes = await db.execute({
      sql: `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN estado = 'VIGENTE' THEN 1 ELSE 0 END) as vigentes,
        SUM(CASE WHEN estado = 'VENCIDO' THEN 1 ELSE 0 END) as vencidos,
        SUM(CASE WHEN estado = 'REVOCADO' THEN 1 ELSE 0 END) as revocados,
        SUM(CASE WHEN es_exonerado = 1 THEN 1 ELSE 0 END) as exonerados,
        SUM(monto_bs) as total_bs,
        SUM(monto_usd) as total_usd
      FROM documentos_solicitudes ${docsFilter}`,
      args: docsArgs
    });

    const censoCountRes = await db.execute({
      sql: `SELECT COUNT(*) as total_planillas, SUM(total_habitantes) as total_habitantes FROM censo_planillas ${censoFilter}`,
      args: censoArgs
    });

    // Métrica Territorial: Conteo real de casas, divisiones familiares y cobertura
    let totalCasasTerritorio = 0;
    let totalCasasSubdivididas = 0;
    try {
      if (casa) {
        totalCasasTerritorio = 1;
        totalCasasSubdivididas = /[A-Z]$/.test(casa) ? 1 : 0;
      } else if (vereda) {
        const tcRes = await db.execute({
          sql: 'SELECT casa FROM territorio_casas WHERE UPPER(vereda) = ? AND activo = 1',
          args: [vereda]
        });
        totalCasasTerritorio = tcRes.rows.length;
        totalCasasSubdivididas = tcRes.rows.filter(r => /[A-Z]$/.test(r.casa) || /-[A-Z0-9]+$/.test(String(r.casa).replace(/^[A-Z]-\d+/, ''))).length;
        if (!totalCasasTerritorio) {
          totalCasasTerritorio = CASAS_POR_VEREDA[vereda]?.length || 0;
        }
      } else {
        const tcRes = await db.execute('SELECT casa FROM territorio_casas WHERE activo = 1');
        totalCasasTerritorio = tcRes.rows.length;
        totalCasasSubdivididas = tcRes.rows.filter(r => /[A-Z]$/.test(r.casa) || /-[A-Z0-9]+$/.test(String(r.casa).replace(/^[A-Z]-\d+/, ''))).length;
      }
    } catch {
      totalCasasTerritorio = vereda
        ? (CASAS_POR_VEREDA[vereda]?.length || 0)
        : Object.values(CASAS_POR_VEREDA).reduce((acc, arr) => acc + arr.length, 0);
    }

    let casasCensadasUnicas = 0;
    try {
      const ccuRes = await db.execute({
        sql: `SELECT COUNT(DISTINCT calle_vereda_av || "-" || numero_casa) as total FROM censo_planillas ${censoFilter}`,
        args: censoArgs
      });
      casasCensadasUnicas = Number(ccuRes.rows[0]?.total || 0);
    } catch {}

    let casasConVecinos = 0;
    try {
      const ccvRes = await db.execute({
        sql: `SELECT COUNT(DISTINCT vereda || "-" || casa) as total FROM vecinos ${vecinosFilter}`,
        args: vecinosArgs
      });
      casasConVecinos = Number(ccvRes.rows[0]?.total || 0);
    } catch {}

    // Total de locales comerciales registrados
    let totalLocales = 0;
    try {
      let locSql = 'SELECT COUNT(*) as total FROM locales_comerciales_viviendas WHERE 1=1';
      const locArgs = [];
      if (vereda) { locSql += ' AND UPPER(vereda) = ?'; locArgs.push(vereda); }
      if (casa) { locSql += ' AND UPPER(casa) = ?'; locArgs.push(casa); }
      const locRes = await db.execute({ sql: locSql, args: locArgs });
      totalLocales = Number(locRes.rows[0]?.total || 0);
    } catch {
      totalLocales = 0;
    }

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
    const generoRes = await db.execute({
      sql: `SELECT sexo, COUNT(*) as cantidad FROM vecinos ${vecinosFilter} GROUP BY sexo`,
      args: vecinosArgs
    });

    const generoData = [
      { name: 'Masculino', value: 0, color: '#3b82f6' },
      { name: 'Femenino', value: 0, color: '#ec4899' },
    ];
    generoRes.rows.forEach(r => {
      const s = String(r.sexo || '').toUpperCase().trim();
      if (s === 'M' || s.startsWith('MAS') || s === 'HOMBRE') generoData[0].value += Number(r.cantidad);
      else if (s === 'F' || s.startsWith('FEM') || s === 'MUJER') generoData[1].value += Number(r.cantidad);
    });

    // 4. Gráfico: Cantidad de usuarios agrupados por edades y rangos demográficos
    const vecinosNacRes = await db.execute({
      sql: `SELECT fecha_nacimiento FROM vecinos ${vecinosFilter} AND fecha_nacimiento IS NOT NULL AND fecha_nacimiento != ''`,
      args: vecinosArgs
    });

    const gruposEdades = {
      '0-17': 0,
      '18-30': 0,
      '31-50': 0,
      '51-65': 0,
      '65+': 0,
    };

    const gruposDetalle = {
      '0-12': 0,  // Infantes / Niños
      '13-17': 0, // Adolescentes
      '18-29': 0, // Jóvenes
      '30-59': 0, // Adultos
      '60+': 0,   // Adultos Mayores
    };

    let totalMenores = 0;
    let totalAdultos = 0;
    let totalMayores = 0;

    vecinosNacRes.rows.forEach(r => {
      const edad = calcularEdad(r.fecha_nacimiento);
      if (edad !== null && edad !== undefined) {
        if (edad < 18) {
          gruposEdades['0-17']++;
          totalMenores++;
          if (edad <= 12) gruposDetalle['0-12']++;
          else gruposDetalle['13-17']++;
        } else if (edad <= 30) {
          gruposEdades['18-30']++;
          if (edad <= 29) gruposDetalle['18-29']++;
          else gruposDetalle['30-59']++;
          if (edad < 60) totalAdultos++; else totalMayores++;
        } else if (edad <= 50) {
          gruposEdades['31-50']++;
          gruposDetalle['30-59']++;
          totalAdultos++;
        } else if (edad <= 65) {
          gruposEdades['51-65']++;
          if (edad < 60) {
            gruposDetalle['30-59']++;
            totalAdultos++;
          } else {
            gruposDetalle['60+']++;
            totalMayores++;
          }
        } else {
          gruposEdades['65+']++;
          gruposDetalle['60+']++;
          totalMayores++;
        }
      } else {
        // Fallback default
        gruposEdades['31-50']++;
        gruposDetalle['30-59']++;
        totalAdultos++;
      }
    });

    const edadesData = Object.keys(gruposEdades).map(k => ({
      rango: k,
      habitantes: gruposEdades[k],
    }));

    // 5. Cobertura Territorial Integral por Vereda (A hasta O) con desglose demográfico
    let censoHabitantesPorVeredaRes = { rows: [] };
    try {
      censoHabitantesPorVeredaRes = await db.execute(`
        SELECT UPPER(TRIM(p.calle_vereda_av)) as vereda, h.cedula
        FROM censo_planillas p
        JOIN censo_habitantes h ON h.planilla_id = p.id
      `);
    } catch (e) {
      console.warn('Error consultando censo_habitantes por vereda:', e);
    }

    let censoPorVeredaRes = { rows: [] };
    try {
      censoPorVeredaRes = await db.execute(`
        SELECT UPPER(TRIM(calle_vereda_av)) as vereda, COUNT(DISTINCT numero_casa) as casas_censadas, SUM(total_habitantes) as habitantes
        FROM censo_planillas
        GROUP BY UPPER(TRIM(calle_vereda_av))
      `);
    } catch {}

    const censoPorVeredaMap = {};
    censoPorVeredaRes.rows.forEach(r => {
      if (r.vereda) {
        censoPorVeredaMap[r.vereda] = {
          casas_censadas: Number(r.casas_censadas || 0),
          habitantes: Number(r.habitantes || 0),
        };
      }
    });

    // Vecinos registrados en la plataforma con desglose de género y edad por vereda
    const veredasVecinosRes = await db.execute(`
      SELECT UPPER(TRIM(vereda)) as vereda, casa, cedula, sexo, fecha_nacimiento
      FROM vecinos
    `);

    const veredasMap = {};
    VEREDAS.forEach(v => {
      veredasMap[v] = {
        censo_count: 0,
        vecinos_count: 0,
        cedulas_vistas: new Set(),
        habitantes_sin_cedula: 0,
        mujeres: 0,
        hombres: 0,
        menores: 0,
        adultos: 0,
        adultos_mayores: 0,
        casas_ocupadas_set: new Set(),
      };
    });

    censoHabitantesPorVeredaRes.rows.forEach(r => {
      const v = r.vereda;
      if (v && veredasMap[v]) {
        veredasMap[v].censo_count++;
        const ced = String(r.cedula || '').trim().toUpperCase();
        if (ced) veredasMap[v].cedulas_vistas.add(ced);
        else veredasMap[v].habitantes_sin_cedula++;
      }
    });

    veredasVecinosRes.rows.forEach(r => {
      const v = String(r.vereda || '').toUpperCase().trim();
      if (v && veredasMap[v]) {
        veredasMap[v].vecinos_count++;
        if (r.casa) veredasMap[v].casas_ocupadas_set.add(String(r.casa).toUpperCase().trim());

        const ced = String(r.cedula || '').trim().toUpperCase();
        if (ced) veredasMap[v].cedulas_vistas.add(ced);

        const s = String(r.sexo || '').toUpperCase();
        if (s === 'F' || s.startsWith('FEM') || s === 'MUJER') veredasMap[v].mujeres++;
        else if (s === 'M' || s.startsWith('MAS') || s === 'HOMBRE') veredasMap[v].hombres++;

        const edad = calcularEdad(r.fecha_nacimiento);
        if (edad !== null && edad !== undefined) {
          if (edad < 18) veredasMap[v].menores++;
          else if (edad < 60) veredasMap[v].adultos++;
          else veredasMap[v].adultos_mayores++;
        }
      }
    });

    let casasPorVeredaRes = { rows: [] };
    try {
      casasPorVeredaRes = await db.execute(`
        SELECT UPPER(TRIM(vereda)) as vereda, COUNT(*) as total_casas
        FROM territorio_casas
        WHERE activo = 1
        GROUP BY UPPER(TRIM(vereda))
      `);
    } catch {}
    const casasPorVeredaMap = {};
    casasPorVeredaRes.rows.forEach(r => {
      if (r.vereda) casasPorVeredaMap[r.vereda] = Number(r.total_casas || 0);
    });

    const veredasData = VEREDAS.map(v => {
      const vInfo = veredasMap[v] || {
        censo_count: 0, vecinos_count: 0, cedulas_vistas: new Set(), habitantes_sin_cedula: 0,
        mujeres: 0, hombres: 0, menores: 0, adultos: 0, adultos_mayores: 0, casas_ocupadas_set: new Set()
      };
      const habsConsolidados = Math.max(
        vInfo.censo_count,
        vInfo.cedulas_vistas.size + vInfo.habitantes_sin_cedula
      );

      return {
        vereda: `Vereda ${v}`,
        codigo: v,
        habitantes: habsConsolidados,
        habitantes_censo: vInfo.censo_count || (censoPorVeredaMap[v]?.habitantes || 0),
        vecinos: vInfo.vecinos_count,
        casas: casasPorVeredaMap[v] || (CASAS_POR_VEREDA[v]?.length || 0),
        casas_censadas: censoPorVeredaMap[v]?.casas_censadas || 0,
        casas_ocupadas: vInfo.casas_ocupadas_set.size,
        mujeres: vInfo.mujeres,
        hombres: vInfo.hombres,
        menores: vInfo.menores,
        adultos: vInfo.adultos,
        adultos_mayores: vInfo.adultos_mayores,
      };
    });

    // 5.5 DESGLOSE DETALLADO CASA POR CASA (Para la vereda seleccionada o general)
    let desgloseCasas = [];
    try {
      let queryVecinosDetalle = `
        SELECT id, cedula, nombres, apellidos, vereda, casa, sexo, fecha_nacimiento, estado_aprobacion
        FROM vecinos ${vecinosFilter}
        ORDER BY casa ASC, id ASC
      `;
      const vecinosDetalleRes = await db.execute({ sql: queryVecinosDetalle, args: vecinosArgs });

      let queryCensoDetalle = `
        SELECT id, numero_planilla, calle_vereda_av, numero_casa, total_habitantes, total_familias
        FROM censo_planillas ${censoFilter}
      `;
      const censoDetalleRes = await db.execute({ sql: queryCensoDetalle, args: censoArgs });

      const censoPorCasaMap = {};
      censoDetalleRes.rows.forEach(cp => {
        const v = String(cp.calle_vereda_av || '').trim().toUpperCase();
        const c = normalizarCasaVereda(v, cp.numero_casa);
        censoPorCasaMap[`${v}_${c}`] = cp;
      });

      let casasBase = [];
      if (vereda) {
        casasBase = getCasasPorVereda(vereda);
      }

      const casasMap = new Map();
      casasBase.forEach(c => {
        const norm = normalizarCasaVereda(vereda, c);
        casasMap.set(norm, {
          casa: norm,
          vereda: vereda,
          total_vecinos: 0,
          mujeres: 0,
          hombres: 0,
          menores: 0,
          adultos: 0,
          adultos_mayores: 0,
          aprobados: 0,
          pendientes: 0,
          tiene_censo: false,
          numero_planilla: null,
          total_habitantes_censo: 0,
          habitantes_nombres: [],
        });
      });

      vecinosDetalleRes.rows.forEach(v => {
        const vVer = String(v.vereda || '').trim().toUpperCase();
        const vCasa = normalizarCasaVereda(vVer, v.casa);
        if (!vCasa) return;

        if (!casasMap.has(vCasa)) {
          casasMap.set(vCasa, {
            casa: vCasa,
            vereda: vVer,
            total_vecinos: 0,
            mujeres: 0,
            hombres: 0,
            menores: 0,
            adultos: 0,
            adultos_mayores: 0,
            aprobados: 0,
            pendientes: 0,
            tiene_censo: false,
            numero_planilla: null,
            total_habitantes_censo: 0,
            habitantes_nombres: [],
          });
        }

        const item = casasMap.get(vCasa);
        item.total_vecinos++;
        const s = String(v.sexo || '').toUpperCase();
        if (s === 'F' || s.startsWith('FEM') || s === 'MUJER') item.mujeres++;
        else if (s === 'M' || s.startsWith('MAS') || s === 'HOMBRE') item.hombres++;

        if (v.estado_aprobacion === 'APROBADO') item.aprobados++;
        else if (v.estado_aprobacion === 'PENDIENTE') item.pendientes++;

        const edad = calcularEdad(v.fecha_nacimiento);
        if (edad !== null) {
          if (edad < 18) item.menores++;
          else if (edad < 60) item.adultos++;
          else item.adultos_mayores++;
        }

        if (item.habitantes_nombres.length < 5) {
          item.habitantes_nombres.push(`${v.nombres || ''} ${v.apellidos || ''} (${v.cedula})`.trim());
        }
      });

      // Enlazar datos de censo a cada casa
      casasMap.forEach((item) => {
        const cp = censoPorCasaMap[`${item.vereda}_${item.casa}`];
        if (cp) {
          item.tiene_censo = true;
          item.numero_planilla = cp.numero_planilla;
          item.total_habitantes_censo = Number(cp.total_habitantes || 0);
        }
      });

      desgloseCasas = Array.from(casasMap.values()).sort((a, b) => {
        const numA = parseInt((a.casa.match(/\d+/) || [0])[0], 10);
        const numB = parseInt((b.casa.match(/\d+/) || [0])[0], 10);
        if (numA !== numB) return numA - numB;
        return a.casa.localeCompare(b.casa);
      });
    } catch (e) {
      console.warn('Error calculando desgloseCasas:', e);
    }

    // 6. Catálogos Oficiales Dinámicos (Parentesco, Instrucción, Salud desde #configuracion)
    await asegurarTablaCatalogos();
    let catalogosRes = { rows: [] };
    try {
      catalogosRes = await db.execute(`
        SELECT id, tipo, codigo, descripcion, orden
        FROM catalogos_sistema
        WHERE activo = 1
        ORDER BY tipo ASC, orden ASC, codigo ASC
      `);
    } catch {}

    const catParentesco = catalogosRes.rows.filter(r => r.tipo === 'parentesco');
    const catInstruccion = catalogosRes.rows.filter(r => r.tipo === 'instruccion');
    const catSalud = catalogosRes.rows.filter(r => r.tipo === 'salud');

    // Cargar habitantes censados y observaciones de vecinos con filtro territorial
    let habRes = { rows: [] };
    try {
      let habSql = `
        SELECT h.cedula, h.parentesco, h.instruccion, h.salud
        FROM censo_habitantes h
        JOIN censo_planillas p ON h.planilla_id = p.id
      `;
      const habArgs = [];
      if (vereda) {
        habSql += ' WHERE UPPER(p.calle_vereda_av) = ?';
        habArgs.push(vereda);
        if (casa) {
          habSql += ' AND UPPER(p.numero_casa) = ?';
          habArgs.push(casa);
        }
      }
      habRes = await db.execute({ sql: habSql, args: habArgs });
    } catch {}

    let vecObsRes = { rows: [] };
    try {
      vecObsRes = await db.execute({ sql: `SELECT cedula, observaciones FROM vecinos ${vecinosFilter}`, args: vecinosArgs });
    } catch {}

    const cedulasVistas = new Set();
    const personasDemografia = [];

    for (const h of habRes.rows || []) {
      const ced = String(h.cedula || '').trim().toUpperCase();
      if (ced) cedulasVistas.add(ced);
      personasDemografia.push({
        parentesco: h.parentesco,
        instruccion: h.instruccion,
        salud: h.salud,
      });
    }

    for (const v of vecObsRes.rows || []) {
      const ced = String(v.cedula || '').trim().toUpperCase();
      if (ced && cedulasVistas.has(ced)) continue;
      if (v.observaciones) {
        try {
          let jsonStr = String(v.observaciones);
          if (jsonStr.includes('{') && jsonStr.includes('}')) {
            const match = jsonStr.match(/\{.*\}/);
            if (match) jsonStr = match[0];
          }
          const parsed = JSON.parse(jsonStr);
          if (parsed && typeof parsed === 'object') {
            personasDemografia.push({
              parentesco: parsed.parentesco || parsed.fam_parentesco,
              instruccion: parsed.nivel_instruccion || parsed.instruccion,
              salud: parsed.condicion_salud || parsed.salud,
            });
          }
        } catch {}
      }
    }

    // Función de coincidencia tolerante con códigos (ej. 'a') y descripciones (ej. 'Jefe(a)')
    function coincideCatalogo(val, item) {
      if (!val) return false;
      const str = String(val).toLowerCase().trim();
      const c = String(item.codigo || '').toLowerCase().trim();
      const d = String(item.descripcion || '').toLowerCase().trim();
      if (!c && !d) return false;
      if (c && str === c) return true;
      if (d && str === d) return true;
      if (c && (str.startsWith(`${c}-`) || str.startsWith(`${c} -`))) return true;
      if (d && str.includes(d)) return true;
      return false;
    }

    const paletteParentesco = ['#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#14b8a6', '#0ea5e9'];
    const paletteInstruccion = ['#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#f59e0b', '#84cc16', '#22c55e', '#38bdf8'];
    const paletteSalud = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#10b981', '#64748b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

    const parentescoData = catParentesco.map((cat, idx) => {
      const cantidad = personasDemografia.filter(p => coincideCatalogo(p.parentesco, cat)).length;
      return {
        id: cat.id,
        codigo: cat.codigo,
        descripcion: cat.descripcion,
        name: `${cat.codigo.toUpperCase()} - ${cat.descripcion}`,
        label: cat.descripcion,
        cantidad,
        color: paletteParentesco[idx % paletteParentesco.length],
      };
    });

    const instruccionData = catInstruccion.map((cat, idx) => {
      const cantidad = personasDemografia.filter(p => coincideCatalogo(p.instruccion, cat)).length;
      return {
        id: cat.id,
        codigo: cat.codigo,
        descripcion: cat.descripcion,
        name: `${cat.codigo.toUpperCase()} - ${cat.descripcion}`,
        label: cat.descripcion,
        cantidad,
        color: paletteInstruccion[idx % paletteInstruccion.length],
      };
    });

    const saludData = catSalud.map((cat, idx) => {
      const cantidad = personasDemografia.filter(p => coincideCatalogo(p.salud, cat)).length;
      return {
        id: cat.id,
        codigo: cat.codigo,
        descripcion: cat.descripcion,
        name: `${cat.codigo.toUpperCase()} - ${cat.descripcion}`,
        label: cat.descripcion,
        cantidad,
        color: paletteSalud[idx % paletteSalud.length],
      };
    });

    // 7. Documentos por Tipo con Recaudación asociada
    const tiposDocsRes = await db.execute({
      sql: `SELECT
        tipo_documento,
        COUNT(*) as total,
        SUM(monto_bs) as total_bs,
        SUM(monto_usd) as total_usd,
        SUM(CASE WHEN es_exonerado = 1 THEN 1 ELSE 0 END) as exonerados
      FROM documentos_solicitudes ${docsFilter}
      GROUP BY tipo_documento
      ORDER BY total DESC`,
      args: docsArgs
    });

    const coloresTipos = {
      RESIDENCIA: '#3b82f6',
      BUENA_CONDUCTA: '#f59e0b',
      FALLECIMIENTO: '#ef4444',
      FUNCIONAMIENTO: '#6366f1',
    };

    const tiposDocsData = tiposDocsRes.rows.map((r, idx) => {
      const code = String(r.tipo_documento).toUpperCase();
      let nombreLimpio = code;
      if (code === 'RESIDENCIA') nombreLimpio = 'Residencia';
      else if (code === 'BUENA_CONDUCTA') nombreLimpio = 'Buena Conducta';
      else if (code === 'FALLECIMIENTO') nombreLimpio = 'Fallecimiento';
      else if (code === 'FUNCIONAMIENTO') nombreLimpio = 'Funcionamiento';

      return {
        tipo: nombreLimpio,
        tipo_documento: code,
        total: Number(r.total),
        total_bs: Number(r.total_bs || 0),
        total_usd: Number(r.total_usd || 0),
        exonerados: Number(r.exonerados || 0),
        color: coloresTipos[code] || ['#10b981', '#8b5cf6', '#06b6d4', '#ec4899'][idx % 4]
      };
    });

    // 7. Gráfico: Estados de Documentos
    const estadosData = [
      { name: 'Vigentes', value: Number(docsCountRes.rows[0]?.vigentes || 0), color: '#10b981' },
      { name: 'Vencidos', value: Number(docsCountRes.rows[0]?.vencidos || 0), color: '#f59e0b' },
      { name: 'Revocados', value: Number(docsCountRes.rows[0]?.revocados || 0), color: '#ef4444' },
      { name: 'Exonerados', value: Number(docsCountRes.rows[0]?.exonerados || 0), color: '#8b5cf6' },
    ].filter(e => e.value > 0);

    return NextResponse.json({
      resumen: {
        vereda_seleccionada: vereda || null,
        casa_seleccionada: casa || null,
        vecinos_total: Number(vecinosCountRes.rows[0]?.total || 0),
        vecinos_aprobados: Number(vecinosCountRes.rows[0]?.aprobados || 0),
        vecinos_pendientes: Number(vecinosCountRes.rows[0]?.pendientes || 0),
        mujeres_total: generoData.find(g => g.name === 'Femenino')?.value || 0,
        hombres_total: generoData.find(g => g.name === 'Masculino')?.value || 0,
        menores_total: totalMenores,
        adultos_total: totalAdultos,
        adultos_mayores_total: totalMayores,
        documentos_total: Number(docsCountRes.rows[0]?.total || 0),
        documentos_vigentes: Number(docsCountRes.rows[0]?.vigentes || 0),
        documentos_vencidos: Number(docsCountRes.rows[0]?.vencidos || 0),
        documentos_revocados: Number(docsCountRes.rows[0]?.revocados || 0),
        documentos_exonerados: Number(docsCountRes.rows[0]?.exonerados || 0),
        recaudado_bs: Number(docsCountRes.rows[0]?.total_bs || 0),
        recaudado_usd: Number(docsCountRes.rows[0]?.total_usd || 0),
        total_planillas_censo: Number(censoCountRes.rows[0]?.total_planillas || 0),
        total_habitantes_censo: Number(censoCountRes.rows[0]?.total_habitantes || 0),
        total_locales_comerciales: totalLocales,
        total_casas_territorio: totalCasasTerritorio,
        total_casas_subdivididas: totalCasasSubdivididas,
        casas_censadas: casasCensadasUnicas,
        casas_con_vecinos: casasConVecinos,
        total_personas_demografia: personasDemografia.length,
        total_catalogos_activos: catalogosRes.rows.length,
      },
      graficos: {
        horasDescargas,
        generoData,
        edadesData,
        gruposDetalle,
        veredasData,
        desgloseCasas,
        parentescoData,
        instruccionData,
        saludData,
        tiposDocs: tiposDocsData,
        estadosDocs: estadosData,
      }
    });
  } catch (err) {
    console.error('Error en /api/estadisticas GET:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

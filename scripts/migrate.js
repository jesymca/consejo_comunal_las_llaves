import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

const url = process.env.TURSO_DATABASE_URL || 'libsql://lasllaves-herrejose.aws-ap-northeast-1.turso.io';
const authToken = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTEzMjMyMzUsImlkIjoiMDFhMTEzMmYtMmMwMS03ZGMwLThmNWMtODQyZWJiZTVlMjVhIiwia2lkIjoidnM2Yl9rSmo5eXJSQkdqMXQ0WWhBUnlWcVg0Tmx6LXp2elhYeHVLQnV6RSIsInJpZCI6ImM2OTkxOTA5LTg4YjItNDMyYi1iMjQ0LTIwOTllYmRkZjMzZiJ9.hvthanE7lifqQS6NDJDCH7TQgy7x1iPpouEtfEj0sx7nLE_IMTgcTmMjLOm08DBWr1p3gUH8jGqzri_FPV5DAw';

const db = createClient({ url, authToken });

async function migrate() {
  console.log('--- Iniciando migración a Turso LibSQL ---');

  const statements = [
    // 1. Tabla Usuarios
    `CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nombre TEXT NOT NULL,
      email TEXT,
      telefono TEXT,
      rol TEXT NOT NULL DEFAULT 'ADMIN',
      comision TEXT,
      permisos TEXT,
      activo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,

    // 2. Tabla Bancos
    `CREATE TABLE IF NOT EXISTS bancos (
      id INTEGER PRIMARY KEY,
      banco TEXT NOT NULL
    );`,

    // 3. Tabla Veredas y Casas
    `CREATE TABLE IF NOT EXISTS veredas_casas (
      vereda TEXT NOT NULL,
      casa TEXT NOT NULL,
      PRIMARY KEY (vereda, casa)
    );`,

    // 4. Tabla Vecinos
    `CREATE TABLE IF NOT EXISTS vecinos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cedula TEXT UNIQUE NOT NULL,
      nombres TEXT NOT NULL,
      apellidos TEXT NOT NULL,
      vereda TEXT NOT NULL,
      casa TEXT NOT NULL,
      tiempo_residencia TEXT,
      calidad_tenencia TEXT,
      telefono TEXT,
      email TEXT,
      sexo TEXT DEFAULT 'M',
      fecha_nacimiento TEXT,
      estado_aprobacion TEXT NOT NULL DEFAULT 'PENDIENTE',
      aprobado_por_usuario_id INTEGER,
      aprobado_por_nombre TEXT,
      aprobado_en TEXT,
      observaciones TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,

    // 5. Tabla Censo Planillas (Instrumento de Censo Sociodemográfico)
    `CREATE TABLE IF NOT EXISTS censo_planillas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_planilla TEXT UNIQUE NOT NULL,
      fecha TEXT NOT NULL,
      empadronador_nombre TEXT,
      empadronador_usuario_id INTEGER,
      calle_vereda_av TEXT NOT NULL,
      numero_casa TEXT NOT NULL,
      telefono_contacto TEXT,
      tenencia_vivienda TEXT,
      tiempo_residencia_desde TEXT,
      total_familias INTEGER DEFAULT 1,
      total_habitantes INTEGER DEFAULT 1,
      observaciones TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,

    // 6. Tabla Censo Habitantes
    `CREATE TABLE IF NOT EXISTS censo_habitantes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      planilla_id INTEGER NOT NULL,
      numero_habitante INTEGER NOT NULL,
      numero_familia INTEGER DEFAULT 1,
      nombres_apellidos TEXT NOT NULL,
      cedula TEXT,
      sexo TEXT,
      fecha_nacimiento TEXT,
      parentesco TEXT,
      instruccion TEXT,
      profesion_ocupacion TEXT,
      salud TEXT,
      telefono_movil TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(planilla_id) REFERENCES censo_planillas(id) ON DELETE CASCADE
    );`,

    // 7. Tabla Documentos y Solicitudes
    `CREATE TABLE IF NOT EXISTS documentos_solicitudes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo_qr TEXT UNIQUE NOT NULL,
      tipo_documento TEXT NOT NULL,
      vecino_id INTEGER NOT NULL,
      cedula TEXT NOT NULL,
      nombres_apellidos TEXT NOT NULL,
      vereda TEXT NOT NULL,
      casa TEXT NOT NULL,
      tiempo_residencia TEXT,
      vigencia_dias INTEGER NOT NULL DEFAULT 60,
      fecha_emision TEXT NOT NULL,
      fecha_vencimiento TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'VIGENTE',
      renovado_de_codigo TEXT,
      banco_origen_id INTEGER,
      banco_nombre TEXT,
      numero_transferencia TEXT,
      monto_bs REAL,
      monto_usd REAL,
      tasa_bcv REAL,
      fecha_pago TEXT,
      es_exonerado INTEGER NOT NULL DEFAULT 0,
      motivo_exoneracion TEXT,
      aprobado_por_usuario_id INTEGER,
      aprobado_por_nombre TEXT,
      aprobado_en TEXT,
      datos_extra_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,

    // 8. Tabla Firmas y Sellos Autorizados
    `CREATE TABLE IF NOT EXISTS firmas_sellos (
      id INTEGER PRIMARY KEY,
      orden INTEGER NOT NULL,
      comision TEXT NOT NULL,
      nombre TEXT NOT NULL,
      cedula TEXT NOT NULL,
      telefono TEXT NOT NULL,
      url_firma TEXT,
      url_sello TEXT,
      usar_sello_principal INTEGER NOT NULL DEFAULT 1,
      activo INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );`,

    // 9. Tabla Configuración del Sistema
    `CREATE TABLE IF NOT EXISTS configuracion_sistema (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL,
      descripcion TEXT,
      updated_at TEXT NOT NULL
    );`,

    // 10. Tabla Plantillas del Modelador
    `CREATE TABLE IF NOT EXISTS documentos_plantillas (
      id TEXT PRIMARY KEY,
      titulo TEXT NOT NULL,
      subtitulo TEXT,
      cuerpo_template TEXT NOT NULL,
      encabezado_svg TEXT,
      pie_svg TEXT,
      updated_at TEXT NOT NULL
    );`,

    // 11. Tabla Bitácora de Auditoría
    `CREATE TABLE IF NOT EXISTS bitacora_auditoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo_evento TEXT NOT NULL,
      usuario_id INTEGER,
      usuario_nombre TEXT,
      vecino_id INTEGER,
      cedula TEXT,
      codigo_documento TEXT,
      tipo_documento TEXT,
      ip TEXT,
      user_agent TEXT,
      hora INTEGER,
      fecha TEXT,
      detalles TEXT,
      created_at TEXT NOT NULL
    );`,

    // 12. Tabla Catálogos del Sistema (Parentesco, Instrucción, Salud)
    `CREATE TABLE IF NOT EXISTS catalogos_sistema (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL,
      codigo TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      orden INTEGER NOT NULL DEFAULT 1,
      activo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(tipo, codigo)
    );`,

    // 13. Tabla Locales Comerciales en Viviendas (Alquiler / Carta de Funcionamiento)
    `CREATE TABLE IF NOT EXISTS locales_comerciales_viviendas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      propietario_cedula TEXT NOT NULL,
      propietario_nombres TEXT NOT NULL,
      vereda TEXT NOT NULL,
      casa TEXT NOT NULL,
      nombre_comercio TEXT NOT NULL,
      rif_comercio TEXT NOT NULL,
      tamano_espacio TEXT NOT NULL,
      rubro_establecimiento TEXT NOT NULL,
      fecha_inicio_alquiler TEXT NOT NULL,
      documento_solicitud_id INTEGER,
      codigo_documento TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`
  ];

  for (const sql of statements) {
    await db.execute(sql);
  }
  console.log('Tablas creadas correctamente.');

  // Semilla de Super Administrador (CIENCIA_TECNOLOGIA / CYT_01012023)
  const passwordHash = await bcrypt.hash('CYT_01012023', 10);
  const now = new Date().toISOString();
  const superPermisos = JSON.stringify({
    censo_read: true,
    censo_write: true,
    vecinos_approve: true,
    vecinos_crud: true,
    docs_manage: true,
    docs_approve: true,
    firmas_manage: true,
    modelador_manage: true,
    usuarios_manage: true,
    config_manage: true,
  });

  await db.execute({
    sql: `INSERT INTO usuarios (username, password_hash, nombre, rol, comision, permisos, activo, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(username) DO UPDATE SET
        password_hash = excluded.password_hash,
        permisos = excluded.permisos,
        updated_at = excluded.updated_at;`,
    args: [
      'CIENCIA_TECNOLOGIA',
      passwordHash,
      'Super Administrador Ciencia y Tecnología',
      'SUPER_ADMIN',
      'Comisión de Tecnología e Innovación',
      superPermisos,
      now,
      now,
    ],
  });
  console.log('Usuario SUPER_ADMIN configurado: CIENCIA_TECNOLOGIA');

  // Semilla de Bancos
  const bancos = [
    [1, "100% Banco"],
    [2, "Bancamiga"],
    [3, "Banco Activo"],
    [4, "Banco Agrícola de Venezuela"],
    [5, "Banco Caroní"],
    [6, "Banco de Comercio Exterior (BANCOEX)"],
    [7, "Banco de Desarrollo Económico y Social (BANDES)"],
    [8, "Banco de la Fuerza Armada Nacional Bolivariana (BANFANB)"],
    [9, "Banco de la Gente Emprendedora (Bangente)"],
    [10, "Banco de Venezuela"],
    [11, "Banco del Caribe (Bancaribe)"],
    [12, "Banco del Tesoro"],
    [13, "Banco Digital de los Trabajadores"],
    [14, "Banco Exterior"],
    [15, "Banco Internacional de Desarrollo"],
    [16, "Banco Nacional de Crédito (BNC)"],
    [17, "Banco Nacional de Vivienda y Hábitat (BANAVIH)"],
    [18, "Banco Plaza"],
    [19, "Banco Provincial"],
    [20, "Banco Sofitasa"],
    [21, "Bancrecer"],
    [22, "Banesco"],
    [23, "Banplus"],
    [24, "BFC Banco Fondo Común"],
    [25, "Del Sur Banco Universal"],
    [26, "Instituto Municipal de Crédito Popular (IMCP)"],
    [27, "Mercantil"],
    [28, "N58 Banco Digital"],
    [29, "R4 Banco Microfinanciero"],
    [30, "Venezolano de Crédito"]
  ];

  for (const [id, banco] of bancos) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO bancos (id, banco) VALUES (?, ?);`,
      args: [id, banco]
    });
  }
  console.log('30 Bancos registrados con éxito.');

  // Semilla de Veredas y Casas según el plano y lista estricta
  const veredasCasas = [];
  // A: A-8, A-10, A-12, A-14, A-16, A-18
  ['A-8', 'A-10', 'A-12', 'A-14', 'A-16', 'A-18'].forEach(c => veredasCasas.push(['A', c]));
  // B: B-1 hasta B-18
  for (let i = 1; i <= 18; i++) veredasCasas.push(['B', `B-${i}`]);
  // C: C-1 hasta C-18
  for (let i = 1; i <= 18; i++) veredasCasas.push(['C', `C-${i}`]);
  // D: D-1 hasta D-18
  for (let i = 1; i <= 18; i++) veredasCasas.push(['D', `D-${i}`]);
  // E: E-5 hasta E-18
  for (let i = 5; i <= 18; i++) veredasCasas.push(['E', `E-${i}`]);
  // F: F-2, F-4 hasta F-18 (pares)
  for (let i = 2; i <= 18; i += 2) veredasCasas.push(['F', `F-${i}`]);
  // G: G-1 hasta G-18
  for (let i = 1; i <= 18; i++) veredasCasas.push(['G', `G-${i}`]);
  // H: H-1, H-3, H-5, H-7, H-9 (impares)
  for (let i = 1; i <= 9; i += 2) veredasCasas.push(['H', `H-${i}`]);
  // I: I-6 hasta I-21
  for (let i = 6; i <= 21; i++) veredasCasas.push(['I', `I-${i}`]);
  // J: J-2 hasta J-20 (pares)
  for (let i = 2; i <= 20; i += 2) veredasCasas.push(['J', `J-${i}`]);
  // K: K-1 hasta K-20
  for (let i = 1; i <= 20; i++) veredasCasas.push(['K', `K-${i}`]);
  // L: L-1 hasta L-18
  for (let i = 1; i <= 18; i++) veredasCasas.push(['L', `L-${i}`]);
  // M: M-1 hasta M-22
  for (let i = 1; i <= 22; i++) veredasCasas.push(['M', `M-${i}`]);
  // N: N-1 hasta N-21
  for (let i = 1; i <= 21; i++) veredasCasas.push(['N', `N-${i}`]);
  // O: O-1 hasta O-17 (solo impares)
  for (let i = 1; i <= 17; i += 2) veredasCasas.push(['O', `O-${i}`]);

  for (const [v, c] of veredasCasas) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO veredas_casas (vereda, casa) VALUES (?, ?);`,
      args: [v, c]
    });
  }
  console.log(`Catálogo territorial inicializado: ${veredasCasas.length} casas en veredas A-O.`);

  // Semilla de Configuración
  const config = [
    ['situr_codigo', '08-11-04-001-0033', 'Código SITUR del Consejo Comunal'],
    ['rif', 'C299916862', 'RIF institucional'],
    ['comunidad_nombre', 'Consejo Comunal Las Llaves', 'Nombre oficial'],
    ['urbanizacion', 'Dr. Alfredo Travieso Paúl', 'Urbanización'],
    ['parroquia', 'Goaigoaza', 'Parroquia'],
    ['municipio', 'Puerto Cabello', 'Municipio'],
    ['estado', 'Carabobo', 'Estado'],
    ['aporte_usd', '1.00', 'Monto del Aporte Comunitario en USD'],
    ['vigencia_dias_default', '60', 'Vigencia predeterminada de constancias (días)'],
    ['sello_principal_url', 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/sello.png', 'Sello húmedo principal'],
    ['logo_url', 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/logo.png', 'Logo oficial'],
    ['mppcomunas_url', 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/mppcomunas.png', 'Logo MPP Comunas'],
    ['escudo_url', 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/escudo_venezuela.svg', 'Escudo de Venezuela'],
    ['doc_costos_json', JSON.stringify({
      RESIDENCIA: { gratuito: false, monto_usd: 1.0 },
      BUENA_CONDUCTA: { gratuito: false, monto_usd: 1.0 },
      FALLECIMIENTO: { gratuito: true, monto_usd: 0.0 },
      FUNCIONAMIENTO: { gratuito: false, monto_usd: 2.0 },
    }), 'Configuración de costos y gratuidad por tipo de documento'],
  ];

  for (const [clave, valor, desc] of config) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO configuracion_sistema (clave, valor, descripcion, updated_at) VALUES (?, ?, ?, ?);`,
      args: [clave, valor, desc, now]
    });
  }
  console.log('Configuraciones generales guardadas.');

  // Semilla de Catálogos (Parentesco, Instrucción, Salud)
  const catalogosDefault = [
    ['parentesco', 'a', 'Jefe(a)', 1],
    ['parentesco', 'b', 'Cónyuge', 2],
    ['parentesco', 'c', 'Hijo(a)', 3],
    ['parentesco', 'd', 'Madre/Padre', 4],
    ['parentesco', 'e', 'Abuelo(a)', 5],
    ['parentesco', 'f', 'Tíos/Tías', 6],
    ['instruccion', 'a', 'Ninguno', 1],
    ['instruccion', 'b', 'Primaria', 2],
    ['instruccion', 'c', 'Secundaria', 3],
    ['instruccion', 'd', 'TSU', 4],
    ['instruccion', 'e', 'Universitario', 5],
    ['instruccion', 'f', 'Postgrado', 6],
    ['salud', 'a', 'Discapacidad', 1],
    ['salud', 'b', 'En cama', 2],
    ['salud', 'c', 'Crónica', 3],
    ['salud', 'd', 'Silla de Ruedas', 4],
    ['salud', 'e', 'Ninguna', 5],
  ];

  for (const [tipo, cod, desc, ord] of catalogosDefault) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO catalogos_sistema (tipo, codigo, descripcion, orden, activo, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, ?, ?);`,
      args: [tipo, cod, desc, ord, now, now]
    });
  }
  console.log('Catálogos del sistema (Parentesco, Instrucción, Salud) inicializados.');

  // Semilla de las 3 Firmas Autorizadas
  const firmas = [
    {
      id: 1,
      orden: 1,
      comision: 'Vocero Ejecutivo C.C. (Unidad Ejecutiva)',
      nombre: 'Luis Alberto Peñaloza',
      cedula: 'V-4839634',
      telefono: '0424-4098127',
      url_firma: 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/firmas_sellos/firma_luis_penaloza.png',
      url_sello: null,
      usar_sello_principal: 1,
    },
    {
      id: 2,
      orden: 2,
      comision: 'Vocero Ejecutivo C.C. (Unidad Contraloría Social)',
      nombre: 'Pedro Moya',
      cedula: 'V-4595138',
      telefono: '0414-0986516',
      url_firma: 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/firmas_sellos/firma_pedro_moya.png',
      url_sello: null,
      usar_sello_principal: 1,
    },
    {
      id: 3,
      orden: 3,
      comision: 'Vocero Ejecutivo C.C. (Gestión Financiera)',
      nombre: 'Vocería Delegada C.C.',
      cedula: 'V-8912450',
      telefono: '0412-5551234',
      url_firma: 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/firmas_sellos/firma_vocero_3.png',
      url_sello: null,
      usar_sello_principal: 1,
    }
  ];

  for (const f of firmas) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO firmas_sellos (id, orden, comision, nombre, cedula, telefono, url_firma, url_sello, usar_sello_principal, activo, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?);`,
      args: [f.id, f.orden, f.comision, f.nombre, f.cedula, f.telefono, f.url_firma, f.url_sello, f.usar_sello_principal, now]
    });
  }
  console.log('3 Firmas autorizadas registradas.');

  // Semilla de Plantillas para los 3 Documentos Base
  const plantillas = [
    {
      id: 'RESIDENCIA',
      titulo: 'CONSTANCIA DE RESIDENCIA',
      subtitulo: 'NRO: {codigo_qr}',
      cuerpo_template: 'Quien suscribe, representantes del Consejo Comunal "LAS LLAVES" de la Urbanización DR. Alfredo Travieso Paúl, por medio de la presente hacemos constar que el ciudadano (a): {nombre_completo}, portador (a) de la cédula de identidad N°: {cedula}, reside en esta comunidad desde hace {tiempo_residencia} años, en la Vereda {vereda}, Casa N° {casa}.\n\nConstancia que se expide a solicitud de parte interesada, en la ciudad de Puerto Cabello, a los {dias} días del mes de {mes} del año {ano}.',
    },
    {
      id: 'BUENA_CONDUCTA',
      titulo: 'CONSTANCIA DE BUENA CONDUCTA',
      subtitulo: 'NRO: {codigo_qr}',
      cuerpo_template: 'El Consejo Comunal de la Urbanización Dr. Alfredo Travieso Paul "LAS LLAVES" hace constar por medio de la presente. Que conocemos de vista trato y comunicación al ciudadano (a) {nombre_completo}, C.I.: {cedula}, quien reside en la Vereda {vereda}, Casa N° {casa}, desde hace {tiempo_residencia} años y presenta buena conducta dentro del ámbito geográfico de nuestra comunidad.\n\nConstancia que se expide a solicitud de parte interesada, en la ciudad de Puerto Cabello, a los {dias} días del mes de {mes} del año {ano}.',
    },
    {
      id: 'FALLECIMIENTO',
      titulo: 'CONSTANCIA DE NOTIFICACIÓN DE FALLECIMIENTO',
      subtitulo: 'NRO: {codigo_qr}',
      cuerpo_template: 'Quienes suscriben, voceros del Consejo Comunal de la Urbanización Dr. Alfredo Travieso Paul "LAS LLAVES", hacen constar por medio de la presente que quien en vida fue el ciudadano (a): {nombre_completo}, titular de la cédula de identidad N°: {cedula}, habitaba en esta comunidad en la Vereda {vereda}, Casa N° {casa}, y se certifica la debida notificación de su sensible fallecimiento para los fines legales y comunitarios pertinentes.\n\nConstancia que se expide a solicitud de parte interesada para trámites de ley, en la ciudad de Puerto Cabello, a los {dias} días del mes de {mes} del año {ano}.',
    },
    {
      id: 'FUNCIONAMIENTO',
      titulo: 'CARTA COMUNAL DE FUNCIONAMIENTO COMERCIAL',
      subtitulo: 'NRO: {codigo_qr}',
      cuerpo_template: 'Quienes suscriben, voceros del Consejo Comunal de la Urbanización Dr. Alfredo Travieso Paul "LAS LLAVES", hacen constar por medio de la presente que el ciudadano (a): {nombre_completo}, titular de la cédula de identidad N°: {cedula}, propietario(a) del inmueble ubicado en la Vereda {vereda}, Casa N° {casa}, posee en su vivienda un espacio comercial en calidad de arrendamiento.\n\nSe deja constancia comunal que en dicho inmueble funciona el establecimiento: {nombre_comercio}, RIF: {rif_comercio}, bajo el rubro: {rubro_establecimiento}, ocupando un área aproximada de {tamano_espacio}, activo en esta dirección comunitaria desde la fecha {fecha_alquiler}.\n\nConstancia que se expide a solicitud del dueño del inmueble para fines comerciales, legales y tributarios correspondientes, en la ciudad de Puerto Cabello, a los {dias} días del mes de {mes} del año {ano}.',
    }
  ];

  for (const p of plantillas) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO documentos_plantillas (id, titulo, subtitulo, cuerpo_template, encabezado_svg, pie_svg, updated_at)
        VALUES (?, ?, ?, ?, '', '', ?);`,
      args: [p.id, p.titulo, p.subtitulo, p.cuerpo_template, now]
    });
  }
  console.log('Plantillas de los 3 documentos inicializadas.');

  // Semilla de prueba: Vecinos iniciales para demostración (1 aprobado, 1 pendiente)
  await db.execute({
    sql: `INSERT OR IGNORE INTO vecinos (cedula, nombres, apellidos, vereda, casa, tiempo_residencia, calidad_tenencia, telefono, email, sexo, fecha_nacimiento, estado_aprobacion, aprobado_por_usuario_id, aprobado_por_nombre, aprobado_en, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?);`,
    args: [
      'V-12345678',
      'CARLOS EDUARDO',
      'MARTINEZ GOMEZ',
      'B',
      'B-5',
      '12',
      'Propia',
      '0414-1234567',
      'carlos.martinez@ejemplo.com',
      'M',
      '1985-04-12',
      'APROBADO',
      'Super Administrador Ciencia y Tecnología',
      now,
      now,
      now,
    ]
  });

  await db.execute({
    sql: `INSERT OR IGNORE INTO vecinos (cedula, nombres, apellidos, vereda, casa, tiempo_residencia, calidad_tenencia, telefono, email, sexo, fecha_nacimiento, estado_aprobacion, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE', ?, ?);`,
    args: [
      'V-20123456',
      'MARIA ALEJANDRA',
      'RODRIGUEZ PEREZ',
      'A',
      'A-10',
      '4',
      'Alquilada',
      '0424-7654321',
      'maria.rodriguez@ejemplo.com',
      'F',
      '1994-09-21',
      now,
      now,
    ]
  });
  console.log('Vecinos de demostración cargados.');

  console.log('--- Migración completada con éxito ---');
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error durante la migración:', err);
    process.exit(1);
  });

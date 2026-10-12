# Consejo Comunal "Las Llaves" - Plataforma Digital

Sistema oficial de gestión comunal, emisión certificada de constancias comunitarias con validación digital por código QR alfanumérico (`XX00XX00XX00`), recaudación de aportes en USD y Bolívares (tasa oficial BCV), censo sociodemográfico y dashboard administrativo modular.

- **Comunidad:** Consejo Comunal "Las Llaves"
- **Ubicación:** Urbanización Dr. Alfredo Travieso Paúl, Parroquia Goaigoaza, Municipio Puerto Cabello, Estado Carabobo
- **SITUR:** `08-11-04-001-0033`
- **RIF:** `C299916862`

---

## 🚀 Características Principales

1. **Emisión de Documentos Oficiales (3 Documentos Base):**
   - **Cartas de Residencia**
   - **Constancia de Buena Conducta**
   - **Constancia de Notificación de Fallecimiento**
2. **Validación Digital Única:**
   - Código QR dinámico de alta resolución.
   - Código alfanumérico irrepetible con patrón `XX00XX00XX00` (ej: `LL26AB12CD34`).
   - Cálculo dinámico de vigencia (30, 60 o 90 días) y contador de días restantes.
   - Renovación con generación de nuevo código alfanumérico si está vencido.
3. **Padrón de Vecinos y Censo Comunal:**
   - Búsqueda pública por cédula (`V-12345678` o sólo números).
   - Validación territorial estricta de Veredas (**A hasta O**) y Casas autorizadas según plano oficial.
   - Aprobación comunal auditable por `ADMIN` o `SUPER_ADMIN` requerida antes de permitir la emisión de documentos.
   - Instrumento digital de Censo Sociodemográfico y Familiar (familiar/habitantes con códigos de parentesco, instrucción y salud).
   - Importación masiva por archivo CSV con descarga previa de formato en blanco y previsualización interactiva.
4. **Aportes Comunitarios y Pagos:**
   - Aporte Comunitario de Corresponsabilidad y Sostenimiento configurado en USD.
   - Conversión automática en tiempo real a Bolívares usando la API oficial del dólar BCV (`https://ve.dolarapi.com/v1/dolares/oficial`).
   - Catálogo de los 30 bancos nacionales de Venezuela.
   - Opción de **Solicitar exoneración social por caso de vulnerabilidad** (trámite 100% gratuito).
5. **Dashboard Modular con Navegación por Hash (`#`):**
   - `#dashboard` (Métricas, KPIs, tasa en vivo)
   - `#vecinos` (Filtros en tiempo real, aprobaciones, CSV)
   - `#documentos` (Auditoría, revocación, descargas)
   - `#censo` (Fichas familiares y empadronamiento)
   - `#pagos` (Control de transferencias y exoneraciones)
   - `#firmas` (3 firmas y sellos autorizados)
   - `#modelador` (Plantillas de documentos y variables dinámicas)
   - `#usuarios` (Gestión de voceros y administradores por SUPER_ADMIN)
   - `#auditoria` (Bitácora inalterable con horas y fechas de descargas y accesos)
   - `#estadisticas` (Gráficos interactivos de horas de mayor afluencia, género, grupos de edad y veredas)
   - `#configuracion` (Parámetros globales)
6. **Seguridad y Roles:**
   - Super Administrador: `CIENCIA_TECNOLOGIA` / Clave: `CYT_01012023`.
   - Control granular de permisos para Administradores y Voceros de comisiones.

---

## 🛠️ Tecnologías y Servicios

- **Framework:** Next.js 14+ (App Router)
- **Base de Datos:** Turso LibSQL (`libsql://lasllaves-herrejose.aws-ap-northeast-1.turso.io`)
- **Estilos:** Tailwind CSS con Glassmorphism y Dark Theme Institucional
- **Generación de PDF:** jsPDF + QRCode (alta resolución con membretes y sellos oficiales)
- **Gráficos:** Recharts
- **Despliegue:** Optimizado para Vercel Serverless

---

## 📦 Despliegue en Vercel

1. Clonar el repositorio y configurar las variables de entorno en Vercel:
   ```env
   TURSO_DATABASE_URL="libsql://lasllaves-herrejose.aws-ap-northeast-1.turso.io"
   TURSO_AUTH_TOKEN="tu_token_turso"
   JWT_SECRET="clave_secreta_segura"
   NEXT_PUBLIC_CDN_URL="https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev"
   NEXT_PUBLIC_APP_URL="https://tu-proyecto.vercel.app"
   ```
2. Ejecutar `npm run build` o desplegar vía CLI de Vercel (`vercel --prod`) o conectar el repositorio en el panel de Vercel.

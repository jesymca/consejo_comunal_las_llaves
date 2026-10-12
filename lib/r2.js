import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || 'da7c23add0ce839e4989c068fbfa4394';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'lasllaves';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_PUBLIC_URL = (process.env.NEXT_PUBLIC_CDN_URL || 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev').replace(/\/$/, '');

/**
 * Retorna una instancia del cliente S3 para Cloudflare R2
 * o null si faltan las credenciales requeridas.
 */
export function getR2Client() {
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    return null;
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Sube un buffer de archivo al bucket Cloudflare R2 y retorna la URL pública
 */
export async function uploadToR2({ buffer, key, contentType = 'image/png' }) {
  const client = getR2Client();
  if (!client) {
    throw new Error('Credenciales de Cloudflare R2 no configuradas (R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)');
  }

  // Normalizar clave (eliminar slash inicial si existe)
  const cleanKey = key.replace(/^\/+/, '');

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: cleanKey,
    Body: buffer,
    ContentType: contentType,
  });

  await client.send(command);

  // Retornar URL pública accesible
  return `${R2_PUBLIC_URL}/${cleanKey}`;
}

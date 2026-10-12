import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL || 'libsql://lasllaves-herrejose.aws-ap-northeast-1.turso.io';
const authToken = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTEzMjMyMzUsImlkIjoiMDFhMTEzMmYtMmMwMS03ZGMwLThmNWMtODQyZWJiZTVlMjVhIiwia2lkIjoidnM2Yl9rSmo5eXJSQkdqMXQ0WWhBUnlWcVg0Tmx6LXp2elhYeHVLQnV6RSIsInJpZCI6ImM2OTkxOTA5LTg4YjItNDMyYi1iMjQ0LTIwOTllYmRkZjMzZiJ9.hvthanE7lifqQS6NDJDCH7TQgy7x1iPpouEtfEj0sx7nLE_IMTgcTmMjLOm08DBWr1p3gUH8jGqzri_FPV5DAw';

if (!url) {
  throw new Error('TURSO_DATABASE_URL is not defined in environment variables');
}

// In Next.js edge / node runtimes, reuse global client if available
const globalForTurso = globalThis;

export const db = globalForTurso.tursoClient || createClient({
  url,
  authToken,
});

if (process.env.NODE_ENV !== 'production') {
  globalForTurso.tursoClient = db;
}

export default db;

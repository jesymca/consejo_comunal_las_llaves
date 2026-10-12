import { NextResponse } from 'next/server';

let cachedData = null;
let lastFetchTime = 0;
const CACHE_DURATION_MS = 1000 * 60 * 10; // 10 minutos

export async function GET() {
  const now = Date.now();
  if (cachedData && (now - lastFetchTime < CACHE_DURATION_MS)) {
    return NextResponse.json(cachedData);
  }

  try {
    const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 600 }
    });

    if (!res.ok) {
      throw new Error(`Error en API externa: ${res.status}`);
    }

    const data = await res.json();
    cachedData = {
      fuente: data.fuente || 'oficial',
      promedio: Number(data.promedio) || 875.65,
      fechaActualizacion: data.fechaActualizacion || new Date().toISOString(),
    };
    lastFetchTime = now;

    return NextResponse.json(cachedData);
  } catch (err) {
    console.error('Error consultando dolarapi:', err);
    // Retornar fallback con último caché o valor estimado si la API externa falla temporalmente
    if (cachedData) {
      return NextResponse.json(cachedData);
    }
    return NextResponse.json({
      fuente: 'oficial-fallback',
      promedio: 875.65,
      fechaActualizacion: new Date().toISOString(),
    });
  }
}

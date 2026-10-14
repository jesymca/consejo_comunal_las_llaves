'use client';

import { useCallback, useEffect, useState } from 'react';
import { VEREDAS, getMapaCasas, setCasasPorVeredaCache } from '@/lib/territory';

/**
 * Hook cliente que sincroniza veredas/casas desde /api/territorio.
 * Escucha el evento global 'territorio_updated' para refrescarse.
 */
export function useTerritorio() {
  const [casasPorVereda, setCasasPorVereda] = useState(getMapaCasas());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const recargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/territorio', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.casasPorVereda) {
          setCasasPorVeredaCache(data.casasPorVereda);
          setCasasPorVereda(data.casasPorVereda);
        }
        setItems(data.items || []);
      }
    } catch (e) {
      console.warn('Error cargando territorio:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    recargar();
    const handler = () => recargar();
    window.addEventListener('territorio_updated', handler);
    return () => window.removeEventListener('territorio_updated', handler);
  }, [recargar]);

  return { veredas: VEREDAS, casasPorVereda, items, loading, recargar };
}

export function notificarTerritorioActualizado() {
  try { window.dispatchEvent(new CustomEvent('territorio_updated')); } catch (e) {}
}

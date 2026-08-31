import { useEffect, useState } from 'react';
import { loadMaps } from '../lib/loadMaps';
import { GOOGLE_MAPS_API_KEY } from '../config/site';

export function useGoogleMaps() {
  const [maps, setMaps] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    loadMaps(GOOGLE_MAPS_API_KEY)
      .then((g) => { if (alive) setMaps(g); })
      .catch((e) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, []);

  return { maps, error };
}

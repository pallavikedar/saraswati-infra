import { useMemo, useState } from 'react';

/**
 * The toolbar's filters, resolved to a Set of plot numbers — or null
 * when nothing is filtered, which the plan reads as "draw everything at
 * full strength" rather than "dim all 211".
 */
export function usePlotFilters(layout, status) {
  const [search, setSearch] = useState('');
  const [minArea, setMinArea] = useState('');
  const [maxArea, setMaxArea] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const plots = layout ? layout.plots : [];

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    const lo = parseFloat(minArea);
    const hi = parseFloat(maxArea);
    if (!q && Number.isNaN(lo) && Number.isNaN(hi) && statusFilter === 'all') return null;

    const s = new Set();
    plots.forEach((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return;
      if (!Number.isNaN(lo) && p.area < lo) return;
      if (!Number.isNaN(hi) && p.area > hi) return;
      if (statusFilter !== 'all' && (status[p.name] || 'available') !== statusFilter) return;
      s.add(p.name);
    });
    return s;
  }, [plots, search, minArea, maxArea, statusFilter, status]);

  return {
    search, setSearch,
    minArea, setMinArea,
    maxArea, setMaxArea,
    statusFilter, setStatusFilter,
    matches,
    clear: () => { setSearch(''); setMinArea(''); setMaxArea(''); setStatusFilter('all'); },
    shown: matches ? matches.size : plots.length,
    total: plots.length,
  };
}

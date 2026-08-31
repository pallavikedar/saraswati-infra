import React, { useMemo } from 'react';

import { STATUS, STATUS_KEYS, statusTally } from '../../theme/status';
import { HAIR, MONO } from '../../theme/tokens';

/**
 * What the colours mean, with how many plots are in each state — the
 * count is the part a developer actually wants, and it costs one pass
 * over the plots to have it.
 *
 * Only shown while the status view is on: with the master plan up the
 * colours aren't on screen, so a key to them is just clutter. States
 * with nothing in them are dropped for the same reason.
 */
export default function StatusLegend({ plots, status, show }) {
  const tally = useMemo(
    () => (show ? statusTally(plots, status) : null),
    [plots, status, show],
  );
  if (!show || !tally) return null;

  return (
    <div style={{
      position: 'absolute', left: 14, bottom: 14, zIndex: 6,
      display: 'flex', flexWrap: 'wrap', gap: 14,
      padding: '11px 14px',
      background: 'rgba(21,24,29,0.88)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      border: `1px solid ${HAIR}`,
      borderRadius: 12,
    }}>
      {STATUS_KEYS.filter((k) => tally[k] > 0).map((k) => (
        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{
            width: 11, height: 11, borderRadius: 3,
            background: STATUS[k].dot,
            border: k === 'available' ? `1px solid ${HAIR}` : 'none',
          }} />
          <span style={{ font: `500 12px/1 ${MONO}`, color: '#E7E1D5' }}>
            {STATUS[k].label}
          </span>
          <span style={{ font: `400 12px/1 ${MONO}`, color: '#8B96A3' }}>
            {tally[k]}
          </span>
        </div>
      ))}
    </div>
  );
}
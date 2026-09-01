
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
    <>
      <style>{`
        .status-legend {
          position: absolute;
          left: 14px;
          bottom: 14px;
          z-index: 6;
          display: flex;
          flex-wrap: wrap;
          gap: clamp(8px, 2vw, 14px);
          padding: clamp(8px, 2vw, 11px) clamp(10px, 3vw, 14px);
          background: rgba(21,24,29,0.88);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid ${HAIR};
          border-radius: 12px;
          max-width: calc(100vw - 28px);
          box-sizing: border-box;
        }
        .status-legend__item {
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .status-legend__dot {
          width: 11px;
          height: 11px;
          border-radius: 3px;
          flex-shrink: 0;
        }
        .status-legend__label {
          font: 500 12px/1 ${MONO};
          color: #E7E1D5;
          white-space: nowrap;
        }
        .status-legend__count {
          font: 400 12px/1 ${MONO};
          color: #8B96A3;
        }

        /* Tablet: tighten spacing a touch */
        @media (max-width: 768px) {
          .status-legend {
            left: 10px;
            bottom: 10px;
            gap: 10px;
            padding: 8px 10px;
          }
        }

        /* Phone: full-width bar, smaller text, wraps as needed */
        @media (max-width: 480px) {
          .status-legend {
            left: 8px;
            right: 8px;
            bottom: 8px;
            max-width: none;
            width: auto;
            gap: 8px 12px;
            border-radius: 10px;
          }
          .status-legend__label,
          .status-legend__count {
            font-size: 11px;
          }
          .status-legend__dot {
            width: 10px;
            height: 10px;
          }
        }

        /* Very small phones: shrink further, drop side margins */
        @media (max-width: 340px) {
          .status-legend {
            left: 6px;
            right: 6px;
            bottom: 6px;
            gap: 6px 10px;
            padding: 7px 9px;
          }
        }
      `}</style>
      <div className="status-legend" style={{ bottom: 14 + offsetBottom }}>
        {STATUS_KEYS.filter((k) => tally[k] > 0).map((k) => (
          <div key={k} className="status-legend__item">
            <span
              className="status-legend__dot"
              style={{
                background: STATUS[k].dot,
                border: k === 'available' ? `1px solid ${HAIR}` : 'none',
              }}
            />
            <span className="status-legend__label">{STATUS[k].label}</span>
            <span className="status-legend__count">{tally[k]}</span>
          </div>
        ))}
      </div>
    </>
  );
}
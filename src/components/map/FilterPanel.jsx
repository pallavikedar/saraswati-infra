
import React, { useMemo, useState } from 'react';

import {
  EMPTY_FILTERS, FACING_OPTIONS, RL_OPTIONS, STATUS_OPTIONS, AREA_UNITS,
  applyFilters, isEmpty, roadWidthOptions,
} from '../../lib/filters';
import { ACCENT, CANVAS, HAIR, MONO, MUTED, SANS } from '../../theme/tokens';

const Pill = ({ on, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    style={{
      font: `500 12px/1 ${MONO}`,
      color: on ? CANVAS : 'inherit',
      background: on ? ACCENT : 'transparent',
      border: `1px solid ${on ? ACCENT : HAIR}`,
      borderRadius: 999,
      padding: '9px 13px',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </button>
);

const Section = ({ label, children }) => (
  <div style={{ display: 'grid', gap: 9 }}>
    <div style={{
      fontFamily: SANS, fontSize: 11, letterSpacing: '0.08em',
      textTransform: 'uppercase', color: MUTED,
    }}>
      {label}
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>{children}</div>
  </div>
);

/**
 * Filters, staged then applied. The draft is local so trying a facing or
 * typing a range doesn't repaint the layout on every keystroke — only
 * "Apply filters" pushes a match set up to App.
 *
 * onApply(hits, draft): hits is a Set of plot names, or null when the
 * draft is empty. Same shape App already hands PlanMap as `matches`.
 *
 * Sits on the LEFT: DetailPanel owns the right edge, and App's zoomTo
 * already reserves 350px there when framing a plot.
 */
export default function FilterPanel({ plots, filters, onApply, onClose }) {
  const [draft, setDraft] = useState(filters || EMPTY_FILTERS);
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const roads = useMemo(() => roadWidthOptions(plots), [plots]);
  const hits = useMemo(() => applyFilters(plots, draft), [plots, draft]);
  const total = useMemo(() => plots.filter((p) => !p.isRoad).length, [plots]);

  const field = {
    font: `400 13px/1 ${MONO}`,
    color: 'inherit',
    background: 'transparent',
    border: `1px solid ${HAIR}`,
    borderRadius: 9,
    padding: '11px 11px',
    width: '100%',
    minWidth: 0,
  };

  return (
    <div
      className="filter-panel"
      role="dialog"
      aria-label="Filter plots"
      style={{
        position: 'absolute', top: 14, left: 14, zIndex: 7,
        width: 320, maxWidth: 'calc(100vw - 28px)', maxHeight: 'calc(100% - 28px)',
        display: 'flex', flexDirection: 'column',
        background: CANVAS,
        border: `1px solid ${HAIR}`,
        borderRadius: 14,
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}
    >
      <style>{`
        .filter-panel .fp-body::-webkit-scrollbar { width: 5px; }
        .filter-panel .fp-body::-webkit-scrollbar-thumb {
          background: ${HAIR}; border-radius: 3px;
        }

        /* Tablet / small laptop: keep floating panel, just narrower & tighter */
        @media (max-width: 900px) {
          .filter-panel {
            width: min(300px, calc(100vw - 24px)) !important;
            top: 12px !important; left: 12px !important;
          }
        }

        /* Phone landscape / small tablet: shrink further, tighten paddings */
        @media (max-width: 640px) {
          .filter-panel {
            top: auto !important; left: 8px !important; right: 8px;
            bottom: 8px; width: auto !important; max-height: 78% !important;
          }
          .filter-panel .fp-header {
            padding: 12px 14px 9px !important;
          }
          .filter-panel .fp-body {
            padding: 12px !important;
            gap: 14px !important;
          }
          .filter-panel .fp-footer {
            padding: 10px !important;
          }
        }

        /* Phone portrait: smaller text/controls, more of the sheet used */
        @media (max-width: 420px) {
          .filter-panel {
            left: 6px !important; right: 6px; bottom: 6px;
            max-height: 85% !important; border-radius: 12px !important;
          }
          .filter-panel .fp-title {
            font-size: 12px !important;
          }
          .filter-panel input,
          .filter-panel button {
            font-size: 12px !important;
          }
          .filter-panel .fp-footer {
            grid-template-columns: 1fr 1.4fr !important;
          }
        }

        /* Very small phones */
        @media (max-width: 340px) {
          .filter-panel .fp-body {
            padding: 10px !important;
            gap: 12px !important;
          }
          .filter-panel .fp-footer button {
            padding: 10px 0 !important;
          }
        }

        /* Short viewports (landscape phones): cap sheet height sensibly */
        @media (max-height: 480px) {
          .filter-panel {
            max-height: 92% !important;
          }
        }
      `}</style>

      <header
        className="fp-header"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px 11px', borderBottom: `1px solid ${HAIR}`,
        }}
      >
        <div
          className="fp-title"
          style={{
            fontFamily: SANS, fontSize: 13, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: ACCENT,
          }}
        >
          Filters
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: MONO, fontSize: 12, color: MUTED }}>
            {hits ? hits.size : total} of {total}
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close filters"
              style={{
                font: `400 16px/1 ${MONO}`, color: MUTED,
                background: 'none', border: 'none', cursor: 'pointer', padding: 2,
              }}
            >
              &times;
            </button>
          )}
        </div>
      </header>

      <div
        className="fp-body"
        style={{
          display: 'grid', gap: 18, padding: 16,
          overflowY: 'auto', overscrollBehavior: 'contain',
        }}
      >
        <Section label="Area range">
          <div style={{ display: 'flex', gap: 7, width: '100%' }}>
            {AREA_UNITS.map((u) => (
              <Pill key={u} on={draft.unit === u} onClick={() => set({ unit: u })}>
                {u}
              </Pill>
            ))}
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center', gap: 9, width: '100%',
          }}>
            <input
              style={field}
              type="number"
              inputMode="decimal"
              min="0"
              placeholder="Min"
              aria-label={`Minimum area in ${draft.unit}`}
              value={draft.min}
              onChange={(e) => set({ min: e.target.value })}
            />
            <span style={{ fontFamily: MONO, fontSize: 12, color: MUTED }}>to</span>
            <input
              style={field}
              type="number"
              inputMode="decimal"
              min="0"
              placeholder="Max"
              aria-label={`Maximum area in ${draft.unit}`}
              value={draft.max}
              onChange={(e) => set({ max: e.target.value })}
            />
          </div>
        </Section>

        {roads.length > 0 && (
          <Section label="Road width">
            <Pill on={draft.road === 'All'} onClick={() => set({ road: 'All' })}>All</Pill>
            {roads.map((w) => (
              <Pill
                key={w}
                on={String(draft.road) === String(w)}
                onClick={() => set({ road: w })}
              >
                {w} m
              </Pill>
            ))}
          </Section>
        )}

        <Section label="Facing">
          <Pill on={draft.facing === 'All'} onClick={() => set({ facing: 'All' })}>All</Pill>
          {FACING_OPTIONS.map((f) => (
            <Pill key={f} on={draft.facing === f} onClick={() => set({ facing: f })}>
              {f}
            </Pill>
          ))}
        </Section>

        <Section label="Status">
          <Pill on={draft.status === 'All'} onClick={() => set({ status: 'All' })}>All</Pill>
          {STATUS_OPTIONS.map((s) => (
            <Pill key={s} on={draft.status === s} onClick={() => set({ status: s })}>
              {s}
            </Pill>
          ))}
        </Section>

        <Section label="RL status">
          <Pill on={draft.rl === 'All'} onClick={() => set({ rl: 'All' })}>All</Pill>
          {RL_OPTIONS.map((r) => (
            <Pill key={r} on={draft.rl === r} onClick={() => set({ rl: r })}>
              {r}
            </Pill>
          ))}
        </Section>
      </div>

      <footer
        className="fp-footer"
        style={{
          display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 9,
          padding: 12, borderTop: `1px solid ${HAIR}`,
        }}
      >
        <button
          type="button"
          onClick={() => { setDraft(EMPTY_FILTERS); onApply(null, EMPTY_FILTERS); }}
          disabled={isEmpty(draft)}
          style={{
            font: `500 13px/1 ${MONO}`,
            color: isEmpty(draft) ? MUTED : 'inherit',
            background: 'transparent',
            border: `1px solid ${HAIR}`,
            borderRadius: 10, padding: '12px 0',
            cursor: isEmpty(draft) ? 'default' : 'pointer',
          }}
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => onApply(hits, draft)}
          style={{
            font: `500 13px/1 ${MONO}`, color: CANVAS,
            background: ACCENT, border: `1px solid ${ACCENT}`,
            borderRadius: 10, padding: '12px 0', cursor: 'pointer',
          }}
        >
          Apply filters
        </button>
      </footer>
    </div>
  );
}
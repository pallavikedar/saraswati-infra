import React from 'react';
import { ACCENT, HAIR, PANEL, SANS } from '../../theme/tokens';

export default function Chip({ active, onClick, children, swatch, title, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      aria-pressed={active === undefined ? undefined : !!active}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 11px', borderRadius: 999,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        border: `1px solid ${active ? ACCENT : HAIR}`,
        background: active ? 'rgba(201,169,119,0.14)' : PANEL,
        color: active ? ACCENT : '#B7C0CA',
        fontFamily: SANS, fontSize: 13, letterSpacing: '0.06em',
        textTransform: 'uppercase', fontWeight: 600, whiteSpace: 'nowrap',
        WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
      }}
    >
      {swatch && <span style={{ width: 9, height: 9, borderRadius: 2, background: swatch }} />}
      {children}
    </button>
  );
}

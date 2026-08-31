import React from 'react';
import { ACCENT, HAIR, PANEL, SANS } from '../../theme/tokens';

const btn = {
  width: 38, height: 38, borderRadius: 9, background: PANEL,
  border: `1px solid ${HAIR}`, color: '#D7DCE2', fontFamily: SANS,
  fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  touchAction: 'manipulation',
};

/** Turn automatically, and level off facing north. Both only mean
    something while a plot is raised. */
export default function CameraControls({ enabled, spin, onToggleSpin, onFaceNorth }) {
  const base = {
    ...btn,
    opacity: enabled ? 1 : 0.4,
    cursor: enabled ? 'pointer' : 'default',
  };
  return (
    <div style={{
      position: 'absolute', left: 14, bottom: 14, zIndex: 11,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {/* <button
        type="button" aria-label="Turn automatically" title="Turn automatically"
        disabled={!enabled} onClick={onToggleSpin}
        style={{ ...base, borderColor: spin ? ACCENT : HAIR, color: spin ? ACCENT : '#D7DCE2' }}
      >
        360
      </button>
      <button
        type="button" aria-label="Face north, level" title="Face north, level"
        disabled={!enabled} onClick={onFaceNorth} style={base}
      >
        N
      </button> */}
    </div>
  );
}

import React from 'react';
import { SANS, MUTED } from '../../theme/tokens';

export default function Eyebrow({ children, style }) {
  return (
    <div style={{
      fontFamily: SANS, fontSize: 11, letterSpacing: '0.18em',
      textTransform: 'uppercase', color: MUTED, fontWeight: 600, ...style,
    }}>
      {children}
    </div>
  );
}

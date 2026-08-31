import React from 'react';
import { HAIR, MONO } from '../../theme/tokens';

/* 16px so iOS Safari does not zoom the whole page on focus. */
export const fieldStyle = {
  padding: '7px 10px', background: '#0D1117', color: '#EFEAE0',
  border: `1px solid ${HAIR}`, borderRadius: 7, fontFamily: MONO,
  fontSize: 16, outline: 'none', boxSizing: 'border-box', minWidth: 0,
};

export default function NumberField({ value, onChange, placeholder, width, label, mode = 'decimal' }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      type="number"
      inputMode={mode}
      aria-label={label}
      placeholder={placeholder}
      style={{ ...fieldStyle, width }}
    />
  );
}

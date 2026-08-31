// components/Field.jsx — the _AnimatedField port.
//
// The Dart version scaled the prefix icon and lifted a shadow on focus.
// Both are :focus-within rules here, so there's no controller per field.

import React from 'react';

const ICONS = {
  mail: (
    <path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h13A1.5 1.5 0 0 1 18 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 14.5v-9Zm1.7.5 6.3 4.4L16.3 6H3.7Z" />
  ),
  lock: (
    <path d="M6 8V6.5a4 4 0 1 1 8 0V8h.5A1.5 1.5 0 0 1 16 9.5v6A1.5 1.5 0 0 1 14.5 17h-9A1.5 1.5 0 0 1 4 15.5v-6A1.5 1.5 0 0 1 5.5 8H6Zm1.6 0h4.8V6.5a2.4 2.4 0 0 0-4.8 0V8Z" />
  ),
  person: (
    <path d="M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0 1.6c-3 0-6 1.5-6 3.4V17h12v-2c0-1.9-3-3.4-6-3.4Z" />
  ),
};

export default function Field({
  id, label, value, onChange, type = 'text', icon,
  trailing, error, autoComplete, inputMode,
}) {
  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <div className="field-box">
        {icon && (
          <svg className="field-icon" viewBox="0 0 20 20" aria-hidden="true">
            {ICONS[icon]}
          </svg>
        )}
        <input
          id={id}
          type={type}
          value={value}
          autoComplete={autoComplete}
          inputMode={inputMode}
          placeholder=" "
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        <label htmlFor={id}>{label}</label>
        {trailing && <span className="field-trailing">{trailing}</span>}
      </div>
      {error && <p className="field-error" id={`${id}-error`}>{error}</p>}
    </div>
  );
}

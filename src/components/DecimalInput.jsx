import React, { useState } from 'react';
import { formatDecimal } from '../domain/display.js';

export function DecimalInput({ value, onFocus, onBlur, readOnly, type: _type, ...props }) {
  const [focused, setFocused] = useState(false);
  // Keep the user's original string while typing (including "0," and blank).
  // Blurring changes presentation only; stored values retain full precision.
  const displayed = focused && !readOnly ? value ?? '' : formatDecimal(value, value ?? '');
  return <input {...props} type="text" inputMode="decimal" readOnly={readOnly} value={displayed}
    onFocus={(event) => { setFocused(true); onFocus?.(event); }}
    onBlur={(event) => { setFocused(false); onBlur?.(event); }} />;
}

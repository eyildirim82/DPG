import React, { useState } from 'react';
import { theme } from '../../styles/theme';

export default function FormInput({
  type = 'text',
  placeholder = ' ',
  required,
  value,
  onChange,
  onFocus,
  onBlur,
  focused: focusedProp,
  label,
  error,
  style = {},
  ...rest
}) {
  const [internalFocused, setInternalFocused] = useState(false);
  const focused = focusedProp !== undefined ? focusedProp : internalFocused;
  const hasValue = value != null && String(value).length > 0;
  const isActive = focused || hasValue;
  const handleFocus = (e) => {
    setInternalFocused(true);
    onFocus?.(e);
  };
  const handleBlur = (e) => {
    setInternalFocused(false);
    onBlur?.(e);
  };
  return (
    <div className="mb-10 relative">
      <input
        type={type}
        placeholder={placeholder}
        required={required}
        value={value ?? ''}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="w-full bg-transparent border-0 border-b border-white/20 py-4 text-dpg-text font-heading text-base md:text-2xl outline-none transition-colors duration-300 min-h-[44px]"
        style={{
          borderBottomColor: error ? '#b91c1c' : focused ? theme.colors.gold : undefined,
          ...style,
        }}
        {...rest}
      />
      <label
        className="absolute top-0 left-0 font-body text-xs text-dpg-text-muted uppercase tracking-widest pointer-events-none transition-all duration-300"
        style={{
          top: isActive ? '-20px' : 0,
          color: isActive ? theme.colors.gold : undefined,
          fontSize: isActive ? '0.7rem' : '0.8rem',
        }}
      >
        {label}
      </label>
      {error && (
        <p className="absolute -bottom-5 left-0 text-xs text-red-500 font-body">{error}</p>
      )}
    </div>
  );
}

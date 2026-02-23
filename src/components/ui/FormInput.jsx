import React, { useState, useId } from 'react';
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
  const uniqueId = useId();
  const inputId = rest.id || uniqueId;
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
        id={inputId}
        type={type}
        placeholder={placeholder}
        required={required}
        value={value ?? ''}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="w-full bg-white/5 hover:bg-white/10 border border-white/20 rounded-md px-4 py-4 text-dpg-text font-heading text-lg md:text-xl outline-none transition-colors duration-300 min-h-[64px]"
        style={{
          borderColor: error ? '#b91c1c' : focused ? theme.colors.gold : undefined,
          ...style,
        }}
        {...rest}
      />
      <label
        htmlFor={inputId}
        className="absolute font-body text-sm text-dpg-text-muted uppercase tracking-widest cursor-text transition-all duration-300"
        style={{
          left: isActive ? '0' : '16px',
          top: isActive ? '-20px' : '20px',
          color: isActive ? theme.colors.gold : undefined,
          fontSize: isActive ? '0.85rem' : '1rem',
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

import React, { useState, useId } from 'react';
import { theme } from '../../styles/theme';

export default function FormSelect({
    required,
    value,
    onChange,
    onFocus,
    onBlur,
    focused: focusedProp,
    label,
    error,
    options = [],
    style = {},
    ...rest
}) {
    const [internalFocused, setInternalFocused] = useState(false);
    const uniqueId = useId();
    const inputId = rest.id || uniqueId;
    const focused = focusedProp !== undefined ? focusedProp : internalFocused;

    // For select, an empty string is considered as not having a value,
    // but if the user has selected something, it has a value.
    const hasValue = value != null && String(value).length > 0;

    // The floating label trick. Select is "active" if it has a chosen value, or is focused.
    // However, since we show '{label} Seçiniz' as a placeholder option, we want
    // the label to always stay floating to prevent text overlap.
    const isActive = true;

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
            <select
                id={inputId}
                required={required}
                value={value ?? ''}
                onChange={onChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/20 rounded-md px-4 py-4 text-dpg-text font-heading text-[20px] outline-none transition-colors duration-300 min-h-[60px] appearance-none"
                style={{
                    borderColor: error ? '#b91c1c' : focused ? theme.colors.gold : undefined,
                    ...style,
                }}
                {...rest}
            >
                <option value="" disabled className="text-gray-500 bg-[#1a1c23]">
                    Seçiniz
                </option>
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value} className="text-dpg-text bg-[#1a1c23]">
                        {opt.label}
                    </option>
                ))}
            </select>

            {/* Custom Dropdown Arrow */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </div>

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

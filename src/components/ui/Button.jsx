import React from 'react';

export default function Button({
  children,
  onClick,
  secondary,
  style = {},
  type = 'button',
  className = '',
  disabled = false,
  fullWidth = false,
}) {
  const base =
    'px-10 py-4 font-body uppercase tracking-widest text-[20px] cursor-pointer transition-all duration-300 ease-out relative overflow-hidden inline-block min-h-[60px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-dpg-gold focus-visible:outline-offset-2 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none';

  const primary =
    'bg-transparent text-dpg-gold border border-dpg-gold hover:bg-dpg-gold hover:text-dpg-navy';

  const sec =
    'bg-transparent text-dpg-silver border border-dpg-silver hover:bg-dpg-silver hover:text-dpg-navy';

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${base} ${secondary ? sec : primary} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={style}
      disabled={disabled}
      aria-disabled={disabled}
    >
      {children}
    </button>
  );
}

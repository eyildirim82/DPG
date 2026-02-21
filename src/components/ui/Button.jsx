import React, { useState } from 'react';

export default function Button({ children, onClick, secondary, style = {}, type = 'button', className = '' }) {
  const [hovered, setHovered] = useState(false);
  const base =
    'px-10 py-4 font-body uppercase tracking-widest text-sm cursor-pointer transition-all duration-400 ease-out relative overflow-hidden inline-block min-h-[44px]';
  const primary = hovered
    ? 'bg-dpg-gold text-dpg-navy border border-dpg-gold'
    : 'bg-transparent text-dpg-gold border border-dpg-gold';
  const sec = hovered
    ? 'bg-dpg-silver text-dpg-navy border border-dpg-silver'
    : 'bg-transparent text-dpg-silver border border-dpg-silver';
  return (
    <button
      type={type}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`${base} ${secondary ? sec : primary} ${className}`}
      style={style}
    >
      {children}
    </button>
  );
}

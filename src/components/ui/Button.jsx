import React from 'react';

export default function Button({ children, onClick, secondary, style = {}, type = 'button', className = '' }) {
  const base =
    'px-10 py-4 font-body uppercase tracking-widest text-lg md:text-xl cursor-pointer transition-all duration-300 ease-out relative overflow-hidden inline-block min-h-[64px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-dpg-gold focus-visible:outline-offset-2 active:scale-95';

  const primary =
    'bg-transparent text-dpg-gold border border-dpg-gold hover:bg-dpg-gold hover:text-dpg-navy';

  const sec =
    'bg-transparent text-dpg-silver border border-dpg-silver hover:bg-dpg-silver hover:text-dpg-navy';

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${base} ${secondary ? sec : primary} ${className}`}
      style={style}
    >
      {children}
    </button>
  );
}

import React from 'react';

export default function Header() {
  return (
    <header className="absolute top-0 left-0 right-0 py-6 md:py-8 z-10 flex justify-between items-center px-4 md:px-6 lg:px-8">
      <a
        href="#"
        className="flex items-center gap-2 md:gap-3 min-h-[44px] focus:outline-none"
        aria-label="TALPA Ana Sayfa"
      >
        <img
          src="/talpa-logo.webp"
          alt="TALPA - Türkiye Havayolu Pilotları Derneği"
          className="h-14 md:h-[4.5rem] w-auto object-contain"
        />
      </a>
      <img
        src="/denizbank-logo.svg"
        alt="DenizBank"
        className="h-8 md:h-10 w-auto object-contain min-h-[44px]"
      />
    </header>
  );
}

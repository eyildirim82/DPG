import React from 'react';

export default function Header({ altMode = false }) {
  return (
    <header className="absolute top-0 left-0 right-0 py-6 md:py-8 z-10 flex justify-center items-center px-4 md:px-6 lg:px-8">
      <a
        href={altMode ? '?' : '#'}
        className="flex items-center gap-2 md:gap-3 min-h-[44px] focus:outline-none"
        aria-label="TALPA Ana Sayfa"
      >
        <img
          src="/talpa-logo.webp"
          alt="TALPA - Türkiye Havayolu Pilotları Derneği"
          className="h-28 md:h-[7rem] w-auto object-contain"
        />
      </a>
    </header>
  );
}

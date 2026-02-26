import React, { useState, useEffect } from 'react';

// Başvuru açılış tarihi: 2 Mart 2026, 10:00 (Türkiye saati, UTC+3)
const OPEN_DATE = new Date('2026-03-02T10:00:00+03:00');

function getTimeLeft() {
    const now = new Date();
    const diff = OPEN_DATE - now;

    if (diff <= 0) return null; // Süre doldu, başvurular açık

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    return { days, hours, minutes, seconds, total: diff };
}

export default function CountdownTimer({ onComplete }) {
    const [timeLeft, setTimeLeft] = useState(getTimeLeft);

    useEffect(() => {
        if (!timeLeft) {
            onComplete?.();
            return;
        }

        const timer = setInterval(() => {
            const remaining = getTimeLeft();
            if (!remaining) {
                clearInterval(timer);
                setTimeLeft(null);
                onComplete?.();
            } else {
                setTimeLeft(remaining);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Süre dolduysa hiçbir şey gösterme (parent form'u gösterecek)
    if (!timeLeft) return null;

    const blocks = [
        { label: 'Gün', value: timeLeft.days },
        { label: 'Saat', value: timeLeft.hours },
        { label: 'Dakika', value: timeLeft.minutes },
        { label: 'Saniye', value: timeLeft.seconds },
    ];

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-10 max-w-2xl mx-auto border border-gray-100 text-center">
            {/* Icon */}
            <div className="flex justify-center mb-4">
                <svg className="w-16 h-16 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                Başvurular Yakında Açılıyor
            </h3>
            <p className="text-gray-500 mb-4 text-sm md:text-base">
                Başvuru sistemi <span className="font-semibold text-gray-700">2 Mart 2026, Pazartesi — 10:00</span> tarihinde açılacaktır.
            </p>

            {/* Info banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700 mb-8">
                <p className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
                    </svg>
                    Başvuru sistemi otomatik olarak açılacaktır, lütfen bekleyiniz.
                </p>
            </div>

            {/* Countdown Grid */}
            <div className="grid grid-cols-4 gap-3 md:gap-4 mb-8">
                {blocks.map(({ label, value }) => (
                    <div key={label} className="flex flex-col items-center">
                        <div className="bg-gradient-to-b from-blue-600 to-blue-700 text-white rounded-xl w-full py-4 md:py-5 shadow-md">
                            <span className="text-3xl md:text-5xl font-bold tabular-nums">
                                {String(value).padStart(2, '0')}
                            </span>
                        </div>
                        <span className="mt-2 text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                            {label}
                        </span>
                    </div>
                ))}
            </div>

            {/* Info banner */}
           
        </div>
    );
}

// Kolayca kontrol etmek için export
export { OPEN_DATE };

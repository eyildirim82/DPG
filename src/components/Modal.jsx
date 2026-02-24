import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './ui/Button';

export default function Modal({ isOpen, onClose, isUpdate }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex justify-center items-center"
          style={{
            background: 'rgba(5, 20, 36, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            className="text-center border border-dpg-gold py-10 px-5 md:py-16 md:px-16 max-w-[95%] md:max-w-[500px] bg-dpg-navy mx-2 md:mx-0"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
          >
            <h3 className="font-heading text-dpg-gold text-2xl md:text-3xl mb-3 md:mb-4 font-normal uppercase tracking-wide">
              {isUpdate ? 'Başvurunuz Güncellenmiştir' : 'Başvurunuz Alınmıştır'}
            </h3>
            <div className="text-dpg-text-muted font-light text-sm md:text-base mb-6 md:mb-8 flex flex-col gap-2">
              <p>{isUpdate ? 'Kayıt bilgileriniz başarıyla güncellenmiştir. Etkinlik detayları tarafınıza iletilecektir.' : 'Kaydınız başarıyla oluşturulmuştur. Etkinlik detayları tarafınıza iletilecektir.'}</p>
              <p className="text-white">Başvurunuz Onayladıktan sonra Masa seçimi için <strong className="text-dpg-gold font-normal">TC Kimlik numaranızla</strong> giriş yapmanız gerekiyor.</p>
            </div>
            <div className="flex flex-col gap-3 items-center mt-4">
              <Button secondary onClick={onClose} className="w-full md:w-auto min-h-[44px]">
                Takvime Ekle
              </Button>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onClose();
                }}
                className="text-dpg-text-muted no-underline text-sm hover:underline"
              >
                Kapat
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

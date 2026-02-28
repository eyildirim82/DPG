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
          onClick={() => onClose?.()}
        >
          <motion.div
            className="text-center border border-dpg-gold py-10 px-5 md:py-16 md:px-16 max-w-[95%] md:max-w-[500px] bg-dpg-navy mx-2 md:mx-0"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-heading text-dpg-gold text-2xl md:text-3xl mb-3 md:mb-4 font-normal uppercase tracking-wide">
              {isUpdate ? 'Başvurunuz Güncellenmiştir' : 'Başvurunuz Alınmıştır'}
            </h3>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import FormInput from './ui/FormInput';
import Button from './ui/Button';

export default function ContactForm() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
    });
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState(null); // null | 'success' | 'error'
    const [statusMessage, setStatusMessage] = useState('');

    const handleChange = (field) => (e) => {
        setFormData((prev) => ({ ...prev, [field]: e.target.value }));
        if (status) {
            setStatus(null);
            setStatusMessage('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus(null);
        setStatusMessage('');

        // Validation
        if (!formData.name.trim()) {
            setStatus('error');
            setStatusMessage('Lütfen adınızı giriniz.');
            return;
        }
        if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            setStatus('error');
            setStatusMessage('Lütfen geçerli bir e-posta adresi giriniz.');
            return;
        }
        if (!formData.subject.trim()) {
            setStatus('error');
            setStatusMessage('Lütfen bir konu giriniz.');
            return;
        }
        if (!formData.message.trim()) {
            setStatus('error');
            setStatusMessage('Lütfen mesajınızı yazınız.');
            return;
        }

        setSending(true);
        try {
            const { data, error } = await supabase.functions.invoke('send-bulk-email', {
                body: {
                    email_type: 'contact_form',
                    recipients: [{ email: '__ADMIN__', name: 'Admin' }],
                    extra_data: {
                        sender_name: formData.name.trim(),
                        sender_email: formData.email.trim(),
                        subject: formData.subject.trim(),
                        message: formData.message.trim(),
                    },
                },
            });

            if (error) throw error;

            setStatus('success');
            setStatusMessage('Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapılacaktır.');
            setFormData({ name: '', email: '', subject: '', message: '' });
        } catch (err) {
            console.error('Contact form error:', err);
            setStatus('error');
            setStatusMessage('Mesaj gönderilemedi. Lütfen daha sonra tekrar deneyiniz.');
        } finally {
            setSending(false);
        }
    };

    return (
        <motion.section
            id="iletisim"
            className="py-10 md:py-16 max-w-[700px] mx-auto px-4 md:px-0"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.6 }}
        >
            <div className="text-center mb-6 md:mb-8">
                <h2 className="font-heading font-normal tracking-wide uppercase text-3xl md:text-4xl text-dpg-silver text-center mb-6 md:mb-8 relative inline-block">
                    İletişim
                    <span className="block w-[60px] h-px bg-dpg-gold mt-2.5 mx-auto" />
                </h2>
                <p className="text-dpg-text-muted text-base md:text-lg font-body max-w-lg mx-auto">
                    Sorularınız veya önerileriniz için bize ulaşabilirsiniz.
                </p>
            </div>

            {/* Status Messages */}
            {status === 'success' && (
                <div className="mb-6 py-4 px-5 rounded border border-green-500/50 bg-green-500/10 text-green-400 text-base md:text-lg font-body flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{statusMessage}</span>
                </div>
            )}

            {status === 'error' && (
                <div className="mb-6 py-4 px-5 rounded border border-red-500/50 bg-red-500/10 text-red-400 text-base md:text-lg font-body flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{statusMessage}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
                <FormInput
                    type="text"
                    placeholder=" "
                    value={formData.name}
                    onChange={handleChange('name')}
                    label="Ad Soyad"
                />

                <FormInput
                    type="email"
                    placeholder=" "
                    value={formData.email}
                    onChange={handleChange('email')}
                    label="E-Posta Adresi"
                />

                <FormInput
                    type="text"
                    placeholder=" "
                    value={formData.subject}
                    onChange={handleChange('subject')}
                    label="Konu"
                />

                {/* Textarea with matching style */}
                <div className="mb-10 relative">
                    <textarea
                        rows={5}
                        placeholder=" "
                        value={formData.message}
                        onChange={handleChange('message')}
                        className="w-full bg-white/5 hover:bg-white/10 border border-white/20 rounded-md px-4 py-4 text-dpg-text font-heading text-[20px] outline-none transition-colors duration-300 min-h-[140px] resize-y"
                        style={{
                            borderColor: formData.message ? '#E6C275' : undefined,
                        }}
                    />
                    <label
                        className="absolute font-body text-sm text-dpg-text-muted uppercase tracking-widest cursor-text transition-all duration-300"
                        style={{
                            left: formData.message ? '0' : '16px',
                            top: formData.message ? '-20px' : '20px',
                            color: formData.message ? '#E6C275' : undefined,
                            fontSize: formData.message ? '0.85rem' : '1rem',
                        }}
                    >
                        Mesajınız
                    </label>
                </div>

                <Button
                    type="submit"
                    className="w-full min-h-[48px]"
                    style={{ opacity: sending ? 0.7 : 1 }}
                >
                    {sending ? 'Gönderiliyor...' : 'MESAJ GÖNDER'}
                </Button>
            </form>
        </motion.section>
    );
}

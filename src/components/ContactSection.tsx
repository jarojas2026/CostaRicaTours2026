import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Language } from '../types';
import { MessageSquare, Mail, Phone, MapPin, Send, Instagram, Facebook, Twitter } from 'lucide-react';

interface ContactSectionProps {
  language: Language;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ language }) => {
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [subject,setSubject]=useState('Consulta de disponibilidad');
  const [message,setMessage]=useState('');
  const [status,setStatus]=useState('');
  const submit=(e:React.FormEvent)=>{e.preventDefault(); const text=[`Hola Costa Rica Tours, soy ${name||'un viajero'}.`,`Email: ${email||'no indicado'}.`,`Asunto: ${subject}.`,`Mensaje: ${message||'Quisiera más información.'}`].join('\n'); window.open('https://wa.me/50687959148?text='+encodeURIComponent(text),'_blank','noopener,noreferrer'); setStatus(language==='es'?'Se abrió WhatsApp para enviar tu consulta.':'WhatsApp opened so you can send your inquiry.');};
  return (
    <section className="py-24 px-4 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        <div>
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter leading-tight italic">
            {language === 'es' ? 'Hablemos de tu Aventura' : "Let's Talk Adventure"}
          </h2>
          <p className="text-stone-400 text-lg mb-12 max-w-lg">
            {language === 'es' 
              ? '¿Tienes dudas sobre un tour o necesitas un itinerario a medida? Nuestro equipo en Pérez Zeledón está listo para ayudarte.'
              : 'Have questions about a tour or need a custom itinerary? Our team in Pérez Zeledón is ready to help.'}
          </p>

          <div className="space-y-8">
            <div className="flex items-start gap-6">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-500/20">
                <Phone className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="text-stone-500 text-xs uppercase font-bold tracking-widest mb-1">WhatsApp</div>
                <div className="text-white font-bold text-lg">+506 8795 9148</div>
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-blue-500/20">
                <Mail className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <div className="text-stone-500 text-xs uppercase font-bold tracking-widest mb-1">Email</div>
                <div className="text-white font-bold text-lg">jarojas800@gmail.com</div>
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-amber-500/20">
                <MapPin className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <div className="text-stone-500 text-xs uppercase font-bold tracking-widest mb-1">Base</div>
                <div className="text-white font-bold text-lg">Pérez Zeledón, Costa Rica</div>
              </div>
            </div>
          </div>

          <div className="mt-12 flex gap-4">
            {[Instagram, Facebook, Twitter].map((Icon, i) => (
              <button type="button" key={i} title={language === "es" ? "Red social pendiente de configurar" : "Social profile pending configuration"} onClick={() => setStatus(language === "es" ? "Este canal social aún no está configurado." : "This social channel is not configured yet.")} className="w-10 h-10 rounded-full bg-stone-900 border border-white/5 flex items-center justify-center text-stone-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-all">
                <Icon className="w-5 h-5" />
              </button>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-stone-900/50 p-8 md:p-12 rounded-[3rem] border border-white/5 shadow-2xl backdrop-blur-xl"
        >
          <form className="space-y-6" onSubmit={submit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-4">Nombre</label>
                <input 
                  type="text" 
                  className="w-full bg-stone-950/50 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="Tu nombre" value={name} onChange={e=>setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-4">Email</label>
                <input 
                  type="email" 
                  className="w-full bg-stone-950/50 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="hola@ejemplo.com" value={email} onChange={e=>setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-4">Asunto</label>
              <select value={subject} onChange={e=>setSubject(e.target.value)} className="w-full bg-stone-950/50 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 transition-colors appearance-none">
                <option>{language === 'es' ? 'Consulta de disponibilidad' : 'Availability Check'}</option>
                <option>{language === 'es' ? 'Cotización a medida' : 'Custom Quote'}</option>
                <option>{language === 'es' ? 'Soporte técnico' : 'Technical Support'}</option>
                <option>{language === 'es' ? 'Otros' : 'Other'}</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-4">Mensaje</label>
              <textarea 
                rows={4}
                className="w-full bg-stone-950/50 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder={language === 'es' ? 'Cuéntanos tu plan...' : 'Tell us your plan...'} value={message} onChange={e=>setMessage(e.target.value)}
              />
            </div>

            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black py-5 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 transition-all transform hover:-translate-y-1 active:translate-y-0">
              <Send className="w-5 h-5" />
              {language === 'es' ? 'Enviar mensaje' : 'Send message'}
            </button>
            {status && <div className="text-xs font-bold text-emerald-300" role="status">{status}</div>}
          </form>
        </motion.div>
      </div>
    </section>
  );
};

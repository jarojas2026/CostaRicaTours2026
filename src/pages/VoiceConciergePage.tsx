import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Language } from '../types';
import { VoiceConcierge } from '../components/VoiceConcierge';
import { hotelSlugFromSearch, isVoiceConciergeEnabled } from '../utils/voiceConcierge';

/**
 * /conserje — prototipo del conserje de voz (no enlazado desde el menú).
 * Modo hotel: /conserje?hotel=slug cambia solo el saludo. Se apaga con VITE_VOICE_CONCIERGE=off.
 */
export const VoiceConciergePage: React.FC<{ language: Language }> = ({ language }) => {
  const location = useLocation();
  const navigate = useNavigate();
  if (!isVoiceConciergeEnabled(import.meta.env.VITE_VOICE_CONCIERGE)) {
    return (
      <p data-testid="voice-concierge-disabled" className="py-24 text-center text-stone-300">
        {language === 'es' ? 'El conserje de voz no está disponible.' : 'The voice concierge is not available.'}
      </p>
    );
  }
  return (
    <VoiceConcierge
      language={language}
      hotel={hotelSlugFromSearch(location.search)}
      onSelectTour={(tourId) => navigate(`/tour/${tourId}`)}
    />
  );
};

export default VoiceConciergePage;

import React from 'react';
import { Language, Tour } from '../types';
import { ItineraryPlanner } from './ItineraryPlanner';
import { X } from 'lucide-react';

interface AiItineraryPlannerProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  tours: Tour[];
  onSelectTourById: (id: string) => void;
}

export const AiItineraryPlanner: React.FC<AiItineraryPlannerProps> = ({
  isOpen,
  onClose,
  language,
  tours,
  onSelectTourById
}) => {
  if (!isOpen) return null;

  const handleSelectTour = (tour: Tour) => {
    onSelectTourById(tour.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-emerald-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative bg-emerald-950 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] border-4 border-white/10 overflow-y-auto shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-10 w-10 h-10 bg-emerald-900 hover:bg-neutral-700 text-white rounded-full flex items-center justify-center border border-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <ItineraryPlanner
          language={language}
          onSelectTour={handleSelectTour}
        />
      </div>
    </div>
  );
};

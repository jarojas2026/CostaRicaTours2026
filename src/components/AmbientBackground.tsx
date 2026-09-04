import React from 'react';
import { motion } from 'motion/react';

export const AmbientBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-[#0284C7]/25 blur-[140px] mix-blend-screen animate-pulse-glow" style={{ animationDuration: '9s' }}></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#0369A1]/20 blur-[160px] mix-blend-screen animate-pulse-glow" style={{ animationDuration: '13s', animationDelay: '2s' }}></div>
      <div className="absolute top-[35%] left-[55%] w-[32vw] h-[32vw] rounded-full bg-[#F97316]/10 blur-[120px] mix-blend-screen animate-pulse-glow" style={{ animationDuration: '11s', animationDelay: '1.5s' }}></div>
      <div className="absolute bottom-[20%] left-[10%] w-[25vw] h-[25vw] rounded-full bg-[#38BDF8]/15 blur-[100px] mix-blend-screen animate-pulse-glow" style={{ animationDuration: '14s', animationDelay: '3s' }}></div>
    </div>
  );
};

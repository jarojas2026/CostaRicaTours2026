import React from 'react';
import { motion } from 'motion/react';

export const AmbientBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-teal-600/20 blur-[120px] mix-blend-screen animate-pulse-glow" style={{ animationDuration: '8s' }}></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-teal-600/20 blur-[150px] mix-blend-screen animate-pulse-glow" style={{ animationDuration: '12s', animationDelay: '2s' }}></div>
      <div className="absolute top-[40%] left-[60%] w-[30vw] h-[30vw] rounded-full bg-lime-600/10 blur-[100px] mix-blend-screen animate-pulse-glow" style={{ animationDuration: '10s', animationDelay: '1s' }}></div>
    </div>
  );
};

const fs = require('fs');

const ambient = `import React from 'react';

export const AmbientBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Deep Rainforest Emerald Canopy Glow */}
      <div 
        className="absolute top-[-10%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-[#059669]/18 blur-[150px] mix-blend-screen animate-pulse-glow" 
        style={{ animationDuration: '10s' }} 
      />
      {/* Rio Celeste / Pacific Teal Mist */}
      <div 
        className="absolute bottom-[-10%] right-[-10%] w-[55vw] h-[55vw] rounded-full bg-[#0d9488]/16 blur-[160px] mix-blend-screen animate-pulse-glow" 
        style={{ animationDuration: '14s', animationDelay: '2s' }} 
      />
      {/* Arenal Volcano Sunset Amber & Gold Glow */}
      <div 
        className="absolute top-[30%] left-[50%] w-[38vw] h-[38vw] rounded-full bg-[#f59e0b]/12 blur-[130px] mix-blend-screen animate-pulse-glow" 
        style={{ animationDuration: '12s', animationDelay: '1.5s' }} 
      />
      {/* Monteverde Cloud Forest Atmospheric Cyan Mist */}
      <div 
        className="absolute bottom-[25%] left-[5%] w-[32vw] h-[32vw] rounded-full bg-[#0284c7]/12 blur-[120px] mix-blend-screen animate-pulse-glow" 
        style={{ animationDuration: '15s', animationDelay: '3s' }} 
      />
    </div>
  );
};
`;

fs.writeFileSync('src/components/AmbientBackground.tsx', ambient);
console.log('AmbientBackground.tsx updated');

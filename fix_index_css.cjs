const fs = require('fs');

const css = `@import "tailwindcss";

@layer base {
  :root {
    --font-heading: 'Fraunces', serif;
    --font-body: 'Work Sans', sans-serif;
  }
  
  body {
    background-color: #041711; /* Deep Costa Rican Rainforest Emerald */
    color: #F8FAFC;
    font-family: 'Work Sans', sans-serif;
    overflow-x: hidden;
  }
  
  h1, h2, h3, h4, h5, h6 {
    font-family: 'Fraunces', serif;
  }
}

/* Subtle Rainforest Scrollbar */
::-webkit-scrollbar {
  width: 7px;
  height: 7px;
}
::-webkit-scrollbar-track {
  background: #03120d;
}
::-webkit-scrollbar-thumb {
  background: rgba(16, 185, 129, 0.35);
  border-radius: 9999px;
  border: 2px solid transparent;
  background-clip: content-box;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(245, 158, 11, 0.7);
  border: 2px solid transparent;
  background-clip: content-box;
}

/* For Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: rgba(16, 185, 129, 0.4) #03120d;
}

/* Glassmorphism & Tropical Jungle Panel Utilities */
.glass-panel {
  background: rgba(8, 35, 25, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(16, 185, 129, 0.2);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.35);
}

.glass-panel-light {
  background: rgba(11, 45, 33, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.glow-orange {
  box-shadow: 0 4px 25px -2px rgba(245, 158, 11, 0.45);
}

.glow-green {
  box-shadow: 0 4px 25px -2px rgba(16, 185, 129, 0.35);
}

/* Custom Scrollbar for Modal Windows */
.modal-scrollable {
  overflow-y: auto;
  scrollbar-width: thin;
}

/* Keyframes for slow ambient animations */
@keyframes pulseGlow {
  0%, 100% { opacity: 0.35; transform: scale(1); }
  50% { opacity: 0.65; transform: scale(1.06); }
}

.animate-pulse-glow {
  animation: pulseGlow 7s ease-in-out infinite;
}

/* WhatsApp Modal Mini Card Pulse Animation */
@keyframes whatsappMiniCardPulse {
  0% {
    transform: scale(0.92);
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7);
  }
  25% {
    transform: scale(1.04);
    box-shadow: 0 0 0 12px rgba(245, 158, 11, 0.35);
  }
  50% {
    transform: scale(0.98);
    box-shadow: 0 0 0 18px rgba(245, 158, 11, 0);
  }
  75% {
    transform: scale(1.02);
    box-shadow: 0 0 0 8px rgba(245, 158, 11, 0.2);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
  }
}

.whatsapp-modal-window .whatsapp-mini-card-pulse,
.whatsapp-modal-window .mini-card-pulsing {
  animation: whatsappMiniCardPulse 1.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
}

@keyframes floatDrift {
  0%, 100% { transform: translateY(0) translateX(0); }
  33% { transform: translateY(-6px) translateX(-3px); }
  66% { transform: translateY(-3px) translateX(4px); }
}

.floating-whatsapp-container {
  animation: floatDrift 8s ease-in-out infinite;
}

@keyframes scanLine {
  0% { top: 0%; }
  50% { top: 100%; }
  100% { top: 0%; }
}

.animate-scan {
  animation: scanLine 3s linear infinite;
  height: 2px;
}

.hide-scrollbar::-webkit-scrollbar { display: none; }
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

@media screen and (max-height: 600px) {
  .whatsapp-modal-window {
    max-height: 80vh !important;
  }
}
`;

fs.writeFileSync('src/index.css', css);
console.log('src/index.css updated successfully');

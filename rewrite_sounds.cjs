const fs = require('fs');

const content = `import { useCallback, useState, useEffect, useRef } from 'react';

export const useNatureSounds = (isOpen: boolean) => {
  const [isMuted, setIsMuted] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const isPlayingRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Stop previous sounds if any
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    if (isOpen && !isMuted) {
      try {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          gainNodeRef.current = audioCtxRef.current.createGain();
          gainNodeRef.current.connect(audioCtxRef.current.destination);
        }
        if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }

        const ctx = audioCtxRef.current;
        const masterGain = gainNodeRef.current!;
        
        // Reset gain to 0 and fade in
        masterGain.gain.cancelScheduledValues(ctx.currentTime);
        masterGain.gain.setValueAtTime(0, ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 2);
        
        isPlayingRef.current = true;

        // --- Rain Sound (White Noise with Lowpass) ---
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;

        const rainFilter = ctx.createBiquadFilter();
        rainFilter.type = 'lowpass';
        rainFilter.frequency.value = 350; // Deep muffled jungle rain
        
        const rainGain = ctx.createGain();
        rainGain.gain.value = 0.6;

        noiseSource.connect(rainFilter);
        rainFilter.connect(rainGain);
        rainGain.connect(masterGain);
        noiseSource.start();

        // --- Deep Jungle Hum (Low Sine) ---
        const humOsc = ctx.createOscillator();
        humOsc.type = 'sine';
        humOsc.frequency.value = 120;
        const humGain = ctx.createGain();
        humGain.gain.value = 0.05;
        humOsc.connect(humGain);
        humGain.connect(masterGain);
        humOsc.start();

        // --- Birds (Random Quick Sweeps) ---
        let timeoutId: ReturnType<typeof setTimeout>;
        const playBird = () => {
          if (!isPlayingRef.current || ctx.state === 'closed') return;
          
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sine';
          const startFreq = 2500 + Math.random() * 1500;
          osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(startFreq + 800, ctx.currentTime + 0.1);
          osc.frequency.exponentialRampToValueAtTime(startFreq - 400, ctx.currentTime + 0.2);
          
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
          
          osc.connect(gain);
          gain.connect(masterGain);
          
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.3);
          
          timeoutId = setTimeout(playBird, 1500 + Math.random() * 3500);
        };
        playBird();

        cleanupRef.current = () => {
          isPlayingRef.current = false;
          clearTimeout(timeoutId);
          if (ctx.state !== 'closed') {
            masterGain.gain.cancelScheduledValues(ctx.currentTime);
            masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
            setTimeout(() => {
              try {
                noiseSource.stop();
                humOsc.stop();
                noiseSource.disconnect();
                humOsc.disconnect();
              } catch(e) {}
            }, 1000);
          }
        };
      } catch (e) {
        console.error("Audio context initialization failed:", e);
      }
    } else {
       if (gainNodeRef.current && audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
          gainNodeRef.current.gain.cancelScheduledValues(audioCtxRef.current.currentTime);
          gainNodeRef.current.gain.linearRampToValueAtTime(0, audioCtxRef.current.currentTime + 1);
       }
       isPlayingRef.current = false;
    }
  }, [isOpen, isMuted]);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) cleanupRef.current();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const playNotification = useCallback(() => {
    if (isMuted) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      // Tropical water drop / hollow wood block sound (Costa Rican nature vibe)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
      
      setTimeout(() => {
        if (ctx.state !== 'closed') ctx.close().catch(() => {});
      }, 500);
    } catch (e) {}
  }, [isMuted]);

  return { isMuted, setIsMuted, playNotification };
};
`;

fs.writeFileSync('src/hooks/useNatureSounds.ts', content);

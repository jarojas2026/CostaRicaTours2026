import React, { useState, useRef, useEffect } from 'react';
import { Language, Tour, BookingRequest, AgentId, AIAgent } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft,
  Bot, Send, Sparkles, Mic, MicOff, User, RefreshCw, X, MessageSquare, 
  Compass, ArrowRight, Trash2, HelpCircle, CheckCircle2, Ticket, 
  Image as ImageIcon, BrainCircuit, XCircle, Leaf, Trees, ShieldCheck, 
  Info, Clock, ChevronRight, Zap, Coffee, Compass as CompassIcon, Waves, Mountain
} from 'lucide-react';
import { TOURS } from '../data/toursData';
import { getLangText, UI_TRANSLATIONS, formatCurrency } from '../utils/i18n';
import { getEcoFactForTour, getEcoFactForRegion } from '../data/ecoFacts';
import { AI_AGENTS, getAIAgentById } from '../data/aiAgentsData';

interface AIAssistantProps {
  language: Language;
  onSelectTour: (tour: Tour) => void;
  userBookings?: BookingRequest[];
  onClose?: () => void;
  onNavigateTab?: (tab: 'home' | 'tours' | 'map' | 'culture' | 'ai' | 'itinerary' | 'bookings' | 'tools' | 'flights') => void;
  onBack?: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  agentId?: AgentId;
  text: string;
  time: string;
  recommendedTours?: Tour[];
  voucher?: any;
  ecoFactData?: {
    region: string;
    regionName: string;
    title: string;
    fact: string;
    highlight: string;
    species: string[];
    stat: string;
    icon: string;
    tourTitle: string;
    tourImage?: string;
    tourId?: string;
  };
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  language,
  onSelectTour,
  userBookings = [],
  onClose,
  onNavigateTab,
  onBack,
}) => {
  const t = (key: string) => UI_TRANSLATIONS[key]?.[language] || UI_TRANSLATIONS[key]?.['es'] || key;

  const [activeAgentId, setActiveAgentId] = useState<AgentId>('concierge');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'booking' | 'nature_adventure' | 'logistics_food' | 'specialized'>('all');
  const currentAgent = getAIAgentById(activeAgentId);

  const [chatSessionId] = useState(() => {
    let sid = localStorage.getItem('chatSessionId');
    if (!sid) {
      sid = 'session_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('chatSessionId', sid);
    }
    return sid;
  });
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-concierge',
      sender: 'assistant',
      agentId: 'concierge',
      text: getLangText(AI_AGENTS[0].welcomeMessage, language),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [thinkingMode, setThinkingMode] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Load chat history from Firestore via backend
    fetch(`/api/chat/history?sessionId=${chatSessionId}`)
      .then(res => res.json())
      .then(data => {
        if (data.history && data.history.length > 0) {
          setMessages(data.history);
        }
      })
      .catch(err => console.error('Failed to load history:', err));
  }, [chatSessionId]);

  // Sync history to backend when messages change (only if we have more than the welcome message)
  useEffect(() => {
    if (messages.length > 1) {
      fetch('/api/chat/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: chatSessionId, history: messages })
      }).catch(err => console.error('Failed to sync history:', err));
    }
  }, [messages, chatSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // When switching agent, if only the welcome message exists or user wants greeting, post agent intro
  const handleSelectAgent = (agentId: AgentId) => {
    if (agentId === activeAgentId) return;
    setActiveAgentId(agentId);
    const selectedAgent = getAIAgentById(agentId);
    
    // Add welcome message from the new agent
    const introMsg: Message = {
      id: `agent-switch-${agentId}-${Date.now()}`,
      sender: 'assistant',
      agentId: agentId,
      text: getLangText(selectedAgent.welcomeMessage, language),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, introMsg]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleMicClick = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          setIsLoading(true);
          try {
            const res = await fetch('/api/gemini/transcribe-audio', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioBase64: base64Audio, language })
            });
            const data = await res.json();
            if (data.text) {
              setInputMessage((prev) => prev + (prev ? ' ' : '') + data.text);
            }
          } catch (e) {
            console.error('Transcription error', e);
          } finally {
            setIsLoading(false);
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (e) {
      console.error('Microphone access denied', e);
      alert('Cannot access microphone');
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${activeAgentId}-${Date.now()}`,
        sender: 'assistant',
        agentId: activeAgentId,
        text: getLangText(currentAgent.welcomeMessage, language),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleTourMiniCardClick = (tour: Tour) => {
    // 1. Open the tour booking modal
    onSelectTour(tour);

    // 2. Automatically generate and post an Eco-Fact for this tour's region
    const eco = getEcoFactForTour(tour, language);
    const tourTitleStr = getLangText(tour.title, language);

    const ecoMsg: Message = {
      id: `eco-fact-${tour.id}-${Date.now()}`,
      sender: 'assistant',
      agentId: activeAgentId === 'biologist' ? 'biologist' : activeAgentId,
      text: language === 'es'
        ? `🌿 **Eco-Fact de Costa Rica • ${eco.regionName}**\n\n📌 *Referente a: ${tourTitleStr}*\n\n${eco.text}\n\n🛡️ **Compromiso de Conservación:** ${eco.highlight}\n📊 **Biodiversidad Local:** ${eco.stat}`
        : `🌿 **Costa Rica Eco-Fact • ${eco.regionName}**\n\n📌 *Regarding: ${tourTitleStr}*\n\n${eco.text}\n\n🛡️ **Conservation Highlight:** ${eco.highlight}\n📊 **Local Biodiversity:** ${eco.stat}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ecoFactData: {
        region: tour.region,
        regionName: eco.regionName,
        title: eco.title,
        fact: eco.text,
        highlight: eco.highlight,
        species: eco.species,
        stat: eco.stat,
        icon: eco.icon,
        tourTitle: tourTitleStr,
        tourImage: tour.image,
        tourId: tour.id
      }
    };

    setMessages((prev) => [...prev, ecoMsg]);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputMessage;
    if ((!query.trim() && !selectedImage) || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query || (selectedImage ? (language === 'es' ? 'Imagen adjunta' : 'Image attached') : ''),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessagesList = [...messages, userMsg];
    setMessages(newMessagesList);
    if (!textToSend) setInputMessage('');
    const imageToSend = selectedImage;
    setSelectedImage(null);
    setIsLoading(true);

    const historyPayload = newMessagesList
      .filter((m) => !m.id.startsWith('welcome'))
      .map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

    try {
      if (imageToSend) {
        // Handle Image Analysis
        const response = await fetch('/api/gemini/analyze-media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mediaBase64: imageToSend.split(',')[1],
            mimeType: imageToSend.split(';')[0].split(':')[1] || 'image/jpeg',
            prompt: query || 'Analiza esta imagen de Costa Rica (fauna, flora, comida o ruta)',
            language
          }),
        });
        const data = await response.json();
        const assistantMsg: Message = {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          agentId: activeAgentId,
          text: data.analysis || '...',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        return;
      }

      const isUrgent = /urgent|urgencia|dringend/i.test(query);
      const endpoint = isUrgent ? '/api/gemini/booking/urgent' : '/api/gemini/concierge';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: historyPayload,
          language,
          thinking: thinkingMode,
          agentId: activeAgentId,
          context: {
            bookings: userBookings,
          },
        }),
      });

      const data = await response.json();

      let finalReply = data.reply || (language === 'es' ? '¡Pura Vida! ¿En qué más te puedo colaborar?' : 'Pura Vida! How else can I assist?');
      let explicitRecommendedTours: Tour[] | undefined = undefined;

      // Handle function calls to automate UI
      if (data.functionCalls && data.functionCalls.length > 0) {
        for (const call of data.functionCalls) {
          if (call.name === 'book_tour') {
            const tourId = call.args?.tourId;
            const tourToBook = TOURS.find(t => t.id === tourId) || TOURS.find(t => t.id.includes(tourId || ''));
            if (tourToBook) {
              finalReply += language === 'es' ? `\n\nAbriendo la información del tour: ${getLangText(tourToBook.title, 'es')}...` : `\n\nOpening tour details: ${getLangText(tourToBook.title, 'en')}...`;
              explicitRecommendedTours = [tourToBook];
              setTimeout(() => {
                onSelectTour(tourToBook);
              }, 1500);
            }
          } else if (call.name === 'book_flight') {
            finalReply += language === 'es' ? '\n\nRedirigiendo al radar y reserva de vuelos internacionales...' : '\n\nRedirecting to the international flight radar and booking system...';
            setTimeout(() => {
              if (onNavigateTab) onNavigateTab('flights');
            }, 1000);
          } else if (call.name === 'book_transport') {
            finalReply += language === 'es' ? '\n\nAbriendo el panel de transportes terrestres...' : '\n\nOpening the ground transportation panel...';
            setTimeout(() => {
              if (onNavigateTab) onNavigateTab('tools');
            }, 1000);
          } else if (call.name === 'open_itinerary_planner') {
            finalReply += language === 'es' ? '\n\nIniciando el planificador interactivo de itinerarios...' : '\n\nStarting the interactive itinerary planner...';
            setTimeout(() => {
              if (onNavigateTab) onNavigateTab('itinerary');
            }, 1000);
          } else if (call.name === 'view_map') {
            finalReply += language === 'es' ? '\n\nAbriendo el mapa interactivo de Costa Rica...' : '\n\nOpening the interactive map of Costa Rica...';
            setTimeout(() => {
              if (onNavigateTab) onNavigateTab('map');
            }, 1000);
          }
        }
      }

      // Find relevant tour matches in query or reply for smart UI recommendation card
      const combinedText = (query + ' ' + (data.reply || '')).toLowerCase();
      const matchedTours = explicitRecommendedTours || TOURS.filter(t => 
        combinedText.includes(t.title.es.toLowerCase()) ||
        combinedText.includes(t.title.en.toLowerCase()) ||
        (combinedText.includes('arenal') && t.region === 'arenal') ||
        (combinedText.includes('monteverde') && t.region === 'monteverde') ||
        ((combinedText.includes('perezoso') || combinedText.includes('sloth')) && t.category === 'wildlife') ||
        (combinedText.includes('rafting') && t.category === 'rafting') ||
        (combinedText.includes('manuel antonio') && t.region === 'manuel_antonio') ||
        (combinedText.includes('tortuguero') && t.region === 'tortuguero')
      ).slice(0, 2);

      const assistantMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        agentId: activeAgentId,
        text: finalReply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recommendedTours: matchedTours.length > 0 ? matchedTours : undefined,
        voucher: data.voucher || undefined,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'assistant',
          agentId: activeAgentId,
          text: language === 'es'
            ? '¡Pura Vida! Disculpa, hubo una interrupción breve en la comunicación. Por favor intenta preguntarme nuevamente.'
            : 'Pura Vida! Apologies, brief communication interruption. Please ask again.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const currentQuestions = getLangText(currentAgent.suggestedQuestions, language, []) as string[];
  const currentTags = getLangText(currentAgent.specialtyTags, language, []) as string[];

  return (
    <div className="bg-stone-950 py-6 sm:py-10 px-4 sm:px-6 lg:px-8 border-t border-white/10">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {onBack && (
          <button 
            onClick={onBack}
            className="bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-white px-4 py-2.5 rounded-full font-bold shadow-md transition-colors flex items-center gap-2 border border-white/10 w-fit cursor-pointer mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{language === 'es' ? 'Volver al Inicio' : 'Back to Home'}</span>
          </button>
        )}
        
        {/* Header Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1 bg-stone-900 text-orange-400 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            {language === 'es' ? 'Motor de Inteligencia Artificial & Orquestación con n8n' : 'AI Intelligence Engine & n8n Workflow Orchestration'}
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
            {language === 'es' ? 'Centro de Asistentes & Agentes IA de Costa Rica' : 'Costa Rica AI Travel Agents & Workflows'}
          </h2>
          <p className="text-base text-neutral-300 max-w-3xl mx-auto">
            {language === 'es'
              ? 'Interactúa con nuestro Asistente Unificado. Por detrás, nuestro servidor n8n orquesta tu solicitud hacia diferentes flujos de IA (cotizaciones, itinerarios, logística y reservas) ejecutando procesos automáticos sin que tengas que saltar de un bot a otro.'
              : 'Interact with our Unified Concierge. Behind the scenes, our n8n server routes your request to specialized AI workflows (quotes, itineraries, logistics, and bookings) executing automatic processes without you having to jump between bots.'
            }
          </p>
        </div>

        {/* Workflow Category Filter Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {[
            { id: 'all', label: { es: 'Todos (15)', en: 'All (15)' }, icon: '✨' },
            { id: 'booking', label: { es: 'Reservas & Itinerarios', en: 'Bookings' }, icon: '🧭' },
            { id: 'planning_support', label: { es: 'Asistencia & Visados', en: 'Support & Visas' }, icon: '🛂' },
            { id: 'nature_adventure', label: { es: 'Naturaleza & Aventura', en: 'Nature' }, icon: '🦥' },
            { id: 'logistics_food', label: { es: 'Logística & Gastronomía', en: 'Logistics' }, icon: '🚐' },
            { id: 'specialized', label: { es: 'Mochileros & Familias', en: 'Specialized' }, icon: '👨‍👩‍👧‍👦' },
          ].map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                  isActive
                    ? 'bg-orange-400 text-stone-950 border-orange-400 shadow-md font-black'
                    : 'bg-stone-900/60 text-stone-100 hover:bg-stone-800/80 border-white/10 hover:border-white/20'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label[language === 'es' ? 'es' : 'en']}</span>
              </button>
            );
          })}
        </div>

        {/* Multi-Agent Selector Bar */}
        <div className="bg-stone-900/60 p-2 sm:p-2.5 rounded-2xl border border-white/10 shadow-lg">
          <div className="flex items-center justify-between px-2 pb-2 text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
            <span>{language === 'es' ? 'Selecciona tu Agente Especialista:' : 'Select your Specialist Agent:'}</span>
            <span className="text-orange-400 text-[10px] font-black flex items-center gap-1">
              <Zap className="w-3 h-3 text-orange-400" />
              {language === 'es' ? 'Flujos de Trabajo en el Backend (Orquestados por n8n)' : 'Backend Workflows (Orchestrated via n8n)'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {AI_AGENTS.filter(a => selectedCategory === 'all' || a.workflowCategory === selectedCategory).map((agent) => {
              const isSelected = agent.id === activeAgentId;
              const agentName = getLangText(agent.name, language);
              const agentBadge = getLangText(agent.badge, language);

              return (
                <button
                  key={agent.id}
                  onClick={() => handleSelectAgent(agent.id)}
                  className={`relative p-2.5 sm:p-2 rounded-xl flex flex-col items-center text-center transition-all cursor-pointer border ${
                    isSelected 
                      ? 'bg-stone-950 text-white shadow-xl scale-[1.02] border-orange-400 ring-2 ring-orange-400/30' 
                      : 'bg-stone-900/40 hover:bg-stone-800/60 text-neutral-300 border-white/5 hover:border-white/20'
                  }`}
                >
                  {/* Avatar Icon */}
                  <span className="text-2xl mb-1 filter drop-shadow">
                    {agent.avatarEmoji}
                  </span>
                  
                  {/* Name */}
                  <span className="text-[11px] font-black line-clamp-1 text-white">
                    {agentName.split('•')[0]}
                  </span>

                  {/* Badge */}
                  <span className={`text-[8px] font-bold mt-1 px-1.5 py-0.5 rounded-full line-clamp-1 ${
                    isSelected 
                      ? 'bg-orange-400 text-stone-950 font-black' 
                      : 'bg-stone-950 text-teal-300 border border-teal-700/50'
                  }`}>
                    {agentBadge}
                  </span>

                  {/* Active Indicator Dot */}
                  {isSelected && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-400 animate-ping"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Agent Workflow Steps Banner */}
        {currentAgent.workflowSteps && (
          <div className="bg-stone-900/40 p-3 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-orange-400 uppercase tracking-wider">
              <CompassIcon className="w-3.5 h-3.5" />
              <span>{language === 'es' ? `Flujo de Trabajo Especializado: ${getLangText(currentAgent.name, language)}` : `Specialized Workflow: ${getLangText(currentAgent.name, language)}`}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {getLangText(currentAgent.workflowSteps, language, []).map((step: string, idx: number) => (
                <div key={idx} className="bg-stone-950/60 p-2 rounded-xl border border-white/5 text-[11px] text-neutral-300 flex items-start gap-1.5">
                  <span className="bg-orange-400 text-stone-950 font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-tight">{step.replace(/^[0-9]\.\s*/, '')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat Window Container */}
        <div className="bg-stone-950 border-2 border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[580px]">
          
          {/* Chat Header Bar with Active Agent Profile */}
          <div className="bg-stone-950 p-3 sm:p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-teal-600 rounded-full flex items-center justify-center text-white font-black text-2xl shadow-inner border border-white/20">
                {currentAgent.avatarEmoji}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm uppercase text-orange-400">
                    {getLangText(currentAgent.name, language)}
                  </h3>
                  <span className="bg-stone-900 text-stone-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-teal-700/50">
                    {getLangText(currentAgent.badge, language)}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-300 font-medium line-clamp-1">
                  {getLangText(currentAgent.role, language)}
                </p>
              </div>
            </div>

            {/* Specialty Tags */}
            <div className="hidden md:flex items-center gap-1.5">
              {currentTags.slice(0, 2).map((tag, idx) => (
                <span key={idx} className="text-[10px] bg-stone-900/80 text-stone-200 px-2 py-0.5 rounded-md border border-teal-700/40">
                  #{tag}
                </span>
              ))}
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setThinkingMode(!thinkingMode)}
                title={language === 'es' ? 'Modo de Pensamiento Profundo' : 'Deep Thinking Mode'}
                className={`p-2 transition-colors rounded-lg border flex items-center gap-1 text-xs font-bold cursor-pointer ${
                  thinkingMode 
                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' 
                    : 'bg-stone-950 text-neutral-400 border-white/10 hover:text-orange-400'
                }`}
              >
                <BrainCircuit className="w-4 h-4" />
                <span className="hidden sm:inline">Thinking: {thinkingMode ? 'ON' : 'OFF'}</span>
              </button>
              
              <button
                onClick={handleClearHistory}
                title={t('aiClearChat')}
                className="p-2 text-neutral-300 hover:text-orange-400 transition-colors rounded-lg bg-stone-950 border border-white/10 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {onClose && (
                <button onClick={onClose} className="p-2 text-white hover:text-orange-400 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-stone-950/50">
            <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const msgAgent = msg.agentId ? getAIAgentById(msg.agentId) : currentAgent;

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'assistant' && (
                    <div className="w-9 h-9 rounded-full bg-teal-600 text-white font-black flex items-center justify-center text-base flex-shrink-0 shadow-md border border-white/20">
                      {msgAgent.avatarEmoji}
                    </div>
                  )}

                  <div className={`max-w-[85%] sm:max-w-[78%] space-y-2`}>
                    {/* Agent Label if Assistant */}
                    {msg.sender === 'assistant' && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-orange-400/90 pl-1">
                        <span>{getLangText(msgAgent.name, language)}</span>
                        <span className="opacity-60">•</span>
                        <span className="text-teal-300 font-normal">{getLangText(msgAgent.badge, language)}</span>
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`p-4 rounded-2xl text-base leading-[1.6] ${
                        msg.sender === 'user'
                          ? 'bg-teal-600 text-white font-semibold rounded-tr-none shadow-md'
                          : msg.ecoFactData
                            ? 'bg-stone-900/90 text-white border-2 border-teal-400/50 rounded-tl-none shadow-xl'
                            : 'bg-stone-950 text-white border border-white/10 rounded-tl-none shadow-md'
                      }`}
                    >
                      {/* Specialized Eco-Fact Header if present */}
                      {msg.ecoFactData && (
                        <div className="mb-3 pb-3 border-b border-teal-700/60 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{msg.ecoFactData.icon}</span>
                            <div>
                              <span className="text-[10px] uppercase tracking-wider font-black text-orange-400 block">
                                {language === 'es' ? '🇨🇷 DATO ECOLÓGICO DE COSTA RICA' : '🇨🇷 COSTA RICA ECO-FACT'}
                              </span>
                              <span className="text-xs font-bold text-stone-200">
                                {msg.ecoFactData.regionName}
                              </span>
                            </div>
                          </div>
                          <span className="bg-stone-800 text-stone-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-teal-600/40 flex items-center gap-1">
                            <Leaf className="w-3 h-3 text-teal-400" />
                            100% Sostenible
                          </span>
                        </div>
                      )}

                      {msg.text.split(/(\[TOUR:[a-zA-Z0-9-]+\])/).map((part, i) => {
  if (part.startsWith('[TOUR:')) {
    const tId = part.replace('[TOUR:', '').replace(']', '');
    const foundTour = TOURS.find(t => t.id === tId);
    if (foundTour) {
      return (
        <div key={i} className="my-3 bg-white/10 border border-white/20 rounded-xl p-3 flex gap-3 items-center hover:bg-white/20 cursor-pointer transition-colors shadow-lg" onClick={() => onSelectTour && onSelectTour(foundTour)}>
           <img src={foundTour.image} alt={foundTour.title.es} className="w-16 h-16 rounded-lg object-cover shadow-md border border-white/10" />
           <div className="flex-1">
             <h4 className="font-bold text-sm text-white leading-tight mb-1">{getLangText(foundTour.title, language)}</h4>
             <span className="text-orange-400 font-black text-xs">{formatCurrency(foundTour.priceUSD, 'USD')}</span>
           </div>
           <ArrowRight className="w-4 h-4 text-white/50" />
        </div>
      );
    }
  }
  return <span key={i} className="whitespace-pre-line">{part}</span>;
})}

                      {/* Specialized Eco-Fact Interactive Details */}
                      {msg.ecoFactData && (
                        <div className="mt-4 pt-3 border-t border-teal-700/60 space-y-3">
                          {/* Protected Species Pills */}
                          {msg.ecoFactData.species && msg.ecoFactData.species.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1">
                                <Trees className="w-3 h-3 text-teal-400" />
                                {language === 'es' ? 'Especies Emblemáticas Protegidas:' : 'Key Protected Species:'}
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {msg.ecoFactData.species.map((sp, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[10px] font-semibold bg-stone-950/80 text-stone-200 px-2 py-0.5 rounded-md border border-teal-700/40"
                                  >
                                    {sp}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Action buttons inside Eco-Fact */}
                          <div className="flex flex-wrap gap-2 pt-1">
                            {msg.ecoFactData.tourId && (
                              <button
                                onClick={() => {
                                  const found = TOURS.find(t => t.id === msg.ecoFactData?.tourId);
                                  if (found) onSelectTour(found);
                                }}
                                className="text-[11px] font-black uppercase bg-orange-500 hover:bg-orange-400 text-stone-950 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                              >
                                <Ticket className="w-3.5 h-3.5" />
                                <span>{language === 'es' ? 'Ver Ficha del Tour' : 'View Tour Details'}</span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                const askPrompt = language === 'es'
                                  ? `¿Qué otras especies de fauna y proyectos ecológicos puedo ver en ${msg.ecoFactData?.regionName}?`
                                  : `What other wildlife species and eco projects can I see in ${msg.ecoFactData?.regionName}?`;
                                handleSendMessage(askPrompt);
                              }}
                              className="text-[11px] font-bold bg-stone-800 hover:bg-teal-700 text-stone-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors border border-teal-600/40 cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                              <span>{language === 'es' ? 'Preguntar más sobre esta región' : 'Ask more about this region'}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      <span className="block text-[9px] opacity-75 text-right mt-1 font-bold">
                        {msg.time}
                      </span>
                    </div>

                    {/* Recommended Tours Widget if present */}
                    {msg.recommendedTours && msg.recommendedTours.length > 0 && (
                      <div className="bg-stone-950 p-3 rounded-2xl border border-orange-500/40 space-y-2 shadow-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-orange-400 flex items-center gap-1">
                            <Compass className="w-3.5 h-3.5" />
                            {language === 'es' ? 'Excursión Mencionada (Clic para ver & Eco-Fact):' : 'Mentioned Excursion (Click to View & Eco-Fact):'}
                          </span>
                          <span className="text-[9px] text-teal-300 font-bold bg-stone-900/60 px-2 py-0.5 rounded-full border border-teal-700/40 flex items-center gap-1">
                            <Leaf className="w-2.5 h-2.5 text-teal-400" />
                            Eco-Fact
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {msg.recommendedTours.map((t) => (
                            <div
                              key={t.id}
                              onClick={() => handleTourMiniCardClick(t)}
                              className="bg-stone-950 hover:bg-stone-900 p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-all border border-white/10 hover:border-teal-500/50 group"
                            >
                              <div className="flex items-center gap-2.5">
                                <img src={t.image} alt={getLangText(t.title, language)} className="w-11 h-11 rounded-lg object-cover group-hover:scale-105 transition-transform" />
                                <div>
                                  <span className="text-xs font-bold text-white block line-clamp-1 group-hover:text-orange-300 transition-colors">
                                    {getLangText(t.title, language)}
                                  </span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-orange-400 font-black">${t.priceUSD} USD</span>
                                    <span className="text-[9px] text-stone-200 font-semibold bg-stone-900/80 px-1.5 py-0.2 rounded border border-teal-600/30 flex items-center gap-0.5">
                                      <Clock className="w-2.5 h-2.5 text-teal-400" />
                                      {t.durationHours ? `${t.durationHours} hrs` : (t.durationLabel ? getLangText(t.durationLabel, language) : '4 hrs')}
                                    </span>
                                    <span className="text-[9px] text-teal-300 font-semibold flex items-center gap-0.5">
                                      <Leaf className="w-2.5 h-2.5 text-teal-400" />
                                      {getEcoFactForTour(t, language).regionName}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTourMiniCardClick(t);
                                }}
                                className="bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-black uppercase px-2.5 py-1.5 rounded-full flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                              >
                                <span>{language === 'es' ? 'Ver & Eco-Fact' : 'View & Eco-Fact'}</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Urgent Booking Voucher Widget */}
                    {msg.voucher && (
                      <div className="bg-stone-950 p-4 rounded-2xl border border-orange-400 space-y-3 shadow-[0_0_15px_rgba(52,211,153,0.3)] mt-2">
                        <div className="flex items-center justify-between border-b border-stone-900 pb-2">
                          <span className="text-[11px] font-black uppercase text-orange-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            {language === 'es' ? 'VOUCHER CONFIRMADO' : 'CONFIRMED VOUCHER'}
                          </span>
                          <span className="text-[10px] font-mono text-stone-200 bg-stone-900/50 px-2 py-0.5 rounded">
                            {msg.voucher.bookingId}
                          </span>
                        </div>
                        
                        <div className="space-y-1.5 text-xs text-stone-100">
                          <p className="flex justify-between">
                            <span className="opacity-70">{language === 'es' ? 'Tour:' : 'Tour:'}</span>
                            <span className="font-bold text-white">{msg.voucher.tourName}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="opacity-70">{language === 'es' ? 'Fecha:' : 'Date:'}</span>
                            <span className="font-bold text-white">{msg.voucher.date}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="opacity-70">{language === 'es' ? 'Pasajeros:' : 'Passengers:'}</span>
                            <span className="font-bold text-white">{msg.voucher.adults} Ad. {msg.voucher.children > 0 && `, ${msg.voucher.children} Ch.`}</span>
                          </p>
                          <p className="flex justify-between pt-1 border-t border-stone-900/50 mt-1">
                            <span className="opacity-70">{language === 'es' ? 'Total (Pago en destino):' : 'Total (Pay at destination):'}</span>
                            <span className="font-black text-orange-400">${msg.voucher.totalUSD} USD</span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {msg.sender === 'user' && (
                    <div className="w-9 h-9 rounded-full bg-stone-900 text-neutral-300 font-black flex items-center justify-center text-xs flex-shrink-0 border border-white/10">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </motion.div>
              );
            })}
            </AnimatePresence>

            {isLoading && (
              <div className="flex items-center gap-3 text-xs text-neutral-300 italic">
                <div className="w-9 h-9 rounded-full bg-teal-600 text-white font-black flex items-center justify-center text-base">
                  {currentAgent.avatarEmoji}
                </div>
                <div className="bg-stone-950 p-3 rounded-2xl border border-white/10 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-400" />
                  <span>{getLangText(currentAgent.name, language)} {language === 'es' ? 'está redactando tu respuesta...' : 'is typing response...'}</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Active Bookings Context Banner if present */}
          {userBookings.length > 0 && (
            <div className="bg-stone-950 px-4 py-1.5 border-t border-white/10 flex items-center justify-between text-[11px]">
              <span className="text-orange-400 font-bold flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 text-orange-400" />
                {language === 'es' ? 'Última Reserva:' : 'Latest Booking:'} #{userBookings[0].bookingId} ({userBookings[0].tourName})
              </span>
              <span className="text-orange-400 font-bold">{userBookings[0].status}</span>
            </div>
          )}

          {/* Quick Suggested Chips for Current Agent */}
          <div className="bg-stone-950 px-4 py-2 border-t border-white/10 flex gap-2 overflow-x-auto scrollbar-none">
            {currentQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                disabled={isLoading}
                className="bg-stone-950 hover:bg-stone-900 text-neutral-300 hover:text-orange-400 border border-white/10 text-[11px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap transition-colors flex-shrink-0 cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Selected Image Preview */}
          {selectedImage && (
            <div className="px-4 py-2 bg-stone-950 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={selectedImage} alt="Upload preview" className="w-12 h-12 rounded object-cover border border-orange-500/50" />
                <span className="text-xs text-stone-200">
                  {language === 'es' ? 'Imagen lista para análisis ecológico o de viaje' : 'Image ready for travel/wildlife analysis'}
                </span>
              </div>
              <button onClick={() => setSelectedImage(null)} className="text-neutral-400 hover:text-red-400 cursor-pointer">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Input Form */}
          <div className="p-3 sm:p-4 bg-stone-950 border-t border-white/10">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-2 relative"
            >
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                className="hidden" 
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="flex-shrink-0 w-[48px] h-[48px] flex items-center justify-center rounded-xl border bg-stone-900 border-white/10 text-orange-400 hover:bg-stone-800 transition-colors disabled:opacity-50 cursor-pointer"
                title={language === 'es' ? 'Subir Foto de Fauna/Ruta' : 'Upload Wildlife/Route Photo'}
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleMicClick}
                disabled={isLoading}
                className={`flex-shrink-0 w-[48px] h-[48px] flex items-center justify-center rounded-xl border transition-all cursor-pointer ${
                  isRecording 
                    ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse' 
                    : 'bg-stone-900 border-white/10 text-orange-400 hover:bg-stone-800'
                }`}
                title={isRecording ? 'Detener grabación' : 'Grabar audio por voz'}
              >
                {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={
                  language === 'es'
                    ? `Pregunta a ${getLangText(currentAgent.name, language)}...`
                    : `Ask ${getLangText(currentAgent.name, language)}...`
                }
                disabled={isLoading || isRecording}
                className="flex-1 bg-stone-950 border border-white/10 focus:border-orange-400 text-white px-4 py-3 rounded-xl text-base focus:outline-none placeholder-orange-300/40"
              />
              <button
                type="submit"
                disabled={isLoading || (!inputMessage.trim() && !selectedImage)}
                className="bg-teal-600 hover:bg-teal-500 text-white font-black px-5 py-3 rounded-xl text-xs uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">{t('aiSend')}</span>
              </button>
            </form>
          </div>

        </div>

        {/* 8-Agent Showcase Grid Cards with Workflow Steps */}
        <div className="pt-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
              <Bot className="w-5 h-5 text-orange-400" />
              {language === 'es' ? 'Equipo de Asesores & Flujos IA de Costa Rica' : 'Costa Rica AI Advisory & Workflow Team'}
            </h3>
            <span className="text-xs text-neutral-300 font-bold">
              {language === 'es' ? 'Procesamiento automático de tus solicitudes en backend' : 'Automatic processing of your requests in the backend'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {AI_AGENTS.filter(a => selectedCategory === 'all' || a.workflowCategory === selectedCategory).map((agent) => {
              const isCurrent = agent.id === activeAgentId;
              const agentName = getLangText(agent.name, language);
              const agentRole = getLangText(agent.role, language);
              const agentDesc = getLangText(agent.description, language);
              const agentBadge = getLangText(agent.badge, language);
              const workflowSteps = getLangText(agent.workflowSteps, language, []) as string[];

              return (
                <div
                  key={agent.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    isCurrent 
                      ? 'bg-stone-900/80 border-orange-400 shadow-lg ring-1 ring-orange-400/40' 
                      : 'bg-stone-950/80 hover:bg-stone-900/50 border-white/10'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-3xl p-1.5 bg-stone-900 rounded-xl border border-white/10 shadow-sm">
                          {agent.avatarEmoji}
                        </span>
                        <div>
                          <h4 className="font-black text-white text-sm">
                            {agentName}
                          </h4>
                          <span className="text-[10px] font-bold text-orange-400">
                            {agentBadge}
                          </span>
                        </div>
                      </div>
                      {isCurrent && (
                        <span className="text-[10px] bg-orange-400 text-stone-950 font-black px-2 py-0.5 rounded-full uppercase">
                          {language === 'es' ? 'En Uso' : 'Active'}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-neutral-300 leading-relaxed line-clamp-3">
                      {agentDesc}
                    </p>

                    {/* Workflow steps micro-list */}
                    {workflowSteps.length > 0 && (
                      <div className="pt-2 border-t border-white/5 space-y-1">
                        <span className="text-[9px] font-black uppercase text-orange-400/90 tracking-wider block">
                          {language === 'es' ? 'Flujo de trabajo:' : 'Workflow:'}
                        </span>
                        <div className="space-y-0.5">
                          {workflowSteps.slice(0, 3).map((step, sIdx) => (
                            <div key={sIdx} className="text-[10px] text-neutral-400 flex items-center gap-1.5 line-clamp-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-400/60 shrink-0"></span>
                              <span className="truncate">{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[10px] text-teal-300 font-semibold truncate max-w-[110px]">
                      {getLangText(agent.specialtyTags, language, [])[0]}
                    </span>
                    <button
                      onClick={() => handleSelectAgent(agent.id)}
                      className={`text-xs font-black uppercase px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-orange-400 text-stone-950 shadow-sm'
                          : 'bg-stone-800 hover:bg-teal-700 text-white border border-teal-600/50'
                      }`}
                    >
                      <span>{isCurrent ? (language === 'es' ? 'Agente Activo' : 'Active Agent') : (language === 'es' ? 'Consultar' : 'Consult')}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

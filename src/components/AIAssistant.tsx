import React, { useState, useRef, useEffect } from 'react';
import { Language, Tour, BookingRequest, AgentId, AIAgent } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft,
  Bot, Send, Sparkles, Mic, MicOff, User, RefreshCw, X, MessageSquare, 
  Compass, ArrowRight, Trash2, HelpCircle, CheckCircle2, Ticket, 
  Image as ImageIcon, BrainCircuit, XCircle, Leaf, Trees, ShieldCheck, 
  Info, Clock, ChevronRight, Zap, Coffee, Compass as CompassIcon, Waves, Mountain
} from 'lucide-react';
import { useTours } from '../contexts/ToursContext';
import { getLangText, UI_TRANSLATIONS, formatCurrency } from '../utils/i18n';
import { getEcoFactForTour, getEcoFactForRegion } from '../data/ecoFacts';
import { AI_AGENTS, getAIAgentById } from '../data/aiAgentsData';
import { N8NWorkflowStudio } from './N8NWorkflowStudio';
import { ClaudeItineraryModal } from './ClaudeItineraryModal';

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
  modelUsed?: string;
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
  const { tours: TOURS } = useTours();
  const t = (key: string) => UI_TRANSLATIONS[key]?.[language] || UI_TRANSLATIONS[key]?.['es'] || key;

  const [activeAgentId, setActiveAgentId] = useState<AgentId>('concierge');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'booking' | 'nature_adventure' | 'logistics_food' | 'specialized'>('all');
  const [subTab, setSubTab] = useState<'chat' | 'n8n'>('chat');
  const currentAgent = getAIAgentById(activeAgentId);

  const [chatSessionId] = useState(() => {
    let sid = localStorage.getItem('chatSessionId');
    if (!sid) {
      sid = 'session_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('chatSessionId', sid);
    }
    return sid;
  });

  // Isolated chat histories per agent to prevent cross-contamination
  const [messagesByAgent, setMessagesByAgent] = useState<Record<string, Message[]>>(() => {
    const initial: Record<string, Message[]> = {};
    AI_AGENTS.forEach((ag) => {
      const cached = localStorage.getItem(`chat_history_${ag.id}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            initial[ag.id] = parsed;
            return;
          }
        } catch (e) {}
      }
      initial[ag.id] = [
        {
          id: `welcome-${ag.id}`,
          sender: 'assistant',
          agentId: ag.id,
          text: getLangText(ag.welcomeMessage, language),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ];
    });
    return initial;
  });

  // Current active agent's messages
  const messages = messagesByAgent[activeAgentId] || [
    {
      id: `welcome-${activeAgentId}`,
      sender: 'assistant',
      agentId: activeAgentId,
      text: getLangText(currentAgent.welcomeMessage, language),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ];

  const setMessages = (updater: Message[] | ((prev: Message[]) => Message[])) => {
    setMessagesByAgent((prev) => {
      const current = prev[activeAgentId] || [];
      const next = typeof updater === 'function' ? updater(current) : updater;
      try {
        localStorage.setItem(`chat_history_${activeAgentId}`, JSON.stringify(next));
      } catch (e) {}
      return {
        ...prev,
        [activeAgentId]: next,
      };
    });
  };

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [thinkingMode, setThinkingMode] = useState(false);
  const [aiEngine, setAiEngine] = useState<'claude' | 'gemini'>('claude');
  const [isItineraryModalOpen, setIsItineraryModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load chat history from Firestore scoped to active agent
  useEffect(() => {
    const scopedSessionId = `${chatSessionId}_${activeAgentId}`;
    fetch(`/api/chat/history?sessionId=${scopedSessionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.history && data.history.length > 0) {
          setMessagesByAgent((prev) => ({
            ...prev,
            [activeAgentId]: data.history,
          }));
        }
      })
      .catch((err) => console.error('Failed to load agent history:', err));
  }, [chatSessionId, activeAgentId]);

  // Sync active agent history to backend when messages change (if more than welcome msg)
  useEffect(() => {
    const currentMsgs = messagesByAgent[activeAgentId];
    if (currentMsgs && currentMsgs.length > 1) {
      const scopedSessionId = `${chatSessionId}_${activeAgentId}`;
      fetch('/api/chat/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: scopedSessionId, history: currentMsgs }),
      }).catch((err) => console.error('Failed to sync agent history:', err));
    }
  }, [messagesByAgent, activeAgentId, chatSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Seamless agent switching with clean isolated context
  const handleSelectAgent = (agentId: AgentId) => {
    if (agentId === activeAgentId) return;
    setActiveAgentId(agentId);
    setInputMessage('');
    setSelectedImage(null);
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
    const scopedSessionId = `${chatSessionId}_${activeAgentId}`;
    fetch(`/api/chat/history?sessionId=${scopedSessionId}`, { method: 'DELETE' }).catch(console.error);
    try {
      localStorage.removeItem(`chat_history_${activeAgentId}`);
    } catch (e) {}
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
          engine: aiEngine,
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
        modelUsed: data.modelUsed || (aiEngine === 'claude' ? 'Claude 3.5 Sonnet' : 'Gemini 2.5 Flash'),
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
    <div className="bg-[#03150d] py-6 sm:py-10 px-4 sm:px-6 lg:px-8 border-t border-emerald-500/20 relative overflow-hidden">
      {/* Background ambient lighting effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-6 relative z-10">
        
        {onBack && (
          <button 
            onClick={onBack}
            className="bg-[#072418] hover:bg-[#0c3524] text-emerald-300 hover:text-white px-4 py-2.5 rounded-full font-bold shadow-md transition-colors flex items-center gap-2 border border-emerald-500/30 w-fit cursor-pointer mb-2"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>{language === 'es' ? 'Volver al Inicio' : 'Back to Home'}</span>
          </button>
        )}
        
        {/* Header Title */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#051c14] text-amber-400 rounded-full text-xs font-bold uppercase tracking-widest border border-amber-400/30 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            {language === 'es' ? 'Motor de Inteligencia Artificial & Orquestación con n8n' : 'AI Intelligence Engine & n8n Workflow Orchestration'}
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
            {language === 'es' ? 'Centro de Asistentes & Agentes IA de Costa Rica' : 'Costa Rica AI Travel Agents & Workflows'}
          </h2>
          <p className="text-sm sm:text-base text-emerald-100/70 max-w-3xl mx-auto leading-relaxed">
            {language === 'es'
              ? 'Interactúa con nuestro Asistente Unificado o explora los 19 flujos operativos en n8n que orquestan reservas en Firestore, pasarelas de pago y contingencias climáticas.'
              : 'Interact with our Unified Concierge or explore the 19 operational n8n workflows orchestrating Firestore bookings, payment gateways, and weather contingencies.'
            }
          </p>

          {/* SubTab Switcher: Chat Agents vs n8n Workflows */}
          <div className="flex items-center justify-center pt-3">
            <div className="bg-[#020e08] p-1.5 rounded-2xl border border-emerald-500/30 inline-flex items-center gap-2 shadow-2xl">
              <button
                onClick={() => setSubTab('chat')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                  subTab === 'chat'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 shadow-md scale-105'
                    : 'text-emerald-200/80 hover:text-white hover:bg-[#072418]'
                }`}
              >
                <Bot className="w-4 h-4" />
                <span>{language === 'es' ? 'Chat con Agentes Especialistas' : 'Specialist Agents Chat'}</span>
              </button>

              <button
                onClick={() => setSubTab('n8n')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                  subTab === 'n8n'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 shadow-md scale-105'
                    : 'text-emerald-200/80 hover:text-white hover:bg-[#072418]'
                }`}
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>{language === 'es' ? 'Flujos & Automatizaciones n8n' : 'n8n Workflows & Pipelines'}</span>
                <span className="bg-emerald-500 text-stone-950 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  PROD
                </span>
              </button>
            </div>
          </div>
        </div>

        {subTab === 'n8n' ? (
          <N8NWorkflowStudio language={language} />
        ) : (
          <>
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
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                  isActive
                    ? 'bg-amber-400 text-stone-950 border-amber-400 shadow-md font-black scale-105'
                    : 'bg-[#051c14] text-emerald-200/80 hover:bg-[#0a2e21] border-emerald-500/20 hover:border-emerald-500/50'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label[language === 'es' ? 'es' : 'en']}</span>
              </button>
            );
          })}
        </div>

        {/* Multi-Agent Selector Bar */}
        <div className="bg-[#051c14]/90 backdrop-blur-xl p-3 sm:p-3.5 rounded-2xl border border-emerald-500/25 shadow-xl">
          <div className="flex items-center justify-between px-2 pb-2 text-[11px] font-bold text-emerald-400/80 uppercase tracking-wider">
            <span>{language === 'es' ? 'Selecciona tu Agente Especialista:' : 'Select your Specialist Agent:'}</span>
            <button
              onClick={() => setSubTab('n8n')}
              className="text-amber-400 hover:text-amber-300 text-[10px] font-black flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>{language === 'es' ? 'Ver Pipelines en n8n Studio ⚡' : 'View Pipelines in n8n Studio ⚡'}</span>
            </button>
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
                      ? 'bg-[#0a3325] text-white shadow-xl scale-[1.03] border-amber-400 ring-2 ring-amber-400/30' 
                      : 'bg-[#020e08]/60 hover:bg-[#072418] text-emerald-100/70 border-emerald-500/20 hover:border-emerald-500/40'
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
                      ? 'bg-amber-400 text-stone-950 font-black' 
                      : 'bg-[#03150d] text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {agentBadge}
                  </span>

                  {/* Active Indicator Dot */}
                  {isSelected && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Agent Workflow Steps Banner - Modern Connected Pipeline */}
        {currentAgent.workflowSteps && (
          <div className="bg-[#03180f]/90 p-4 rounded-2xl border border-emerald-500/30 shadow-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black text-amber-400 uppercase tracking-wider">
                <CompassIcon className="w-4 h-4 text-amber-400" />
                <span>{language === 'es' ? `Pipeline Operativo: ${getLangText(currentAgent.name, language)}` : `Operational Pipeline: ${getLangText(currentAgent.name, language)}`}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>{language === 'es' ? 'Nodos Autónomos Conectados' : 'Autonomous Connected Nodes'}</span>
              </div>
            </div>

            {/* Visual Connected Step Nodes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 relative">
              {getLangText(currentAgent.workflowSteps, language, []).map((step: string, idx: number, arr: any[]) => (
                <div 
                  key={idx} 
                  className="relative group bg-[#020e08]/90 hover:bg-[#062417] p-3 rounded-xl border border-emerald-500/25 hover:border-amber-400/60 transition-all duration-300 flex items-start gap-2.5 shadow-md"
                >
                  <div className="relative shrink-0 mt-0.5">
                    <span className="bg-gradient-to-br from-amber-400 to-amber-500 text-stone-950 font-black text-[11px] w-6 h-6 rounded-lg flex items-center justify-center shadow-md shadow-amber-400/20">
                      0{idx + 1}
                    </span>
                    {idx < arr.length - 1 && (
                      <span className="hidden lg:block absolute -right-3.5 top-1/2 -translate-y-1/2 w-2 h-0.5 bg-emerald-500/40 z-10" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                      Nodo {idx + 1}
                    </div>
                    <div className="text-xs text-stone-200 leading-snug mt-0.5 group-hover:text-white transition-colors">
                      {step.replace(/^[0-9]\.\s*/, '')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat Window Container */}
        <div className="bg-[#051c14]/95 backdrop-blur-2xl border border-emerald-500/30 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[580px]">
          
          {/* Chat Header Bar with Active Agent Profile */}
          <div className="bg-[#020e08] p-3 sm:p-4 border-b border-emerald-500/20 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-emerald-950 rounded-full flex items-center justify-center text-white font-black text-2xl shadow-inner border border-emerald-500/40">
                {currentAgent.avatarEmoji}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm uppercase text-amber-400">
                    {getLangText(currentAgent.name, language)}
                  </h3>
                  <span className="bg-emerald-950/80 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40">
                    {getLangText(currentAgent.badge, language)}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-100/70 font-medium line-clamp-1">
                  {getLangText(currentAgent.role, language)}
                </p>
              </div>
            </div>

            {/* Specialty Tags */}
            <div className="hidden md:flex items-center gap-1.5">
              {currentTags.slice(0, 2).map((tag, idx) => (
                <span key={idx} className="text-[10px] bg-emerald-950/60 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/30">
                  #{tag}
                </span>
              ))}
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2">
              {/* AI Engine Switcher (Claude vs Gemini) */}
              <div className="hidden sm:flex items-center bg-[#051c14] p-0.5 rounded-xl border border-emerald-500/30 text-[11px] font-bold">
                <button
                  onClick={() => setAiEngine('claude')}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                    aiEngine === 'claude'
                      ? 'bg-amber-400 text-stone-950 shadow-sm font-black'
                      : 'text-stone-400 hover:text-white'
                  }`}
                  title="Anthropic Claude 3.5 Sonnet (Google Cloud Vertex AI)"
                >
                  <span>🧠 Claude 3.5</span>
                </button>
                <button
                  onClick={() => setAiEngine('gemini')}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                    aiEngine === 'gemini'
                      ? 'bg-emerald-500 text-stone-950 shadow-sm font-black'
                      : 'text-stone-400 hover:text-white'
                  }`}
                  title="Google Gemini 2.5 Flash"
                >
                  <span>⚡ Gemini 2.5</span>
                </button>
              </div>

              {/* Claude Itinerary Planner Button */}
              <button
                onClick={() => setIsItineraryModalOpen(true)}
                title={language === 'es' ? 'Planificador Experto Claude' : 'Claude Itinerary Planner'}
                className="p-1.5 sm:px-2.5 sm:py-1.5 transition-all rounded-lg border bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border-amber-400/50 flex items-center gap-1 text-xs font-bold cursor-pointer shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">{language === 'es' ? 'Itinerario Claude' : 'Claude Itinerary'}</span>
              </button>

              <button
                onClick={() => setThinkingMode(!thinkingMode)}
                title={language === 'es' ? 'Modo de Pensamiento Profundo' : 'Deep Thinking Mode'}
                className={`p-2 transition-colors rounded-lg border flex items-center gap-1 text-xs font-bold cursor-pointer ${
                  thinkingMode 
                    ? 'bg-amber-400/20 text-amber-300 border-amber-400/50' 
                    : 'bg-[#020e08] text-stone-400 border-emerald-500/20 hover:text-amber-400'
                }`}
              >
                <BrainCircuit className="w-4 h-4" />
                <span className="hidden sm:inline">Thinking: {thinkingMode ? 'ON' : 'OFF'}</span>
              </button>
              
              <button
                onClick={handleClearHistory}
                title={t('aiClearChat')}
                className="p-2 text-stone-400 hover:text-red-400 transition-colors rounded-lg bg-[#020e08] border border-emerald-500/20 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {onClose && (
                <button onClick={onClose} className="p-2 text-stone-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#020e08]/60">
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
                    <div className="w-9 h-9 rounded-full bg-emerald-950 text-white font-black flex items-center justify-center text-base flex-shrink-0 shadow-md border border-emerald-500/30">
                      {msgAgent.avatarEmoji}
                    </div>
                  )}

                  <div className={`max-w-[85%] sm:max-w-[78%] space-y-2`}>
                    {/* Agent Label if Assistant */}
                    {msg.sender === 'assistant' && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400/90 pl-1">
                        <span>{getLangText(msgAgent.name, language)}</span>
                        <span className="opacity-60">•</span>
                        <span className="text-emerald-300 font-normal">{getLangText(msgAgent.badge, language)}</span>
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`p-4 rounded-2xl text-sm sm:text-base leading-[1.6] ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium rounded-tr-none shadow-lg'
                          : msg.ecoFactData
                            ? 'bg-[#07281c] text-emerald-50 border-2 border-emerald-400/50 rounded-tl-none shadow-xl'
                            : 'bg-[#051c14] text-emerald-50 border border-emerald-500/30 rounded-tl-none shadow-md'
                      }`}
                    >
                      {/* Specialized Eco-Fact Header if present */}
                      {msg.ecoFactData && (
                        <div className="mb-3 pb-3 border-b border-emerald-500/30 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{msg.ecoFactData.icon}</span>
                            <div>
                              <span className="text-[10px] uppercase tracking-wider font-black text-amber-400 block">
                                {language === 'es' ? '🇨🇷 DATO ECOLÓGICO DE COSTA RICA' : '🇨🇷 COSTA RICA ECO-FACT'}
                              </span>
                              <span className="text-xs font-bold text-emerald-200">
                                {msg.ecoFactData.regionName}
                              </span>
                            </div>
                          </div>
                          <span className="bg-emerald-950 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1">
                            <Leaf className="w-3 h-3 text-emerald-400" />
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
        <div key={i} className="my-3 bg-[#020e08] border border-emerald-500/30 rounded-xl p-3 flex gap-3 items-center hover:border-amber-400/60 cursor-pointer transition-colors shadow-lg" onClick={() => onSelectTour && onSelectTour(foundTour)}>
           <img src={foundTour.image} alt={foundTour.title.es} className="w-16 h-16 rounded-lg object-cover shadow-md border border-emerald-500/30" />
           <div className="flex-1">
             <h4 className="font-bold text-sm text-white leading-tight mb-1">{getLangText(foundTour.title, language)}</h4>
             <span className="text-amber-400 font-black text-xs">{formatCurrency(foundTour.priceUSD, 'USD')}</span>
           </div>
           <ArrowRight className="w-4 h-4 text-emerald-400" />
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
                                    className="text-[10px] font-semibold bg-white/80 text-stone-800 px-2 py-0.5 rounded-md border border-teal-700/40"
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
                                className="text-[11px] font-black uppercase bg-amber-400 hover:bg-amber-300 text-stone-950 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
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
                              className="text-[11px] font-bold bg-[#020e08] hover:bg-emerald-900/60 text-emerald-200 hover:text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors border border-emerald-500/30 cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                              <span>{language === 'es' ? 'Preguntar más sobre esta región' : 'Ask more about this region'}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[9px] opacity-80 mt-1.5 font-bold">
                        {msg.modelUsed ? (
                          <span className={`px-2 py-0.5 rounded text-[8px] tracking-wide font-black uppercase flex items-center gap-1 ${
                            msg.modelUsed.toLowerCase().includes('claude')
                              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                          }`}>
                            <span>{msg.modelUsed.toLowerCase().includes('claude') ? '🧠' : '⚡'}</span>
                            <span>{msg.modelUsed}</span>
                          </span>
                        ) : (
                          <span />
                        )}
                        <span>{msg.time}</span>
                      </div>
                    </div>

                    {/* Recommended Tours Widget if present */}
                    {msg.recommendedTours && msg.recommendedTours.length > 0 && (
                      <div className="bg-[#03150d] p-3 rounded-2xl border border-amber-400/40 space-y-2 shadow-xl">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-amber-400 flex items-center gap-1">
                            <Compass className="w-3.5 h-3.5" />
                            {language === 'es' ? 'Excursión Mencionada (Clic para ver & Eco-Fact):' : 'Mentioned Excursion (Click to View & Eco-Fact):'}
                          </span>
                          <span className="text-[9px] text-emerald-300 font-bold bg-[#051c14] px-2 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1">
                            <Leaf className="w-2.5 h-2.5 text-emerald-400" />
                            Eco-Fact
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {msg.recommendedTours.map((t) => (
                            <div
                              key={t.id}
                              onClick={() => handleTourMiniCardClick(t)}
                              className="bg-[#051c14] hover:bg-[#092b1f] p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-all border border-emerald-500/20 hover:border-amber-400/60 group shadow-sm"
                            >
                              <div className="flex items-center gap-2.5">
                                <img src={t.image} alt={getLangText(t.title, language)} className="w-11 h-11 rounded-lg object-cover group-hover:scale-105 transition-transform border border-emerald-500/20" />
                                <div>
                                  <span className="text-xs font-bold text-white block line-clamp-1 group-hover:text-amber-300 transition-colors">
                                    {getLangText(t.title, language)}
                                  </span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-amber-400 font-black">${t.priceUSD} USD</span>
                                    <span className="text-[9px] text-emerald-200/80 font-semibold bg-[#020e08] px-1.5 py-0.5 rounded border border-emerald-500/30 flex items-center gap-0.5">
                                      <Clock className="w-2.5 h-2.5 text-amber-400" />
                                      {t.durationHours ? `${t.durationHours} hrs` : (t.durationLabel ? getLangText(t.durationLabel, language) : '4 hrs')}
                                    </span>
                                    <span className="text-[9px] text-emerald-300 font-semibold flex items-center gap-0.5">
                                      <Leaf className="w-2.5 h-2.5 text-emerald-400" />
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
                                className="bg-amber-400 hover:bg-amber-300 text-stone-950 text-[10px] font-black uppercase px-3 py-1.5 rounded-full flex items-center gap-1 shadow-md transition-all cursor-pointer"
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
                      <div className="bg-[#03150d] p-4 rounded-2xl border border-amber-400 space-y-3 shadow-[0_0_20px_rgba(245,158,11,0.2)] mt-2">
                        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                          <span className="text-[11px] font-black uppercase text-amber-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            {language === 'es' ? 'VOUCHER CONFIRMADO' : 'CONFIRMED VOUCHER'}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-300 bg-[#020e08] px-2 py-0.5 rounded border border-emerald-500/30">
                            {msg.voucher.bookingId}
                          </span>
                        </div>
                        
                        <div className="space-y-1.5 text-xs text-stone-200">
                          <p className="flex justify-between">
                            <span className="text-emerald-200/60">{language === 'es' ? 'Tour:' : 'Tour:'}</span>
                            <span className="font-bold text-white">{msg.voucher.tourName}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-emerald-200/60">{language === 'es' ? 'Fecha:' : 'Date:'}</span>
                            <span className="font-bold text-white">{msg.voucher.date}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-emerald-200/60">{language === 'es' ? 'Pasajeros:' : 'Passengers:'}</span>
                            <span className="font-bold text-white">{msg.voucher.adults} Ad. {msg.voucher.children > 0 && `, ${msg.voucher.children} Ch.`}</span>
                          </p>
                          <p className="flex justify-between pt-1 border-t border-emerald-500/20 mt-1">
                            <span className="text-emerald-200/60">{language === 'es' ? 'Total (Pago en destino):' : 'Total (Pay at destination):'}</span>
                            <span className="font-black text-amber-400">${msg.voucher.totalUSD} USD</span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {msg.sender === 'user' && (
                    <div className="w-9 h-9 rounded-full bg-emerald-900 text-amber-400 font-black flex items-center justify-center text-xs flex-shrink-0 border border-emerald-500/30 shadow-md">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </motion.div>
              );
            })}
            </AnimatePresence>

            {isLoading && (
              <div className="flex items-center gap-3 text-xs text-emerald-200/70 italic">
                <div className="w-9 h-9 rounded-full bg-emerald-950 text-white font-black flex items-center justify-center text-base border border-emerald-500/30">
                  {currentAgent.avatarEmoji}
                </div>
                <div className="bg-[#051c14] p-3 rounded-2xl border border-emerald-500/30 flex items-center gap-2 shadow-lg">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>{getLangText(currentAgent.name, language)} {language === 'es' ? 'está redactando tu respuesta...' : 'is typing response...'}</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Active Bookings Context Banner if present */}
          {userBookings.length > 0 && (
            <div className="bg-[#020e08] px-4 py-2 border-t border-emerald-500/20 flex items-center justify-between text-[11px]">
              <span className="text-amber-400 font-bold flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 text-amber-400" />
                {language === 'es' ? 'Última Reserva:' : 'Latest Booking:'} #{userBookings[0].bookingId} ({userBookings[0].tourName})
              </span>
              <span className="text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-500/30">
                {userBookings[0].status}
              </span>
            </div>
          )}

          {/* Quick Suggested Chips for Current Agent */}
          <div className="bg-[#03150d] px-4 py-2 border-t border-emerald-500/20 flex gap-2 overflow-x-auto scrollbar-none">
            {currentQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                disabled={isLoading}
                className="bg-[#051c14] hover:bg-[#0a2e21] text-emerald-200/80 hover:text-amber-300 border border-emerald-500/30 text-[11px] font-bold px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all flex-shrink-0 cursor-pointer shadow-sm"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Selected Image Preview */}
          {selectedImage && (
            <div className="px-4 py-2 bg-[#020e08] border-t border-emerald-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={selectedImage} alt="Upload preview" className="w-12 h-12 rounded object-cover border border-amber-400/50" />
                <span className="text-xs text-emerald-200">
                  {language === 'es' ? 'Imagen lista para análisis ecológico o de viaje' : 'Image ready for travel/wildlife analysis'}
                </span>
              </div>
              <button onClick={() => setSelectedImage(null)} className="text-stone-400 hover:text-red-400 cursor-pointer">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Input Form */}
          <div className="p-3 sm:p-4 bg-[#020e08] border-t border-emerald-500/20">
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
                className="flex-shrink-0 w-[48px] h-[48px] flex items-center justify-center rounded-xl border bg-[#051c14] border-emerald-500/30 text-amber-400 hover:bg-[#0a2e21] transition-colors disabled:opacity-50 cursor-pointer"
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
                    : 'bg-[#051c14] border-emerald-500/30 text-amber-400 hover:bg-[#0a2e21]'
                }`}
                title={isRecording ? 'Detener grabación' : 'Grabar audio por voz'}
              >
                {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <input type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} spellCheck="false" autoComplete="off" autoCorrect="off"
                placeholder={
                  language === 'es'
                    ? `Pregunta a ${getLangText(currentAgent.name, language)}...`
                    : `Ask ${getLangText(currentAgent.name, language)}...`
                }
                disabled={isLoading || isRecording}
                className="flex-1 bg-[#051c14] border border-emerald-500/30 focus:border-amber-400 text-white px-4 py-3 rounded-xl text-base focus:outline-none placeholder-emerald-300/40"
              />
              <button
                type="submit"
                disabled={isLoading || (!inputMessage.trim() && !selectedImage)}
                className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-black px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-400/20 active:scale-95"
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
              <Bot className="w-5 h-5 text-amber-400" />
              {language === 'es' ? 'Equipo de Asesores & Flujos IA de Costa Rica' : 'Costa Rica AI Advisory & Workflow Team'}
            </h3>
            <span className="text-xs text-emerald-300/80 font-bold">
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
                      ? 'bg-[#0a3325] border-amber-400 shadow-xl ring-1 ring-amber-400/40' 
                      : 'bg-[#051c14]/80 hover:bg-[#07281c] border-emerald-500/20 hover:border-emerald-500/40'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-3xl p-1.5 bg-[#020e08] rounded-xl border border-emerald-500/30 shadow-inner">
                          {agent.avatarEmoji}
                        </span>
                        <div>
                          <h4 className="font-black text-white text-sm">
                            {agentName}
                          </h4>
                          <span className="text-[10px] font-bold text-amber-400">
                            {agentBadge}
                          </span>
                        </div>
                      </div>
                      {isCurrent && (
                        <span className="text-[10px] bg-amber-400 text-stone-950 font-black px-2 py-0.5 rounded-full uppercase">
                          {language === 'es' ? 'En Uso' : 'Active'}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-emerald-100/70 leading-relaxed line-clamp-3">
                      {agentDesc}
                    </p>

                    {/* Workflow steps micro-list */}
                    {workflowSteps.length > 0 && (
                      <div className="pt-2 border-t border-emerald-500/20 space-y-1">
                        <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider block">
                          {language === 'es' ? 'Flujo de trabajo:' : 'Workflow:'}
                        </span>
                        <div className="space-y-0.5">
                          {workflowSteps.slice(0, 3).map((step, sIdx) => (
                            <div key={sIdx} className="text-[10px] text-emerald-200/70 flex items-center gap-1.5 line-clamp-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                              <span className="truncate">{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-emerald-500/20 flex items-center justify-between">
                    <span className="text-[10px] text-emerald-300 font-semibold truncate max-w-[110px]">
                      {getLangText(agent.specialtyTags, language, [])[0]}
                    </span>
                    <button
                      onClick={() => handleSelectAgent(agent.id)}
                      className={`text-xs font-black uppercase px-3.5 py-1.5 rounded-xl flex items-center gap-1 transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-amber-400 text-stone-950 shadow-md font-black'
                          : 'bg-[#020e08] hover:bg-emerald-900/60 text-emerald-200 hover:text-white border border-emerald-500/30'
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
      </>
    )}

      </div>

      {/* Modal de Itinerario Inteligente con Claude 3.5 Sonnet */}
      <ClaudeItineraryModal
        isOpen={isItineraryModalOpen}
        onClose={() => setIsItineraryModalOpen(false)}
        language={language}
        onSelectTour={onSelectTour}
        onSendToChat={(prompt) => {
          handleSendMessage(prompt);
        }}
      />
    </div>
  );
};

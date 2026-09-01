import re

with open('src/components/FloatingWhatsApp.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

helper = """const MessageStatus = ({ isBot }: { isBot?: boolean }) => {
  const [isRead, setIsRead] = React.useState(false);
  React.useEffect(() => {
    const timer = setTimeout(() => setIsRead(true), 2000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <span className="inline-flex items-end gap-1 ml-2 float-right mt-1">
      <span className="text-[10px] opacity-60 leading-none">
        {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
      </span>
      {!isBot && <CheckCheck className={`w-3.5 h-3.5 leading-none ${isRead ? 'text-[#34B7F1]' : 'text-neutral-400'}`} />}
      {isBot && <CheckCheck className={`w-3.5 h-3.5 leading-none ${isRead ? 'text-[#34B7F1]' : 'text-neutral-400'}`} />}
    </span>
  );
};

const keywordsToTourId: Record<string, string> = {
  'poas': 'sjo-3-in-1-combo',
  '3-in-1': 'sjo-3-in-1-combo',
  'arenal full day': 'arenal-full-day',
  'arenal': 'arenal-full-day',
  'manuel antonio': 'manuel-antonio-sloth',
  'pacuare': 'pacuare-rafting',
  'rafting': 'pacuare-rafting',
  'monteverde': 'monteverde-canopy',
  'tortuguero': 'tortuguero-safari',
  'catamaran': 'guanacaste-catamaran',
  'sailing': 'guanacaste-catamaran',
  'corcovado': 'osa-corcovado',
  'celeste': 'arenal-celeste',
  'nauyaca': 'manuel-antonio-nauyaca',
  'whale': 'manuel-antonio-whale',
  'city tour': 'sjo-city-tour',
  'shuttle': 'sjo-shuttle',
  'rental': 'car-rental-4x4',
  'sim': 'tourist-sim-esim'
};

const getMentionedTours = (text: string) => {
  if (!text || text.length < 3) return [];
  const lower = text.toLowerCase();
  const matchedTours: Tour[] = [];
  const seenIds = new Set<string>();

  for (const [kw, id] of Object.entries(keywordsToTourId)) {
    if (lower.includes(kw)) {
      const tour = TOURS.find(t => t.id === id);
      if (tour && !seenIds.has(tour.id)) {
        matchedTours.push(tour);
        seenIds.add(tour.id);
      }
    }
  }
  
  // Also check exact ID
  for (const tour of TOURS) {
    if (lower.includes(tour.id.toLowerCase()) && !seenIds.has(tour.id)) {
      matchedTours.push(tour);
      seenIds.add(tour.id);
    }
  }

  return matchedTours.slice(0, 1); // Limit to 1 mini-card to save space
};

const ChatMiniCard = ({ tour, language, onSelectTour }: { tour: Tour, language: Language, onSelectTour: (t: Tour) => void }) => {
  const title = getLangText(tour.title, language);
  return (
    <div 
      onClick={() => onSelectTour(tour)}
      className="mt-1 w-[220px] bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden cursor-pointer hover:border-amber-400 hover:shadow-md transition-all active:scale-95 group"
    >
      <div className="h-24 w-full relative">
        <img src={tour.image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 to-transparent"></div>
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Map className="w-3 h-3 text-emerald-400" />
            <span className="text-[9px] font-bold text-white uppercase tracking-wider">{tour.region}</span>
          </div>
          <div className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm">
            ${tour.priceUSD}
          </div>
        </div>
      </div>
      <div className="p-2.5">
        <h4 className="text-xs font-bold text-neutral-900 line-clamp-2 leading-tight">{title}</h4>
        <div className="mt-2 flex items-center gap-1 text-teal-600 font-semibold text-[10px] uppercase">
          <span>{language === 'es' ? 'Ver detalles' : 'View Details'}</span>
          <ChevronRight className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
};"""

old_helper = """const MessageStatus = ({ isBot }: { isBot?: boolean }) => {
  const [isRead, setIsRead] = React.useState(false);
  React.useEffect(() => {
    const timer = setTimeout(() => setIsRead(true), 2000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <span className="inline-flex items-end gap-1 ml-2 float-right mt-1">
      <span className="text-[10px] opacity-60 leading-none">
        {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
      </span>
      {!isBot && <CheckCheck className={`w-3.5 h-3.5 leading-none ${isRead ? 'text-[#34B7F1]' : 'text-neutral-400'}`} />}
      {isBot && <CheckCheck className={`w-3.5 h-3.5 leading-none ${isRead ? 'text-[#34B7F1]' : 'text-neutral-400'}`} />}
    </span>
  );
};"""

content = content.replace(old_helper, helper)

history_map = """                {chatHistory.map((msg, idx) => {
                  const mentionedTours = getMentionedTours(msg.text);
                  return (
                    <div key={idx} className={`mb-3 flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`p-3 rounded-2xl max-w-[90%] shadow-sm text-sm font-medium ${msg.role === 'user' ? 'bg-[#25D366] text-white rounded-tr-sm' : 'bg-white/80 backdrop-blur-md text-neutral-800 border border-neutral-200/60 rounded-tl-sm'}`}>
                        <span className="whitespace-pre-wrap">{msg.text}</span>
                        <MessageStatus isBot={msg.role === 'bot'} />
                      </div>
                      {mentionedTours.length > 0 && (
                        <div className="mt-1 flex flex-col gap-2">
                          {mentionedTours.map(t => (
                            <ChatMiniCard 
                              key={t.id} 
                              tour={t} 
                              language={language} 
                              onSelectTour={(t) => {
                                if (onSelectTour) {
                                  onSelectTour(t);
                                  setIsOpen(false);
                                }
                              }} 
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}"""

old_history_map = """                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`mb-3 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-3 rounded-2xl max-w-[90%] shadow-sm text-sm font-medium ${msg.role === 'user' ? 'bg-[#25D366] text-white rounded-tr-sm' : 'bg-white/80 backdrop-blur-md text-neutral-800 border border-neutral-200/60 rounded-tl-sm'}`}>
                      <span className="whitespace-pre-wrap">{msg.text}</span>
                      <MessageStatus isBot={msg.role === 'bot'} />
                    </div>
                  </div>
                ))}"""

content = content.replace(old_history_map, history_map)

with open('src/components/FloatingWhatsApp.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

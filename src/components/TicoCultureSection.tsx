import React, { useState } from 'react';
import { 
  Coffee, 
  Utensils, 
  BookOpen, 
  Volume2, 
  Sparkles, 
  Heart, 
  CheckCircle2, 
  MapPin, 
  Compass, 
  ShieldCheck, 
  SunMedium, 
  Palmtree, 
  Flame 
} from 'lucide-react';
import { Language } from '../types';

interface TicoCultureSectionProps {
  language: Language;
  onExploreTours?: () => void;
}

interface TicoSlang {
  word: string;
  pronunciation: string;
  meaningEs: string;
  meaningEn: string;
  exampleEs: string;
  exampleEn: string;
  category: 'saludo' | 'expresion' | 'comida' | 'social';
}

const TICO_SLANG_LIST: TicoSlang[] = [
  {
    word: '¡Pura Vida!',
    pronunciation: 'poo-rah vee-dah',
    meaningEs: 'Saludo, despedida, estado de ánimo positivo y filosofía nacional de gratitud y optimismo.',
    meaningEn: 'National greeting, farewell, thank you, and overall philosophy of joy, peace, and simplicity.',
    exampleEs: '— ¿Cómo estás? — ¡Pura Vida! ¿Y vos?',
    exampleEn: '— How are you doing? — Pura Vida! And you?',
    category: 'saludo'
  },
  {
    word: '¡Tuanis!',
    pronunciation: 'twah-nees',
    meaningEs: 'Excelente, genial, súper bien o de gran calidad.',
    meaningEn: 'Cool, awesome, great, or high quality.',
    exampleEs: '¡Ese tour al Volcán Arenal estuvo demasiado tuanis!',
    exampleEn: 'That tour to Arenal Volcano was so tuanis (awesome)!',
    category: 'expresion'
  },
  {
    word: '¡Qué Chiva!',
    pronunciation: 'kay chee-vah',
    meaningEs: '¡Qué bonito! / ¡Qué impresionante! / ¡Fantástico!',
    meaningEn: 'How cool! / Amazing! / Fantastic!',
    exampleEs: '¡Qué chiva ver a ese perezoso con su cría en el árbol!',
    exampleEn: 'How cool to see that sloth with its baby in the canopy!',
    category: 'expresion'
  },
  {
    word: 'Diay / Idiay',
    pronunciation: 'dee-eye',
    meaningEs: 'La expresión tica más versátil. Significa "¿y entonces?", "¿qué se puede hacer?", asombro o explicación.',
    meaningEn: 'The most versatile Tico word. Means "well...", "what can you do?", or "and then what?".',
    exampleEs: '— ¿Por qué llegaste tarde? — Diay, había un mono cruzando la calle.',
    exampleEn: '— Why are you late? — Diay (well), there was a monkey crossing the road.',
    category: 'expresion'
  },
  {
    word: 'Mae',
    pronunciation: 'mah-eh',
    meaningEs: 'Amigo, compa, persona (similar a "dude", "mate" o "bro").',
    meaningEn: 'Friend, dude, bro, guy or girl in informal friendly settings.',
    exampleEs: '¡Hola mae! Vamos a tomarnos un café chorreado.',
    exampleEn: 'Hey mae (dude)! Let\'s go grab a freshly brewed drip coffee.',
    category: 'social'
  },
  {
    word: 'Buena Nota',
    pronunciation: 'bweh-nah noh-tah',
    meaningEs: 'Alguien muy amable, educado, generoso y de confianza.',
    meaningEn: 'A cool, kind, helpful, or trustworthy person.',
    exampleEs: 'El guía tico fue súper buena nota con toda la familia.',
    exampleEn: 'The local Tico guide was super buena nota (friendly and helpful) with the whole family.',
    category: 'social'
  },
  {
    word: 'Soda',
    pronunciation: 'soh-dah',
    meaningEs: 'Restaurante típico tradicional familiar costarricense con comida casera deliciosa y precios muy económicos.',
    meaningEn: 'Traditional family-run Costa Rican eatery serving hearty, homemade authentic meals.',
    exampleEs: 'Almorzamos un casado delicioso en la Soda de Doña Marta.',
    exampleEn: 'We had a delicious casado lunch at Doña Marta\'s local soda.',
    category: 'comida'
  },
  {
    word: 'Mejenga',
    pronunciation: 'meh-hen-gah',
    meaningEs: 'Partido informal de fútbol entre amigos en la plaza del pueblo o en la playa.',
    meaningEn: 'A casual pickup soccer match among friends on the beach or village field.',
    exampleEs: 'Al atardecer armamos una mejenga en la arena de Manuel Antonio.',
    exampleEn: 'At sunset we joined a casual beach soccer match in Manuel Antonio.',
    category: 'social'
  },
  {
    word: 'Por Dicha',
    pronunciation: 'por dee-chah',
    meaningEs: 'Afortunadamente, gracias a Dios, qué alivio.',
    meaningEn: 'Fortunately / Luckily / Thankfully.',
    exampleEs: 'Por dicha no llovió durante la caminata por los puentes colgantes.',
    exampleEn: 'Thankfully it didn\'t rain during our hanging bridges hike.',
    category: 'expresion'
  },
  {
    word: 'Yigüirro',
    pronunciation: 'yee-gwee-rroh',
    meaningEs: 'Ave Nacional de Costa Rica (Turdus grayi). Su melodioso canto en marzo y abril anuncia la llegada de las lluvias.',
    meaningEn: 'National Bird of Costa Rica. Its melodious song announces the arrival of nourishing green-season rains.',
    exampleEs: 'Escuchar el canto del yigüirro al amanecer en el valle es mágico.',
    exampleEn: 'Hearing the clay-colored thrush singing at sunrise is pure Costa Rican magic.',
    category: 'social'
  }
];

interface TraditionalDish {
  name: string;
  subtitleEs: string;
  subtitleEn: string;
  descEs: string;
  descEn: string;
  region: string;
  icon: string;
  image: string;
}

const TICO_DISHES: TraditionalDish[] = [
  {
    name: 'Gallo Pinto Tradicional',
    subtitleEs: 'El Desayuno Tico por Excelencia',
    subtitleEn: 'The Iconic Costa Rican Breakfast',
    descEs: 'Mezcla perfecta de arroz y frijoles negros sazonados con cebolla, culantro, chile dulce y la inconfundible Salsa Lizano. Se sirve con huevos al gusto, natilla cremosa, plátano maduro frito, queso frito o turrialba y café recién chorreado.',
    descEn: 'The heart and soul of Costa Rican mornings: rice and beans seasoned with sweet peppers, onions, cilantro, and savory Lizano sauce. Served with eggs, sweet plantains, sour cream (natilla), artisan cheese, and fresh coffee.',
    region: 'Toda Costa Rica (Valle Central / Guanacaste)',
    icon: '🍳',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Casado Costarricense',
    subtitleEs: 'El Almuerzo Completo y Balanceado',
    subtitleEn: 'The Ultimate Balanced Plate',
    descEs: 'El plato diario de los costarricenses: arroz blanco, frijoles tiernos, plátano maduro frito, ensalada fresca de repollo con tomate, picadillo casero (de papa, chayote o arracache) y tu elección de proteína (pescado a la plancha, pollo en salsa o carne mechada).',
    descEn: 'The hearty staple found across every local Soda: rice, slow-cooked black beans, caramelized sweet plantains, fresh cabbage slaw, vegetable picadillo, and your choice of fresh fish, tender beef, or grilled chicken.',
    region: 'Nacional / Sodas Locales',
    icon: '🥗',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Rice and Beans Caribeño',
    subtitleEs: 'Sabor Afrocaribeño con Leche de Coco',
    subtitleEn: 'Caribbean Coconut Rice & Beans',
    descEs: 'La joya culinaria de Limón y Puerto Viejo. Arroz y frijoles rojos cocinados lentamente en leche de coco fresca, tomillo y chile panameño aromático. Se acompaña de pollo caribeño glaseado, patacones crujientes y ensalada verde.',
    descEn: 'The star dish of Limón and Puerto Viejo: fragrant rice and red beans simmered in fresh coconut milk, thyme, and panamanian peppers. Served with caramelized Caribbean chicken and golden crispy patacones.',
    region: 'Caribe Sur (Puerto Viejo, Cahuita, Limón)',
    icon: '🥥',
    image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Chifrijo Tico',
    subtitleEs: 'La Botana Auténtica Costarricense',
    subtitleEn: 'The Famous Costa Rican Pub Dish',
    descEs: 'Nacido en San José y amado en todo el país. Capas de arroz blanco, frijoles cubaces tiernos en su caldo, chicharrón crujiente de cerdo y chimichurri fresco (tomate, cebolla, culantro y limón), coronado con aguacate y chips de plátano.',
    descEn: 'Invented in San José and now a nationwide culinary treasure: layers of warm rice, tender beans, crispy pork chicharrón, fresh pico de gallo chimichurri, avocado slices, and golden plantain chips.',
    region: 'San José & Bares Típicos',
    icon: '🥑',
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Olla de Carne Campesina',
    subtitleEs: 'Sopa Nutritiva de Verduras Criollas',
    subtitleEn: 'Hearty Countryside Beef & Root Stew',
    descEs: 'Sopa tradicional de domingo en las familias campesinas. Caldo suculento de carne de res cocinada a fuego lento con yuca, plátano verde, chayote, camote, elote tierno, ñampí y zanahoria.',
    descEn: 'A comforting weekend culinary ritual across Costa Rica: a rich, slow-simmered beef broth loaded with native root vegetables including yucca, green plantains, sweet corn, chayote squash, and sweet potatoes.',
    region: 'Valle Central & Cartago',
    icon: '🍲',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Chorreadas con Natilla',
    subtitleEs: 'Tortillas Dulces de Maíz Tierno',
    subtitleEn: 'Sweet Corn Pancakes with Farm Sour Cream',
    descEs: 'Deliciosas tortas preparadas con maíz dulce tierno molido, cocinadas en comal y servidas calientes con natilla cremosa casera. Perfectas para acompañar el café de la tarde.',
    descEn: 'Heavenly golden griddle cakes made from freshly ground sweet corn, lightly crisped on a hot comal and served warm with farm-fresh natilla. The ultimate afternoon coffee pairing.',
    region: 'Guanacaste & Alajuela',
    icon: '🌽',
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80'
  }
];

interface CoffeeRegion {
  name: string;
  altitude: string;
  notesEs: string;
  notesEn: string;
  profileEs: string;
  profileEn: string;
}

const COFFEE_REGIONS: CoffeeRegion[] = [
  {
    name: 'Tarrazú (Los Santos)',
    altitude: '1,200 - 1,900 m.s.n.m.',
    notesEs: 'Chocolate negro, naranja, jazmín y miel silvestre.',
    notesEn: 'Dark chocolate, bright orange, jasmine, and wild honey.',
    profileEs: 'Reconocido mundialmente como uno de los mejores cafés de altura. Acidez viva y cuerpo sedoso.',
    profileEn: 'Globally celebrated volcanic high-altitude coffee with crisp acidity and a rich, velvety body.'
  },
  {
    name: 'Valle Central (Heredia & Poás)',
    altitude: '1,000 - 1,600 m.s.n.m.',
    notesEs: 'Frutas de hueso, caramelo tostado y vainilla.',
    notesEn: 'Stone fruit, toasted caramel, and bourbon vanilla.',
    profileEs: 'Cultivado en las faldas de los volcanes Barva y Poás. Balance perfecto entre cuerpo y aroma.',
    profileEn: 'Grown on fertile volcanic slopes with balanced acidity and deep aromatic complexity.'
  },
  {
    name: 'Tres Ríos (La Burdeos de Costa Rica)',
    altitude: '1,200 - 1,650 m.s.n.m.',
    notesEs: 'Ciruela, cacao puro y notas florales suaves.',
    notesEn: 'Ripe plum, pure cacao, and subtle floral nuances.',
    profileEs: 'Suelos influenciados por la actividad milenaria del Volcán Irazú. Sabor refinado y elegante.',
    profileEn: 'Influenced by the mineral-rich ash of Irazú Volcano, delivering an elegant and refined cup.'
  },
  {
    name: 'Brunca (Pérez Zeledón & Coto Brus)',
    altitude: '800 - 1,700 m.s.n.m.',
    notesEs: 'Cítricos dulces, caña de azúcar y avellana.',
    notesEn: 'Sweet citrus, sugarcane panela, and toasted hazelnut.',
    profileEs: 'Cafés con una dulzura natural excepcional y notas de caramelo suave de montaña.',
    profileEn: 'Brimming with natural sweetness, smooth caramel tones, and vibrant mountain brightness.'
  }
];

export const TicoCultureSection: React.FC<TicoCultureSectionProps> = ({ language, onExploreTours }) => {
  const [activeSubTab, setActiveSubTab] = useState<'slang' | 'food' | 'coffee' | 'symbols' | 'tips'>('slang');
  const [slangFilter, setSlangFilter] = useState<'all' | 'saludo' | 'expresion' | 'comida' | 'social'>('all');
  const [speakingWord, setSpeakingWord] = useState<string | null>(null);

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-CR';
      utterance.rate = 0.9;
      setSpeakingWord(text);
      utterance.onend = () => setSpeakingWord(null);
      utterance.onerror = () => setSpeakingWord(null);
      window.speechSynthesis.speak(utterance);
    }
  };

  const filteredSlang = slangFilter === 'all' 
    ? TICO_SLANG_LIST 
    : TICO_SLANG_LIST.filter(item => item.category === slangFilter);

  return (
    <section id="tico-culture-section" className="py-16 bg-[#071A0F]/90 text-white relative overflow-hidden border-y border-emerald-500/30">
      
      {/* Costa Rica Flag Ribbon Accent at Top */}
      <div className="w-full h-2 flex">
        <div className="h-full w-[20%] bg-[#002B7F]" />
        <div className="h-full w-[10%] bg-white" />
        <div className="h-full w-[40%] bg-[#CE1126]" />
        <div className="h-full w-[10%] bg-white" />
        <div className="h-full w-[20%] bg-[#002B7F]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        
        {/* Header Title */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 bg-emerald-900/80 text-amber-300 text-xs font-black uppercase px-4 py-1.5 rounded-full border border-amber-500/40 shadow-md">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{language === 'es' ? '🇨🇷 100% Identidad Tica • Cultura & Tradición' : '🇨🇷 100% Authentic Costa Rican Culture & Heritage'}</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
            {language === 'es' ? 'El Alma de Costa Rica' : 'The Soul of Costa Rica'}
          </h2>

          <p className="text-emerald-200/90 text-sm sm:text-base leading-relaxed">
            {language === 'es'
              ? 'Costa Rica no es solo un destino, es una forma de vivir en paz con la naturaleza y con una calidez humana incomparable. Conoce nuestras expresiones ticas, los platillos más deliciosos y la tradición cafetalera que nos llena de orgullo.'
              : 'Costa Rica is more than a destination; it is a peaceful way of living in harmony with nature and genuine human warmth. Discover our famous Tico slang, savor authentic cuisine, and immerse yourself in world-class coffee heritage.'}
          </p>
        </div>

        {/* Sub Navigation Bar */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-10">
          <button
            onClick={() => setActiveSubTab('slang')}
            className={`px-4 sm:px-6 py-3 rounded-2xl font-black text-xs uppercase transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'slang'
                ? 'bg-amber-500 text-stone-950 shadow-lg scale-105 border border-amber-300'
                : 'bg-[#0E351F] text-emerald-200 hover:bg-emerald-800/60 border border-emerald-700/50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>{language === 'es' ? '🗣️ Diccionario Tico' : '🗣️ Tico Slang & Expressions'}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('food')}
            className={`px-4 sm:px-6 py-3 rounded-2xl font-black text-xs uppercase transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'food'
                ? 'bg-amber-500 text-stone-950 shadow-lg scale-105 border border-amber-300'
                : 'bg-[#0E351F] text-emerald-200 hover:bg-emerald-800/60 border border-emerald-700/50'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>{language === 'es' ? '🍲 Gastronomía Auténtica' : '🍲 Authentic Flavors'}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('coffee')}
            className={`px-4 sm:px-6 py-3 rounded-2xl font-black text-xs uppercase transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'coffee'
                ? 'bg-amber-500 text-stone-950 shadow-lg scale-105 border border-amber-300'
                : 'bg-[#0E351F] text-emerald-200 hover:bg-emerald-800/60 border border-emerald-700/50'
            }`}
          >
            <Coffee className="w-4 h-4" />
            <span>{language === 'es' ? '☕ Café de Especialidad' : '☕ Coffee Heritage'}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('symbols')}
            className={`px-4 sm:px-6 py-3 rounded-2xl font-black text-xs uppercase transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'symbols'
                ? 'bg-amber-500 text-stone-950 shadow-lg scale-105 border border-amber-300'
                : 'bg-[#0E351F] text-emerald-200 hover:bg-emerald-800/60 border border-emerald-700/50'
            }`}
          >
            <Palmtree className="w-4 h-4" />
            <span>{language === 'es' ? '🦜 Símbolos & Biodiversidad' : '🦜 National Symbols'}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('tips')}
            className={`px-4 sm:px-6 py-3 rounded-2xl font-black text-xs uppercase transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'tips'
                ? 'bg-amber-500 text-stone-950 shadow-lg scale-105 border border-amber-300'
                : 'bg-[#0E351F] text-emerald-200 hover:bg-emerald-800/60 border border-emerald-700/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{language === 'es' ? '💡 Tips del Viajero Tico' : '💡 Local Travel Tips'}</span>
          </button>
        </div>

        {/* ================= TAB 1: DICCIONARIO TICO ================= */}
        {activeSubTab === 'slang' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Category Filter for Slang */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
              <span className="text-xs text-emerald-300 font-bold mr-2 uppercase">
                {language === 'es' ? 'Filtrar por:' : 'Filter by:'}
              </span>
              {[
                { id: 'all', es: 'Todos', en: 'All' },
                { id: 'saludo', es: 'Saludos', en: 'Greetings' },
                { id: 'expresion', es: 'Expresiones', en: 'Expressions' },
                { id: 'social', es: 'Social & Amigos', en: 'Social & Friends' },
                { id: 'comida', es: 'Lugares & Comida', en: 'Places & Food' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSlangFilter(cat.id as any)}
                  className={`text-xs px-3.5 py-1.5 rounded-full font-bold uppercase transition-colors ${
                    slangFilter === cat.id
                      ? 'bg-emerald-500 text-stone-950'
                      : 'bg-[#0E351F] text-emerald-300 hover:bg-emerald-800'
                  }`}
                >
                  {language === 'es' ? cat.es : cat.en}
                </button>
              ))}
            </div>

            {/* Slang Cards Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSlang.map((item, idx) => (
                <div 
                  key={idx}
                  className="bg-[#0E351F]/90 rounded-3xl p-6 border border-emerald-500/30 shadow-xl hover:border-amber-400 transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-black text-amber-300">{item.word}</span>
                      <button
                        onClick={() => speakText(item.word)}
                        className="w-9 h-9 rounded-full bg-emerald-950 hover:bg-emerald-800 text-amber-300 flex items-center justify-center transition-transform active:scale-90 border border-emerald-600/50"
                        title={language === 'es' ? 'Escuchar pronunciación' : 'Listen pronunciation'}
                      >
                        <Volume2 className={`w-4 h-4 ${speakingWord === item.word ? 'text-amber-400 animate-bounce' : ''}`} />
                      </button>
                    </div>

                    <div className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-1 rounded-lg w-fit">
                      🗣️ /{item.pronunciation}/
                    </div>

                    <p className="text-xs sm:text-sm text-white font-medium leading-relaxed">
                      {language === 'es' ? item.meaningEs : item.meaningEn}
                    </p>
                  </div>

                  <div className="bg-[#071A0F] p-3.5 rounded-2xl border border-emerald-900/60 space-y-1">
                    <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                      {language === 'es' ? 'Ejemplo en Costa Rica:' : 'Example in Context:'}
                    </span>
                    <p className="text-xs text-emerald-200 italic">
                      "{language === 'es' ? item.exampleEs : item.exampleEn}"
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-amber-950/30 p-5 rounded-3xl border border-amber-500/40 text-center max-w-2xl mx-auto space-y-2">
              <span className="text-2xl">🌴</span>
              <h4 className="text-sm font-black uppercase text-amber-300">
                {language === 'es' ? '¡El Tico es Pura Calidez!' : 'Ticos Are Pure Warmth!'}
              </h4>
              <p className="text-xs text-emerald-200 leading-relaxed">
                {language === 'es'
                  ? 'No dudes en decir "¡Pura Vida!" cuando llegues a un hotel, restaurante o al subirte al transporte turístico. ¡Siempre te responderán con una gran sonrisa costarricense!'
                  : 'Never hesitate to say "¡Pura Vida!" when arriving at a hotel, soda, or boarding your shuttle. You will always be greeted with a warm and genuine Costa Rican smile!'}
              </p>
            </div>
          </div>
        )}

        {/* ================= TAB 2: GASTRONOMÍA ================= */}
        {activeSubTab === 'food' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {TICO_DISHES.map((dish, index) => (
                <div 
                  key={index}
                  className="bg-[#0E351F]/90 rounded-3xl overflow-hidden border border-emerald-500/30 shadow-xl hover:border-amber-400 transition-all flex flex-col group"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={dish.image} 
                      alt={dish.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute top-3 left-3 bg-[#071A0F]/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-amber-300 border border-emerald-500/30 flex items-center gap-1.5">
                      <span>{dish.icon}</span>
                      <span>{dish.region}</span>
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <h4 className="text-xl font-black text-white">{dish.name}</h4>
                      <span className="text-xs font-bold text-amber-300 block">
                        {language === 'es' ? dish.subtitleEs : dish.subtitleEn}
                      </span>
                      <p className="text-xs text-emerald-200/90 leading-relaxed pt-2">
                        {language === 'es' ? dish.descEs : dish.descEn}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-emerald-800/60 flex items-center justify-between text-[11px] text-emerald-300">
                      <span className="font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                        {language === 'es' ? '100% Sabor Criollo' : '100% Authentic Recipe'}
                      </span>
                      <span className="bg-emerald-950 px-2 py-0.5 rounded-full font-mono text-[10px] text-amber-300">
                        {language === 'es' ? 'Plato Insignia' : 'Must-Try'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Salsa Lizano Note */}
            <div className="bg-[#0E351F] p-6 rounded-3xl border border-amber-500/30 flex flex-col md:flex-row items-center gap-6 max-w-4xl mx-auto">
              <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-stone-950 font-black text-2xl shrink-0 shadow-lg">
                🧂
              </div>
              <div className="space-y-1 text-center md:text-left">
                <h4 className="text-base font-black text-white uppercase">
                  {language === 'es' ? 'El Secreto Nacional: Salsa Lizano' : 'The National Secret: Salsa Lizano'}
                </h4>
                <p className="text-xs text-emerald-200 leading-relaxed">
                  {language === 'es'
                    ? 'Creada en Costa Rica en 1920, esta salsa vegetal de sabor agridulce y especiado es el condimento indispensable de la cocina costarricense. ¡No olvides pedirla en cualquier Soda y llevarte una botella de recuerdo!'
                    : 'Created in Costa Rica in 1920, this savory, tangy vegetable-based condiment is the irreplaceable flavor of Costa Rican cuisine. Ask for it at every Soda and bring a bottle home!'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: CAFÉ DE ESPECIALIDAD ================= */}
        {activeSubTab === 'coffee' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* The Chorreador Feature Banner */}
            <div className="bg-gradient-to-br from-[#1b2b1a] to-[#0d2113] p-6 sm:p-8 rounded-3xl border border-amber-500/40 shadow-2xl grid md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-xs font-black uppercase border border-amber-500/30">
                  <Coffee className="w-3.5 h-3.5 text-amber-400" />
                  <span>{language === 'es' ? 'El Grano de Oro Costarricense' : 'Costa Rica\'s Golden Grain'}</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white uppercase">
                  {language === 'es' ? 'El Arte del Café Chorreado' : 'The Art of Traditional Drip Coffee'}
                </h3>
                <p className="text-xs sm:text-sm text-emerald-200 leading-relaxed">
                  {language === 'es'
                    ? 'En Costa Rica, el café no se prepara en máquinas complejas: se "chorrea" en un soporte de madera con una bolsita de tela de algodón. El agua caliente a 92°C extrae de forma limpia todos los aceites esenciales y notas florales del grano recién tostado.'
                    : 'In Costa Rica, authentic coffee is brewed using a "Chorreador"—a simple wooden stand with a reusable cotton cloth filter bag. Hot water poured gently over freshly ground beans yields an extraordinarily smooth, aromatic, and bright cup.'}
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-[#071A0F] p-3 rounded-2xl border border-emerald-800">
                    <span className="text-amber-400 font-black text-sm block">100% Arábica</span>
                    <span className="text-[10px] text-emerald-300">
                      {language === 'es' ? 'Único país con prohibición legal del café Robusta inferior.' : 'Only country with a legal ban on lower-grade Robusta.'}
                    </span>
                  </div>
                  <div className="bg-[#071A0F] p-3 rounded-2xl border border-emerald-800">
                    <span className="text-amber-400 font-black text-sm block">Cosecha a Mano</span>
                    <span className="text-[10px] text-emerald-300">
                      {language === 'es' ? 'Solo se recolectan los granos 100% maduros (rojos).' : 'Only 100% ripe red cherries picked by skilled hands.'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-5 relative">
                <div className="bg-[#071A0F] p-6 rounded-3xl border border-emerald-500/30 text-center space-y-4">
                  <span className="text-5xl">☕🪵</span>
                  <h4 className="text-lg font-black text-amber-300 uppercase">
                    {language === 'es' ? '¿Cómo pedir café en Costa Rica?' : 'How to order coffee in Costa Rica?'}
                  </h4>
                  <ul className="text-xs text-emerald-200 text-left space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">•</span>
                      <span><strong>Café Negro:</strong> {language === 'es' ? 'Puro, recién chorreado sin leche.' : 'Pure, freshly dripped black coffee.'}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">•</span>
                      <span><strong>Café con Leche:</strong> {language === 'es' ? 'Mitad café concentrado y mitad leche caliente con espuma.' : 'Half rich coffee, half steamed milk.'}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">•</span>
                      <span><strong>Agua Dulce:</strong> {language === 'es' ? 'Bebida tradicional de panela / caña de azúcar hervida.' : 'Traditional hot beverage made from natural boiled sugarcane panela.'}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Coffee Regions Grid */}
            <div className="space-y-4">
              <h4 className="text-lg font-black text-white uppercase text-center">
                {language === 'es' ? 'Principales Regiones Cafetaleras de Costa Rica' : 'Main Coffee Growing Regions of Costa Rica'}
              </h4>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {COFFEE_REGIONS.map((region, idx) => (
                  <div key={idx} className="bg-[#0E351F]/80 p-5 rounded-3xl border border-emerald-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="bg-emerald-950 text-amber-400 font-mono text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                        {region.altitude}
                      </span>
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <h5 className="text-base font-black text-white">{region.name}</h5>
                    <p className="text-xs text-emerald-200">
                      {language === 'es' ? region.profileEs : region.profileEn}
                    </p>
                    <div className="pt-2 border-t border-emerald-800/60">
                      <span className="text-[10px] uppercase font-bold text-amber-300 block">
                        {language === 'es' ? 'Notas de Cata:' : 'Tasting Notes:'}
                      </span>
                      <span className="text-xs text-white font-medium">
                        {language === 'es' ? region.notesEs : region.notesEn}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: SÍMBOLOS NACIONALES ================= */}
        {activeSubTab === 'symbols' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Perezoso */}
              <div className="bg-[#0E351F] p-6 rounded-3xl border border-emerald-500/30 space-y-3">
                <span className="text-4xl">🦥</span>
                <h4 className="text-xl font-black text-white">El Perezoso (Sloth)</h4>
                <span className="text-xs font-bold text-amber-300 block">Símbolo Nacional de la Fauna</span>
                <p className="text-xs text-emerald-200 leading-relaxed">
                  {language === 'es'
                    ? 'Representa la biodiversidad y el compromiso de Costa Rica con la conservación. Hay dos especies en el país: el de dos dedos (nocturno) y el de tres dedos (diurno).'
                    : 'The ultimate symbol of Costa Rica\'s biodiversity. You can spot both two-toed (nocturnal) and three-toed (diurnal) sloths in Manuel Antonio, Arenal, and Tortuguero.'}
                </p>
              </div>

              {/* Yigüirro */}
              <div className="bg-[#0E351F] p-6 rounded-3xl border border-emerald-500/30 space-y-3">
                <span className="text-4xl">🐦</span>
                <h4 className="text-xl font-black text-white">El Yigüirro</h4>
                <span className="text-xs font-bold text-amber-300 block">Ave Nacional de Costa Rica</span>
                <p className="text-xs text-emerald-200 leading-relaxed">
                  {language === 'es'
                    ? 'Elegido por su canto melodioso que acompaña la vida campesina al inicio de las cosechas y las lluvias de mayo. Es amigable y común en jardines y valles.'
                    : 'Chosen for its sweet and persistent song that announces the coming of nourishing green-season rains to the farming communities.'}
                </p>
              </div>

              {/* Carreta de Sarchí */}
              <div className="bg-[#0E351F] p-6 rounded-3xl border border-emerald-500/30 space-y-3">
                <span className="text-4xl">🎨</span>
                <h4 className="text-xl font-black text-white">Carreta Típica de Sarchí</h4>
                <span className="text-xs font-bold text-amber-300 block">Patrimonio de la Humanidad (UNESCO)</span>
                <p className="text-xs text-emerald-200 leading-relaxed">
                  {language === 'es'
                    ? 'Pintada a mano con intrincados mandalas florales y geométricos. Históricamente transportaba el café desde el Valle Central hasta los puertos del Pacífico y Caribe.'
                    : 'Intricately hand-painted with colorful mandalas. Declared a Masterpiece of Oral and Intangible Heritage by UNESCO, used historically to transport coffee to ports.'}
                </p>
              </div>

              {/* Guaria Morada */}
              <div className="bg-[#0E351F] p-6 rounded-3xl border border-emerald-500/30 space-y-3">
                <span className="text-4xl">🌸</span>
                <h4 className="text-xl font-black text-white">La Guaria Morada</h4>
                <span className="text-xs font-bold text-amber-300 block">Flor Nacional (Guarianthe skinneri)</span>
                <p className="text-xs text-emerald-200 leading-relaxed">
                  {language === 'es'
                    ? 'Orquídea epífita de intenso color morado que florece entre febrero y marzo. Adorna los cafetales, tapias y árboles centenarios del país.'
                    : 'A stunning purple orchid that blooms in late winter. A cherished symbol of luck, fortune, and peaceful home life across Costa Rican households.'}
                </p>
              </div>

              {/* Árbol de Guanacaste */}
              <div className="bg-[#0E351F] p-6 rounded-3xl border border-emerald-500/30 space-y-3">
                <span className="text-4xl">🌳</span>
                <h4 className="text-xl font-black text-white">Árbol de Guanacaste</h4>
                <span className="text-xs font-bold text-amber-300 block">Árbol Nacional (Enterolobium cyclocarpum)</span>
                <p className="text-xs text-emerald-200 leading-relaxed">
                  {language === 'es'
                    ? 'Árbol majestuoso en forma de sombrilla gigante que cobija al ganado y a la fauna en las llanuras soleadas del Pacífico norte.'
                    : 'A grand, umbrella-canopied tree that provides cool shade to wildlife across the sun-drenched savannas of Guanacaste.'}
                </p>
              </div>

              {/* Quetzal Resplandeciente */}
              <div className="bg-[#0E351F] p-6 rounded-3xl border border-emerald-500/30 space-y-3">
                <span className="text-4xl">🦜</span>
                <h4 className="text-xl font-black text-white">El Quetzal</h4>
                <span className="text-xs font-bold text-amber-300 block">Ave Sagrada del Bosque Nuboso</span>
                <p className="text-xs text-emerald-200 leading-relaxed">
                  {language === 'es'
                    ? 'Famoso por su plumaje verde esmeralda y larga cola. Habita en los bosques nubosos de Monteverde, Los Santos y San Gerardo de Dota.'
                    : 'Famous for its iridescent emerald feathers and long twin tail plumes. Thrives in high-elevation cloud forests feeding on wild avocados.'}
                </p>
              </div>

            </div>
          </div>
        )}

        {/* ================= TAB 5: TIPS DEL VIAJERO TICO ================= */}
        {activeSubTab === 'tips' && (
          <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl mx-auto">
            <div className="grid sm:grid-cols-2 gap-4">
              
              <div className="bg-[#0E351F] p-5 rounded-3xl border border-emerald-500/30 space-y-2">
                <span className="text-xl">🚰</span>
                <h5 className="font-black text-white text-sm uppercase">
                  {language === 'es' ? '1. Agua Potable de Calidad' : '1. Safe Tap Water'}
                </h5>
                <p className="text-xs text-emerald-200">
                  {language === 'es'
                    ? 'El agua del grifo es 100% potable en la gran mayoría del país (San José, Arenal, Monteverde, Manuel Antonio). Lleva tu botella reutilizable.'
                    : 'Tap water is clean and safe to drink in most tourist destinations. Bring a reusable water bottle to reduce single-use plastic.'}
                </p>
              </div>

              <div className="bg-[#0E351F] p-5 rounded-3xl border border-emerald-500/30 space-y-2">
                <span className="text-xl">💵</span>
                <h5 className="font-black text-white text-sm uppercase">
                  {language === 'es' ? '2. Propinas e Impuestos' : '2. Tips & Taxes Included'}
                </h5>
                <p className="text-xs text-emerald-200">
                  {language === 'es'
                    ? 'En restaurantes, la cuenta ya incluye por ley el 10% de propina por servicio y el 13% de IVA. Dejar propina adicional es voluntario para premiar un servicio excelente.'
                    : 'Restaurant bills legally include a 10% service tip and 13% VAT tax. Extra tips are optional but deeply appreciated for outstanding service.'}
                </p>
              </div>

              <div className="bg-[#0E351F] p-5 rounded-3xl border border-emerald-500/30 space-y-2">
                <span className="text-xl">☀️</span>
                <h5 className="font-black text-white text-sm uppercase">
                  {language === 'es' ? '3. La Regla del Madrugador Tico' : '3. The Early Riser Advantage'}
                </h5>
                <p className="text-xs text-emerald-200">
                  {language === 'es'
                    ? 'El sol sale a las 5:30 AM y se oculta a las 5:45 PM todo el año. Los mejores avistamientos de fauna y las horas más frescas son temprano en la mañana.'
                    : 'The sun rises around 5:30 AM and sets at 5:45 PM year-round. Wildlife is most active and trails are coolest between 6:00 AM and 10:00 AM.'}
                </p>
              </div>

              <div className="bg-[#0E351F] p-5 rounded-3xl border border-emerald-500/30 space-y-2">
                <span className="text-xl">🔭</span>
                <h5 className="font-black text-white text-sm uppercase">
                  {language === 'es' ? '4. Guías Naturalistas Locales Expertos' : '4. Expert Local Naturalist Guides'}
                </h5>
                <p className="text-xs text-emerald-200">
                  {language === 'es'
                    ? 'Nuestros guías locales cuentan con telescopios de alta definición y un profundo conocimiento de la fauna, senderos y ecosistemas del país.'
                    : 'Our local guides carry high-definition spotting scopes and deep firsthand knowledge of Costa Rica’s wildlife, trails, and ecosystems.'}
                </p>
              </div>

            </div>

            {/* Action CTA to explore catalog */}
            {onExploreTours && (
              <div className="text-center pt-4">
                <button
                  onClick={onExploreTours}
                  className="bg-amber-500 hover:bg-teal-600 text-stone-950 hover:text-white font-black text-xs uppercase px-8 py-4 rounded-2xl shadow-xl transition-all hover:scale-105 inline-flex items-center gap-2 cursor-pointer"
                >
                  <Compass className="w-4 h-4" />
                  <span>{language === 'es' ? '¡Explorar Todos los Tours en Costa Rica!' : 'Explore All Costa Rica Tours!'}</span>
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </section>
  );
};

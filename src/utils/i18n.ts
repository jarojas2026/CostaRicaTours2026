import { Language, Currency } from '../types';

export interface LanguageInfo {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
];

/**
  Detects the user's browser language on initial app load
 */
export function detectBrowserLanguage(): Language {
  if (typeof navigator === 'undefined') return 'es';
  
  const browserLangs = navigator.languages && navigator.languages.length > 0
    ? Array.from(navigator.languages)
    : [navigator.language || ''];

  for (const langStr of browserLangs) {
    if (!langStr) continue;
    const lower = langStr.toLowerCase();

    if (lower.startsWith('es')) return 'es';
    if (lower.startsWith('de')) return 'de';
    if (lower.startsWith('fr')) return 'fr';
    if (lower.startsWith('zh')) return 'zh';
    if (lower.startsWith('ja')) return 'ja';
    if (lower.startsWith('en')) return 'en';
  }

  // Default fallback for Costa Rica tourism portal
  return 'es';
}

/**
  Safe language accessor with fallback to EN/ES
 */
export function getLangText<T = string>(
  record: Partial<Record<Language, T>> | undefined | null,
  lang: Language,
  fallbackVal: T = '' as unknown as T
): T {
  if (!record) return fallbackVal;
  if (record[lang] !== undefined && record[lang] !== null) return record[lang] as T;
  if (record['en'] !== undefined && record['en'] !== null) return record['en'] as T;
  if (record['es'] !== undefined && record['es'] !== null) return record['es'] as T;
  const values = Object.values(record);
  return values.length > 0 ? (values[0] as T) : fallbackVal;
}

/**
  UI Translations dictionary for multi-language interface
 */
export const UI_TRANSLATIONS: Record<string, Record<Language, string>> = {
  // Navigation & Header
  toursAndAdventures: {
    es: 'Tours y Aventuras ¡Pura Vida!',
    en: 'Tours & Adventures',
    de: 'Touren & Abenteuer',
    fr: 'Tours et Aventures',
    zh: '旅游与探险',
    ja: 'ツアー＆アクティビティ',
  },
  visitorServices: {
    es: 'Servicios Tuanis',
    en: 'Visitor Services',
    de: 'Besucherservice',
    fr: 'Services aux Visiteurs',
    zh: '游客服务',
    ja: '旅行者向けサービス',
  },
  interactiveMap: {
    es: 'Mapa Interactivo',
    en: 'Interactive Map',
    de: 'Interaktive Karte',
    fr: 'Carte Interactive',
    zh: '互动地图',
    ja: 'インタラクティブマップ',
  },
  aiPlanner: {
    es: 'Armá tu Viaje (IA)',
    en: 'AI Itinerary Planner',
    de: 'KI-Reiseplaner',
    fr: 'Planificateur IA',
    zh: 'AI 行程规划',
    ja: 'AI旅程プランナー',
  },
  aiConcierge: {
    es: 'Asistente Tico IA',
    en: 'AI Concierge',
    de: 'KI Concierge',
    fr: 'Concierge IA',
    zh: 'AI 礼宾',
    ja: 'AI コンシェルジュ',
  },
  myBookings: {
    es: 'Reservas',
    en: 'Bookings',
    de: 'Buchungen',
    fr: 'Réservations',
    zh: '我的预订',
    ja: '予約一覧',
  },
  ictCertified: {
    es: 'Agencia de Viajes Costa Rica',
    en: 'Costa Rica Travel Agency',
    de: 'Reisebüro Costa Rica',
    fr: 'Agence de voyage Costa Rica',
    zh: '哥斯达黎加旅行社',
    ja: 'コスタリカ旅行会社',
  },
  tourismHotline: {
    es: 'WhatsApp Turismo 24/7:',
    en: '24/7 Tourism Hotline:',
    de: '24/7 Tourismus-Hotline:',
    fr: 'Hotline Touristique 24/7:',
    zh: '24/7 旅游热线:',
    ja: '24/7 観光ホットライン:',
  },
  
  // Hero & Search
  heroTitle: {
    es: 'Descubre el Paraíso Natural de Costa Rica',
    en: 'Discover the Natural Paradise of Costa Rica',
    de: 'Entdecken Sie das Naturparadies Costa Rica',
    fr: 'Découvrez le Paradis Naturel du Costa Rica',
    zh: '探索哥斯达黎加的自然天堂',
    ja: 'コスタリカの自然の楽園を発見しよう',
  },
  heroSubtitle: {
    es: 'Volcanes majestuosos, bosques nubosos, playas vírgenes y aventuras inolvidables. Experiencias únicas.',
    en: 'Majestic volcanoes, cloud forests, pristine beaches & unforgettable adventures. Unique experiences.',
    de: 'Majestätische Vulkane, Nebelwälder, unberührte Strände & unvergessliche Abenteuer.',
    fr: 'Volcans majestueux, forêts de nuages, plages sauvages et aventures inoubliables.',
    zh: '雄伟的火山、云雾森林、原始海滩和难忘的探险之旅。',
    ja: '雄大な火山、云雾林、手つかずのビーチ、忘れられない冒険へ。',
  },
  searchPlaceholder: {
    es: 'Buscar por volcán, playa, perezosos, canopy...',
    en: 'Search volcanoes, beaches, sloths, ziplining...',
    de: 'Suche nach Vulkan, Strand, Faultier, Zipline...',
    fr: 'Rechercher volcans, plages, paresseux, tyrolienne...',
    zh: '搜索火山、海滩、树懒、高空滑索...',
    ja: '火山、ビーチ、ナマケモノ、ジップラインを検索...',
  },

  // Filter Categories
  allTours: {
    es: 'Todos los Tours',
    en: 'All Tours',
    de: 'Alle Touren',
    fr: 'Tous les Tours',
    zh: '所有行程',
    ja: 'すべてのツアー',
  },

  combos: {
    es: 'Combos de 1 Día',
    en: '1-Day Combos',
    de: '1-Tages-Kombis',
    fr: 'Combos 1 Jour',
    zh: '一日游套餐',
    ja: '1日コンボ'
  },
  volcanoes: {
    es: 'Volcanes y Termales',
    en: 'Volcanoes & Hot Springs',
    de: 'Vulkane & Heiße Quellen',
    fr: 'Volcans & Sources Chaudes',
    zh: '火山与温泉',
    ja: '火山＆温泉',
  },
  zipline: {
    es: 'Canopy y Tirolesas',
    en: 'Zipline Canopy',
    de: 'Zipline & Canopy',
    fr: 'Tyrolienne & Canopy',
    zh: '高空滑索',
    ja: 'ジップライン',
  },
  wildlife: {
    es: 'Perezosos y Fauna',
    en: 'Wildlife & Sloths',
    de: 'Tiere & Faultiere',
    fr: 'Faune & Paresseux',
    zh: '野生动物与树懒',
    ja: '野生动物与树懒',
  },
  beaches: {
    es: 'Playas y Catamarán',
    en: 'Beaches & Catamaran',
    de: 'Strände & Katamaran',
    fr: 'Plages & Catamaran',
    zh: '海滩与双体船',
    ja: 'ビーチ＆双体船',
  },
  rafting: {
    es: 'Rafting en Ríos',
    en: 'River Rafting',
    de: 'Wildwasser-Rafting',
    fr: 'Rafting en Rivière',
    zh: '漂流探险',
    ja: 'ラフティング',
  },
  
  // Card Actions & Buttons
  bookNow: {
    es: 'Reservar Ahora',
    en: 'Book Now',
    de: 'Jetzt Buchen',
    fr: 'Réserver',
    zh: '立即预订',
    ja: '今すぐ予約',
  },
  showMap: {
    es: 'Ver en Mapa',
    en: 'Show on Map',
    de: 'Auf Karte zeigen',
    fr: 'Voir sur la Carte',
    zh: '地图显示',
    ja: '地图で見る',
  },
  maxPrice: {
    es: 'Precio Máx:',
    en: 'Max Price:',
    de: 'Max. Preis:',
    fr: 'Prix Max:',
    zh: '最高价格:',
    ja: '上限価格:',
  },
  pricePerPerson: {
    es: 'Precio por persona',
    en: 'Price per person',
    de: 'Preis pro Person',
    fr: 'Prix par personne',
    zh: '每人价格',
    ja: '1人あたりの料金',
  },
  suggestCurrencyChangeTitle: {
    es: '¿Cambiar moneda sugerida?',
    en: 'Change suggested currency?',
    de: 'Vorgeschlagene Währung ändern?',
    fr: 'Changer la devise suggérée ?',
    zh: '更改建议货币？',
    ja: '推奨通貨に変更しますか？'
  },
  suggestCurrencyChangeDesc: {
    es: 'Hemos notado que cambiaste el idioma. ¿Te gustaría cambiar también la moneda a',
    en: 'We noticed you changed the language. Would you also like to change the currency to',
    de: 'Wir haben festgestellt, dass Sie die Sprache geändert haben. Möchten Sie auch die Währung ändern in',
    fr: 'Nous avons remarqué que vous avez changé de langue. Souhaitez-vous également changer la devise en',
    zh: '我们注意到您更改了语言。您是否也想将货币更改为',
    ja: '言語が変更されました。通貨も次のように変更しますか？'
  },
  yesChangeIt: {
    es: 'Sí, claro',
    en: 'Yes, change it',
    de: 'Ja, ändern',
    fr: 'Oui, changer',
    zh: '是的，更改',
    ja: 'はい、変更します'
  },
  noKeepCurrent: {
    es: 'No, dejarlo así',
    en: 'No, keep current',
    de: 'Nein, aktuelle behalten',
    fr: 'Non, garder la devise actuelle',
    zh: '不，保持当前',
    ja: 'いいえ、現在のままにします'
  },

  freeCancellation: { es: 'Cancelación Gratis', en: 'Free Cancellation', de: 'Kostenlose Stornierung', fr: 'Annulation Gratuite', zh: '免费取消', ja: 'キャンセル無料' },
  privateTour: { es: 'Privado (VIP)', en: 'Private', de: 'Privat', fr: 'Privé', zh: '私人', ja: 'プライベート' },
  groupTour: { es: 'Grupal (Con más compas)', en: 'Group', de: 'Gruppe', fr: 'Groupe', zh: '团体', ja: 'グループ' },
  compareTour: { es: 'Comparar tour', en: 'Compare tour', de: 'Tour vergleichen', fr: 'Comparer le tour', zh: '比较旅游', ja: 'ツアーを比較' },
  fromPrice: { es: 'Desde ', en: 'From ', de: 'Ab ', fr: 'À partir de ', zh: '起 ', ja: 'から ' },
  checkDetails: { es: 'Consultar', en: 'Check', de: 'Prüfen', fr: 'Vérifier', zh: '查看', ja: '確認する' },
  closeMap: { es: 'Cerrar mapa', en: 'Close map', de: 'Karte schließen', fr: 'Fermer la carte', zh: '关闭地图', ja: 'マップを閉じる' },
  close: { es: 'Cerrar', en: 'Close', de: 'Schließen', fr: 'Fermer', zh: '关闭', ja: '閉じる' },
  hotelPickup: { es: 'Recogida en Hoteles:', en: 'Hotel Pickup:', de: 'Hotelabholung:', fr: 'Prise en charge:', zh: '酒店接送:', ja: 'ホテル送迎:' },
  hotelsCovered: { es: 'hoteles en zona', en: 'hotels covered', de: 'Hotels abgedeckt', fr: 'hôtels couverts', zh: '覆盖的酒店', ja: '対象ホテル' },
  departureTimes: { es: 'Horarios Salida:', en: 'Departure Times:', de: 'Abfahrtszeiten:', fr: 'Heures de départ:', zh: '出发时间:', ja: '出発時間:' },
  bookTour: { es: '¡Vamos a mandarnos!', en: 'Book Tour', de: 'Tour buchen', fr: 'Réserver', zh: '预订旅游', ja: 'ツアーを予約' },
  exitMap: { es: 'Salir del Mapa', en: 'Exit Map', de: 'Karte verlassen', fr: 'Quitter la carte', zh: '退出地图', ja: 'マップを終了' },
  priceFrom: { es: 'Precio Desde', en: 'Price From', de: 'Preis ab', fr: 'Prix à partir de', zh: '价格起', ja: '最低価格' },
  viewDetails: { es: 'Ver Detalles', en: 'View Details', de: 'Details ansehen', fr: 'Voir les détails', zh: '查看详情', ja: '詳細を表示' },
  primaryAccess: { es: 'Acceso Principal:', en: 'Primary Access:', de: 'Hauptzugang:', fr: 'Accès Principal:', zh: '主要通道:', ja: '主なアクセス:' },
  weatherPacking: { es: 'Clima & Ropa:', en: 'Weather & Packing:', de: 'Wetter & Kleidung:', fr: 'Météo & Vêtements:', zh: '天气与穿着:', ja: '天気と服装:' },
  exitMapViewAll: { es: 'Salir del Mapa y Ver Todos los Tours', en: 'Exit Map & View All Tours', de: 'Karte verlassen & alle Touren ansehen', fr: 'Quitter la carte & voir tous les tours', zh: '退出地图并查看所有旅游', ja: 'マップを終了してすべてのツアーを表示' },
  signIn: { es: 'Iniciar Sesión', en: 'Sign In', de: 'Anmelden', fr: 'Se connecter', zh: '登录', ja: 'サインイン' },
  buildCustomTrip: { es: 'Armar mi Viaje Tuanis', en: 'Build Package', de: 'Paket erstellen', fr: 'Créer un forfait', zh: '定制行程', ja: 'パッケージを作成' },
  buildCustomTripTitle: { es: 'Armá tu Paquete Chiva', en: 'Build Custom Trip Package', de: 'Individuelles Reisepaket erstellen', fr: 'Créer un voyage sur mesure', zh: '定制行程套餐', ja: 'カスタム旅行パッケージの作成' },
  localBuses: { es: 'Buses Locales / Chivitas', en: 'Local Buses', de: 'Lokale Busse', fr: 'Bus locaux', zh: '当地巴士', ja: 'ローカルバス' },
  clickMarkersOffline: { es: 'Haz clic en los marcadores para explorar detalles (Disponibles sin Internet)', en: 'Click markers to explore details (Available Offline)', de: 'Klicken Sie auf Markierungen, um Details zu sehen (Offline verfügbar)', fr: 'Cliquez sur les marqueurs pour explorer les détails (Disponible hors ligne)', zh: '点击标记以探索详细信息（可离线使用）', ja: 'マーカーをクリックして詳細を確認（オフラインでも利用可能）' },


  licenseText: { es: '🇨🇷 100% Tico • Esencial Costa Rica', en: '🇨🇷 100% Authentic Costa Rica', de: '🇨🇷 100% Authentisches Costa Rica', fr: '🇨🇷 100% Authentique Costa Rica', zh: '🇨🇷 100% 纯正哥斯达黎加', ja: '🇨🇷 100% 本物のコスタリカ' },
  ticoCultureTab: { es: '🇨🇷 Rincón Tico & Cultura', en: '🇨🇷 Tico Culture & Flavors', de: '🇨🇷 Tico-Kultur & Aromen', fr: '🇨🇷 Culture & Saveurs Ticas', zh: '🇨🇷 哥斯达黎加文化与风味', ja: '🇨🇷 ティコ文化と郷土料理' },
  discover: { es: 'DESCUBRE', en: 'DISCOVER', de: 'ENTDECKE', fr: 'DÉCOUVREZ', zh: '发现', ja: '発見する' },
  happyTravelers: { es: 'Viajeros felices desde 2018', en: 'Happy travelers since 2018', de: 'Glückliche Reisende seit 2018', fr: 'Voyageurs heureux depuis 2018', zh: '2018年以来的快乐旅行者', ja: '2018年からの幸せな旅行者' },
  verifiedReviews: { es: '1,200+ Reseñas Verificadas', en: '1,200+ Verified Reviews', de: '1.200+ verifizierte Bewertungen', fr: '1 200+ Avis vérifiés', zh: '1,200+ 条真实评价', ja: '1,200件以上の確認済みレビュー' },
  localGuides: { es: 'Guías Locales', en: 'Local Guides', de: 'Lokale Führer', fr: 'Guides Locaux', zh: '当地导游', ja: '地元ガイド' },
  allRegions: { es: '🌴 Todas las Regiones', en: '🌴 All Regions', de: '🌴 Alle Regionen', fr: '🌴 Toutes les régions', zh: '🌴 所有区域', ja: '🌴 すべての地域' },
  allCategories: { es: '🎯 Todas las Categorías', en: '🎯 All Categories', de: '🎯 Alle Kategorien', fr: '🎯 Toutes les catégories', zh: '🎯 所有类别', ja: '🎯 すべてのカテゴリー' },
  exploreCatalog: { es: 'Ver Todos los Tours', en: 'Explore Catalog', de: 'Katalog ansehen', fr: 'Explorer le catalogue', zh: '浏览目录', ja: 'カタログを見る' },
  aiPlannerBtn: { es: 'IA Planner Tico', en: 'AI Planner', de: 'KI-Planer', fr: 'Planificateur IA', zh: 'AI 规划师', ja: 'AI プランナー' },


  aiMemoryTurn: { es: 'turnos recordados', en: 'turns remembered', de: 'erinnerte Runden', fr: 'tours mémorisés', zh: '记住的轮次', ja: '記憶されたターン' },
  aiMemorySync: { es: 'reserva(s) sincronizada(s)', en: 'booking(s) synced', de: 'Buchung(en) synchronisiert', fr: 'réservation(s) synchronisée(s)', zh: '预订已同步', ja: '予約が同期されました' },
  aiMemoryReady: { es: 'Gemini 1.5 • Listo para ayudarte', en: 'Gemini 1.5 • Ready to help', de: 'Gemini 1.5 • Bereit zu helfen', fr: 'Gemini 1.5 • Prêt à vous aider', zh: 'Gemini 1.5 • 准备好为您服务', ja: 'Gemini 1.5 • お手伝いの準備ができています' },
  aiClearChat: { es: 'Reiniciar conversación', en: 'Clear chat history', de: 'Chatverlauf löschen', fr: 'Effacer l\'historique du chat', zh: '清除聊天记录', ja: 'チャット履歴をクリア' },
  aiSend: { es: 'Enviar', en: 'Send', de: 'Senden', fr: 'Envoyer', zh: '发送', ja: '送信' },
  aiConsulting: { es: 'Consultando memoria y asistente Gemini...', en: 'Consulting context and Gemini AI agent...', de: 'Kontext und Gemini-KI-Agent werden konsultiert...', fr: 'Consultation du contexte et de l\'agent IA Gemini...', zh: '正在咨询上下文和 Gemini AI 助手...', ja: 'コンテキストと Gemini AI エージェントに相談中...' },

};


export let EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  CRC: 510,
  EUR: 0.92,
  GBP: 0.78,
  CAD: 1.36,
};

export async function fetchExchangeRates() {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await response.json();
    if (data && data.rates) {
      EXCHANGE_RATES = { ...EXCHANGE_RATES, ...data.rates };
      window.dispatchEvent(new Event('exchangeRatesUpdated'));
    }
  } catch (error) {
    console.error('Failed to fetch exchange rates', error);
  }
}

export function formatCurrency(amountUSD: number, currency: Currency = 'USD'): string {
  const rate = EXCHANGE_RATES[currency] || 1;
  const amount = amountUSD * rate;
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(amount);
  } catch (e) {
    // Fallback if currency code is not supported by Intl
    return `${currency} ${amount.toFixed(0)}`;
  }
}

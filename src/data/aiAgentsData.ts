import { AIAgent, AgentId, Language, AgentWorkflowCategory } from '../types';

export const AI_AGENTS: AIAgent[] = [
  {
    id: 'customer_service',
    workflowCategory: 'planning_support',
    name: {
      es: 'Martín • Servicio al Cliente',
      en: 'Martín • Customer Service',
      de: 'Martín • Kundenservice',
      fr: 'Martín • Service Client',
      zh: 'Martín • 客户服务',
      ja: 'マルティン • カスタマーサービス'
    },
    role: {
      es: 'Resolución de Problemas y Soporte General',
      en: 'Issue Resolution & General Support',
      de: 'Problemlösung & Allgemeine Unterstützung',
      fr: 'Résolution des problèmes & Support général',
      zh: '问题解决与一般支持',
      ja: '問題解決と一般的なサポート'
    },
    badge: {
      es: 'Soporte',
      en: 'Support',
      de: 'Unterstützung',
      fr: 'Support',
      zh: '支持',
      ja: 'サポート'
    },
    avatarEmoji: '🎧',
    themeColor: 'indigo',
    bgGradient: 'from-indigo-500/20 to-stone-900/40',
    borderColor: '#6366F1',
    description: {
      es: 'Soporte general y resolución de problemas para cualquier duda o inconveniente con tu reserva en costaricatours.es.',
      en: 'General support and issue resolution for any question or problem with your booking on costaricatours.es.',
      de: 'Allgemeiner Support und Problemlösung bei Fragen oder Schwierigkeiten mit Ihrer Buchung auf costaricatours.es.',
      fr: 'Support général et résolution de problèmes pour toute question sur votre réservation via costaricatours.es.',
      zh: '为您在 costaricatours.es 上的预订提供一般支持和问题解决服务。',
      ja: 'costaricatours.esでのご予約に関する一般的なサポートと問題解決を行います。'
    },
    welcomeMessage: {
      es: '¡Hola! Soy Martín. Estoy aquí para ayudarte con cualquier problema, queja o duda general que tengas sobre nuestros servicios. ¿En qué te puedo ayudar hoy?',
      en: 'Hello! I\'m Martín. I\'m here to help you with any issues, complaints, or general questions about our services. How can I assist you today?',
      de: 'Hallo! Ich bin Martín. Ich bin hier, um Ihnen bei Problemen, Beschwerden oder allgemeinen Fragen zu unseren Dienstleistungen zu helfen. Wie kann ich Ihnen heute helfen?',
      fr: 'Bonjour! Je suis Martín. Je suis là pour vous aider avec tous les problèmes, plaintes ou questions générales sur nos services. Comment puis-je vous aider aujourd\'hui?',
      zh: '你好！我是Martín。我在这里帮助您解决有关我们服务的任何问题、投诉或一般性问题。今天我能为您提供什么帮助？',
      ja: 'こんにちは！マルティンです。当社のサービスに関する問題、苦情、一般的な質問についてお手伝いします。本日はどのようにお手伝いできますか？'
    },
    suggestedQuestions: {
      es: [
        'Tengo un problema con mi reserva',
        'Quiero presentar una queja',
        'Necesito contactar a un humano'
      ],
      en: [
        'I have a problem with my booking',
        'I want to file a complaint',
        'I need to contact a human'
      ],
      de: [
        'Ich habe ein Problem mit meiner Buchung',
        'Ich möchte eine Beschwerde einreichen',
        'Ich muss einen Menschen kontaktieren'
      ],
      fr: [
        'J\'ai un problème avec ma réservation',
        'Je veux déposer une plainte',
        'Je dois contacter un humain'
      ],
      zh: [
        '我的预订有问题',
        '我想提出投诉',
        '我需要联系人工服务'
      ],
      ja: [
        '予約に問題があります',
        '苦情を申し立てたいです',
        '人間のオペレーターと話したいです'
      ]
    },
    specialtyTags: {
      es: ['Soporte', 'Quejas', 'Ayuda'],
      en: ['Support', 'Complaints', 'Help'],
      de: ['Support', 'Beschwerden', 'Hilfe'],
      fr: ['Support', 'Plaintes', 'Aide'],
      zh: ['支持', '投诉', '帮助'],
      ja: ['サポート', '苦情', 'ヘルプ']
    }
  },

  {
    id: 'climate',
    workflowCategory: 'nature_adventure',
    name: {
      es: 'Mateo • Clima & Temporadas',
      en: 'Mateo • Weather & Seasons',
      de: 'Mateo • Wetter & Jahreszeiten',
      fr: 'Mateo • Météo & Saisons',
      zh: 'Mateo • 天气与季节',
      ja: 'マテオ • 天気と季節'
    },
    role: {
      es: 'Análisis de Microclimas y Mejor Época para Viajar',
      en: 'Micro-climates & Best Time to Travel Analysis',
      de: 'Mikroklima & Beste Reisezeit',
      fr: 'Micro-climats & Meilleure période pour voyager',
      zh: '微气候及最佳旅行时间分析',
      ja: '微気候および最適な旅行時期の分析'
    },
    badge: {
      es: 'Meteorología',
      en: 'Meteorology',
      de: 'Meteorologie',
      fr: 'Météorologie',
      zh: '气象学',
      ja: '気象学'
    },
    avatarEmoji: '🌤️',
    themeColor: 'cyan',
    bgGradient: 'from-cyan-500/20 to-stone-900/40',
    borderColor: '#06B6D4',
    description: {
      es: 'Analiza los microclimas de Costa Rica para ayudarte a elegir la mejor región y fecha para tu viaje.',
      en: 'Analyzes Costa Rica\'s micro-climates to help you choose the best region and dates for your trip.',
      de: 'Analysiert die Mikroklimazonen Costa Ricas, um die beste Region und Reisezeit zu bestimmen.',
      fr: 'Analyse les micro-climats du Costa Rica pour vous aider à choisir la meilleure région et période.',
      zh: '分析哥斯达黎加的微气候，帮助您选择最佳旅行区域和日期。',
      ja: 'コスタリカの微気候を分析し、最適な地域と旅行時期の選択をサポートします。'
    },
    welcomeMessage: {
      es: '¡Hola! Costa Rica tiene decenas de microclimas. ¿A qué región viajas y en qué fechas para darte el pronóstico exacto?',
      en: 'Hello! Costa Rica has dozens of micro-climates. Where and when are you traveling so I can give you the exact forecast?',
      de: 'Hallo! Costa Rica hat Dutzende von Mikroklimata. Wohin und wann reisen Sie?',
      fr: 'Bonjour! Le Costa Rica possède des dizaines de micro-climats. Où et quand voyagez-vous?',
      zh: '你好！哥斯达黎加有数十种微气候。你计划何时去哪里旅行？',
      ja: 'こんにちは！コスタリカには数十の微気候があります。いつ、どこへ旅行する予定ですか？'
    },
    suggestedQuestions: {
      es: [
        '¿Llueve mucho en octubre en Guanacaste?',
        '¿Qué ropa empacar para Monteverde?',
        '¿Cuándo es la época seca en el Caribe?'
      ],
      en: [
        'Does it rain a lot in October in Guanacaste?',
        'What to pack for Monteverde?',
        'When is the dry season in the Caribbean?'
      ],
      de: [
        'Regnet es im Oktober in Guanacaste viel?',
        'Was soll ich für Monteverde einpacken?',
        'Wann ist die Trockenzeit in der Karibik?'
      ],
      fr: [
        'Pleut-il beaucoup en octobre à Guanacaste?',
        'Que mettre dans ses bagages pour Monteverde?',
        'Quand est la saison sèche dans les Caraïbes?'
      ],
      zh: [
        '瓜纳卡斯特十月份雨水多吗？',
        '去蒙特维多应该带些什么？',
        '加勒比海地区的旱季是什么时候？'
      ],
      ja: [
        'グアナカステの10月はよく雨が降りますか？',
        'モンテベルデには何を持っていくべきですか？',
        'カリブ海側の乾季はいつですか？'
      ]
    },
    specialtyTags: {
      es: ['Clima', 'Ropa', 'Temporadas'],
      en: ['Weather', 'Packing', 'Seasons'],
      de: ['Wetter', 'Packen', 'Jahreszeiten'],
      fr: ['Météo', 'Bagages', 'Saisons'],
      zh: ['天气', '打包', '季节'],
      ja: ['天気', 'パッキング', '季節']
    }
  },
  {
    id: 'legal_visa',
    workflowCategory: 'planning_support',
    name: {
      es: 'Elena • Visados & Inmigración',
      en: 'Elena • Visas & Immigration',
      de: 'Elena • Visa & Einwanderung',
      fr: 'Elena • Visas & Immigration',
      zh: 'Elena • 签证与移民',
      ja: 'エレナ • ビザと移民'
    },
    role: {
      es: 'Trámites de Entrada, Pasaportes e Impuestos',
      en: 'Entry Requirements, Passports & Taxes',
      de: 'Einreisebestimmungen, Pässe & Steuern',
      fr: 'Exigences d\'entrée, Passeports & Taxes',
      zh: '入境要求、护照与税收',
      ja: '入国要件、パスポート、税金'
    },
    badge: {
      es: 'Legal',
      en: 'Legal',
      de: 'Rechtlich',
      fr: 'Légal',
      zh: '法律',
      ja: '法的'
    },
    avatarEmoji: '🛂',
    themeColor: 'blue',
    bgGradient: 'from-blue-500/20 to-stone-900/40',
    borderColor: '#3B82F6',
    description: {
      es: 'Guía sobre requisitos de entrada, pasaportes e impuestos de salida para viajar a Costa Rica.',
      en: 'Guidance on entry requirements, passports, and exit taxes for traveling to Costa Rica.',
      de: 'Beratung zu Einreisebestimmungen, Pässen und Ausreisesteuern für Costa Rica.',
      fr: 'Conseils sur les conditions d\'entrée, passeports et taxes de sortie pour le Costa Rica.',
      zh: '提供有关前往哥斯达黎加的入境要求、护照和离境税的指导。',
      ja: 'コスタリカ旅行に必要な入国要件、パスポート、出国税についてご案内します。'
    },
    welcomeMessage: {
      es: '¡Hola! Te asisto con las regulaciones de entrada a Costa Rica. ¿De qué país es tu pasaporte?',
      en: 'Hello! I assist with Costa Rica entry regulations. What country is your passport from?',
      de: 'Hallo! Ich helfe bei den Einreisebestimmungen für Costa Rica. Aus welchem Land stammt Ihr Pass?',
      fr: 'Bonjour! J\'assiste avec les règlements d\'entrée au Costa Rica. De quel pays vient votre passeport?',
      zh: '你好！我协助处理哥斯达黎加的入境规定。你的护照是哪个国家的？',
      ja: 'こんにちは！コスタリカの入国規制についてサポートします。パスポートはどの国のものですか？'
    },
    suggestedQuestions: {
      es: [
        '¿Necesito visa para entrar a Costa Rica?',
        '¿Cuántos días me puedo quedar como turista?',
        '¿Cuánto es el impuesto de salida?'
      ],
      en: [
        'Do I need a visa to enter Costa Rica?',
        'How many days can I stay as a tourist?',
        'How much is the departure tax?'
      ],
      de: [
        'Brauche ich ein Visum für Costa Rica?',
        'Wie viele Tage kann ich als Tourist bleiben?',
        'Wie hoch ist die Ausreisesteuer?'
      ],
      fr: [
        'Ai-je besoin d\'un visa pour le Costa Rica?',
        'Combien de jours puis-je rester en tant que touriste?',
        'Quel est le montant de la taxe de départ?'
      ],
      zh: [
        '我需要签证才能进入哥斯达黎加吗？',
        '作为游客我可以停留多少天？',
        '离境税是多少？'
      ],
      ja: [
        'コスタリカに入国するにはビザが必要ですか？',
        '観光客として何日間滞在できますか？',
        '出国税はいくらですか？'
      ]
    },
    specialtyTags: {
      es: ['Migración', 'Pasaporte', 'Visas'],
      en: ['Immigration', 'Passport', 'Visas'],
      de: ['Einwanderung', 'Reisepass', 'Visa'],
      fr: ['Immigration', 'Passeport', 'Visas'],
      zh: ['移民', '护照', '签证'],
      ja: ['移民', 'パスポート', 'ビザ']
    }
  },
  {
    id: 'health_safety',
    workflowCategory: 'planning_support',
    name: {
      es: 'Dr. Rojas • Salud & Seguridad',
      en: 'Dr. Rojas • Health & Safety',
      de: 'Dr. Rojas • Gesundheit & Sicherheit',
      fr: 'Dr. Rojas • Santé & Sécurité',
      zh: 'Rojas医生 • 健康与安全',
      ja: 'Dr. ロハス • 健康と安全'
    },
    role: {
      es: 'Vacunas, Seguros, Farmacias y Emergencias',
      en: 'Vaccines, Insurance, Pharmacies & Emergencies',
      de: 'Impfungen, Versicherungen, Apotheken & Notfälle',
      fr: 'Vaccins, Assurance, Pharmacies & Urgences',
      zh: '疫苗、保险、药房与紧急情况',
      ja: 'ワクチン、保険、薬局、緊急事態'
    },
    badge: {
      es: 'Salud',
      en: 'Health',
      de: 'Gesundheit',
      fr: 'Santé',
      zh: '健康',
      ja: '健康'
    },
    avatarEmoji: '🏥',
    themeColor: 'red',
    bgGradient: 'from-red-500/20 to-stone-900/40',
    borderColor: '#EF4444',
    description: {
      es: 'Información sobre vacunas, seguros médicos, farmacias y protocolos de emergencia en Costa Rica.',
      en: 'Information on vaccines, medical insurance, pharmacies, and emergency protocols in Costa Rica.',
      de: 'Informationen zu Impfungen, Krankenversicherung, Apotheken und Notfallprotokollen in Costa Rica.',
      fr: 'Informations sur les vaccins, l\'assurance santé, les pharmacies et les protocoles d\'urgence.',
      zh: '提供有关哥斯达黎加疫苗、医疗保险、药房和紧急情况处理的信息。',
      ja: 'コスタリカでのワクチン、医療保険、薬局、緊急時対応についての情報を提供します。'
    },
    welcomeMessage: {
      es: '¡Pura vida! Costa Rica es un país muy seguro, pero siempre es bueno estar preparado. ¿Tienes alguna duda sobre vacunas, agua potable o seguros médicos?',
      en: 'Pura vida! Costa Rica is very safe, but it\'s always good to be prepared. Any questions about vaccines, tap water, or medical insurance?',
      de: 'Pura vida! Costa Rica ist sicher, aber Vorbereitung ist wichtig. Fragen zu Impfungen oder Trinkwasser?',
      fr: 'Pura vida! Le Costa Rica est sûr, mais il est toujours bon d\'être préparé. Des questions sur les vaccins ou l\'eau potable?',
      zh: '纯粹的生活！哥斯达黎加非常安全，但做好准备总是好的。对疫苗或饮用水有什么疑问吗？',
      ja: 'プラ・ビダ！コスタリカは安全ですが、準備は大切です。ワクチンや飲料水について質問はありますか？'
    },
    suggestedQuestions: {
      es: [
        '¿El agua del grifo es potable?',
        '¿Necesito la vacuna de la Fiebre Amarilla?',
        '¿Dónde hay hospitales cerca de Tamarindo?'
      ],
      en: [
        'Is the tap water safe to drink?',
        'Do I need the Yellow Fever vaccine?',
        'Where are hospitals near Tamarindo?'
      ],
      de: [
        'Ist das Leitungswasser trinkbar?',
        'Brauche ich eine Gelbfieberimpfung?',
        'Wo sind Krankenhäuser in der Nähe von Tamarindo?'
      ],
      fr: [
        'L\'eau du robinet est-elle potable?',
        'Ai-je besoin du vaccin contre la fièvre jaune?',
        'Où sont les hôpitaux près de Tamarindo?'
      ],
      zh: [
        '自来水可以直接饮用吗？',
        '我需要接种黄热病疫苗吗？',
        '塔马林多附近哪里有医院？'
      ],
      ja: [
        '水道水は飲めますか？',
        '黄熱病のワクチンは必要ですか？',
        'タマリンドの近くに病院はありますか？'
      ]
    },
    specialtyTags: {
      es: ['Vacunas', 'Hospitales', 'Seguros'],
      en: ['Vaccines', 'Hospitals', 'Insurance'],
      de: ['Impfungen', 'Krankenhäuser', 'Versicherungen'],
      fr: ['Vaccins', 'Hôpitaux', 'Assurance'],
      zh: ['疫苗', '医院', '保险'],
      ja: ['ワクチン', '病院', '保険']
    }
  },
  {
    id: 'eco_sustainability',
    workflowCategory: 'nature_adventure',
    name: {
      es: 'Luna • Ecoturismo & Sostenibilidad',
      en: 'Luna • Ecotourism & Sustainability',
      de: 'Luna • Ökotourismus & Nachhaltigkeit',
      fr: 'Luna • Écotourisme & Durabilité',
      zh: 'Luna • 生态旅游与可持续发展',
      ja: 'ルナ • エコツーリズムと持続可能性'
    },
    role: {
      es: 'Eco-Lodges, Voluntariado y Compensación de Carbono',
      en: 'Eco-Lodges, Volunteering & Carbon Offset',
      de: 'Öko-Lodges, Freiwilligenarbeit & CO2-Ausgleich',
      fr: 'Éco-Lodges, Bénévolat & Compensation Carbone',
      zh: '生态旅馆、志愿服务与碳补偿',
      ja: 'エコ・ロッジ、ボランティア、カーボンオフセット'
    },
    badge: {
      es: 'Ecoturismo',
      en: 'Ecotourism',
      de: 'Ökotourismus',
      fr: 'Écotourisme',
      zh: '生态旅游',
      ja: 'エコツーリズム'
    },
    avatarEmoji: '♻️',
    themeColor: 'green',
    bgGradient: 'from-green-500/20 to-stone-900/40',
    borderColor: '#22C55E',
    description: {
      es: 'Especialista en eco-lodges, voluntariado y compensación de carbono para un viaje sostenible por Costa Rica.',
      en: 'Specialist in eco-lodges, volunteering, and carbon offsetting for a sustainable trip through Costa Rica.',
      de: 'Spezialist für Öko-Lodges, Freiwilligenarbeit und CO2-Ausgleich für eine nachhaltige Reise.',
      fr: 'Spécialiste des éco-lodges, du bénévolat et de la compensation carbone pour un voyage durable.',
      zh: '专注于生态旅馆、志愿服务和碳补偿，助您实现可持续的哥斯达黎加之旅。',
      ja: 'エコロッジ、ボランティア、カーボンオフセットの専門家として、持続可能な旅をサポートします。'
    },
    welcomeMessage: {
      es: 'Costa Rica es pionera en turismo sostenible. ¿Te interesa encontrar hoteles ecológicos, proyectos de rescate animal o compensar la huella de carbono de tu viaje?',
      en: 'Costa Rica is a pioneer in sustainable tourism. Interested in finding eco-hotels, animal rescue projects, or offsetting your travel carbon footprint?',
      de: 'Costa Rica ist ein Vorreiter im nachhaltigen Tourismus. Interessiert an Öko-Hotels oder Tierschutzprojekten?',
      fr: 'Le Costa Rica est pionnier du tourisme durable. Intéressé par des hôtels écologiques ou des projets de sauvetage d\'animaux?',
      zh: '哥斯达黎加是可持续旅游的先驱。有兴趣寻找生态酒店或动物救援项目吗？',
      ja: 'コスタリカは持続可能な観光のパイオニアです。エコホテルや動物保護プロジェクトに興味はありますか？'
    },
    suggestedQuestions: {
      es: [
        '¿Dónde puedo hacer voluntariado con tortugas?',
        'Recomiéndame un hotel con excelentes prácticas sostenibles',
        '¿Cómo reciclo en los parques nacionales?'
      ],
      en: [
        'Where can I volunteer with turtles?',
        'Recommend a CST certified hotel',
        'How do I recycle in national parks?'
      ],
      de: [
        'Wo kann ich mit Schildkröten Freiwilligenarbeit leisten?',
        'Empfehlen Sie ein CST-zertifiziertes Hotel',
        'Wie recycele ich in Nationalparks?'
      ],
      fr: [
        'Où puis-je faire du bénévolat avec les tortues?',
        'Recommandez un hôtel certifié CST',
        'Comment recycler dans les parcs nationaux?'
      ],
      zh: [
        '我在哪里可以参加海龟志愿服务？',
        '推荐一家通过CST认证的酒店',
        '在国家公园里如何进行垃圾分类回收？'
      ],
      ja: [
        'どこでカメのボランティアができますか？',
        'CST認定ホテルをお勧めします',
        '国立公園ではどのようにリサイクルしますか？'
      ]
    },
    specialtyTags: {
      es: ['Ecológico', 'CST', 'Voluntariado'],
      en: ['Eco-friendly', 'CST', 'Volunteering'],
      de: ['Umweltfreundlich', 'CST', 'Freiwilligenarbeit'],
      fr: ['Écologique', 'CST', 'Bénévolat'],
      zh: ['环保', 'CST', '志愿者'],
      ja: ['環境に優しい', 'CST', 'ボランティア']
    }
  },
  {
    id: 'events_culture',
    workflowCategory: 'logistics_food',
    name: {
      es: 'Carlos • Cultura & Festivales',
      en: 'Carlos • Culture & Festivals',
      de: 'Carlos • Kultur & Festivals',
      fr: 'Carlos • Culture & Festivals',
      zh: 'Carlos • 文化与节庆',
      ja: 'カルロス • 文化とフェスティバル'
    },
    role: {
      es: 'Fiestas Locales, Topes, Carnavales y Eventos',
      en: 'Local Fiestas, Rodeos, Carnivals & Events',
      de: 'Lokale Feste, Rodeos, Karneval & Events',
      fr: 'Fêtes locales, Rodéos, Carnavals & Événements',
      zh: '当地节日、游行、狂欢节与活动',
      ja: '地元のお祭り、ロデオ、カーニバル、イベント'
    },
    badge: {
      es: 'Cultura',
      en: 'Culture',
      de: 'Kultur',
      fr: 'Culture',
      zh: '文化',
      ja: '文化'
    },
    avatarEmoji: '🎭',
    themeColor: 'purple',
    bgGradient: 'from-purple-500/20 to-stone-900/40',
    borderColor: '#A855F7',
    description: {
      es: 'Recomienda fiestas locales, topes, carnavales y eventos culturales según las fechas de tu viaje.',
      en: 'Recommends local fiestas, rodeos, carnivals, and cultural events based on your travel dates.',
      de: 'Empfiehlt lokale Feste, Rodeos, Karneval und Kulturveranstaltungen passend zu Ihrem Reisezeitraum.',
      fr: 'Recommande fêtes locales, rodéos, carnavals et événements culturels selon vos dates de voyage.',
      zh: '根据您的旅行日期推荐当地节日、游行、狂欢节和文化活动。',
      ja: '旅行日程に合わせて地元のお祭り、ロデオ、カーニバル、文化イベントをご案内します。'
    },
    welcomeMessage: {
      es: '¡Upe! ¿Quieres vivir la verdadera cultura tica? Te puedo recomendar topes, corridas a la tica, el Festival Envision, o carnavales según las fechas de tu viaje.',
      en: 'Upe! Want to experience true Tico culture? I can recommend local rodeos, Envision Festival, or carnivals based on your travel dates.',
      de: 'Upe! Möchten Sie die wahre Tico-Kultur erleben? Ich kann Ihnen lokale Events für Ihre Reisedaten empfehlen.',
      fr: 'Upe! Vous voulez vivre la vraie culture Tico? Je peux vous recommander des événements locaux pour vos dates.',
      zh: 'Upe！想体验真正的蒂科文化吗？我可以根据你的旅行日期推荐当地活动。',
      ja: 'Upe！本物のティコ文化を体験したいですか？旅行日程に合わせて地元のイベントをお勧めします。'
    },
    suggestedQuestions: {
      es: [
        '¿Cuándo son las Fiestas de Palmares?',
        '¿Qué se celebra el 25 de julio?',
        '¿Dónde hay música folclórica en vivo?'
      ],
      en: [
        'When are the Fiestas de Palmares?',
        'What is celebrated on July 25th?',
        'Where can I find live folkloric music?'
      ],
      de: [
        'Wann sind die Fiestas de Palmares?',
        'Was wird am 25. Juli gefeiert?',
        'Wo finde ich Live-Folklore-Musik?'
      ],
      fr: [
        'Quand sont les Fiestas de Palmares?',
        'Que célèbre-t-on le 25 juillet?',
        'Où trouver de la musique folklorique live?'
      ],
      zh: [
        '帕尔马雷斯节是什么时候？',
        '7月25日庆祝什么？',
        '哪里可以找到现场民俗音乐？'
      ],
      ja: [
        'パルマレスのお祭りはいつですか？',
        '7月25日は何を祝いますか？',
        '生演奏の民俗音楽はどこで聞けますか？'
      ]
    },
    specialtyTags: {
      es: ['Fiestas', 'Topes', 'Feriados'],
      en: ['Fiestas', 'Rodeos', 'Holidays'],
      de: ['Feste', 'Rodeos', 'Feiertage'],
      fr: ['Fêtes', 'Rodéos', 'Jours fériés'],
      zh: ['节日', '游行', '假期'],
      ja: ['お祭り', 'ロデオ', '祝日']
    }
  },
  {
    id: 'currency_budget',
    workflowCategory: 'planning_support',
    name: {
      es: 'Sofía • Finanzas & Presupuestos',
      en: 'Sofía • Finance & Budgets',
      de: 'Sofía • Finanzen & Budgets',
      fr: 'Sofía • Finances & Budgets',
      zh: 'Sofía • 财务与预算',
      ja: 'ソフィア • 財務と予算'
    },
    role: {
      es: 'Tipo de Cambio, Propinas, Cajeros y Presupuestos',
      en: 'Exchange Rates, Tipping, ATMs & Budgeting',
      de: 'Wechselkurse, Trinkgeld, Geldautomaten & Budgetierung',
      fr: 'Taux de change, Pourboires, Distributeurs & Budgétisation',
      zh: '汇率、小费、自动取款机与预算',
      ja: '為替レート、チップ、ATM、予算作成'
    },
    badge: {
      es: 'Finanzas',
      en: 'Finance',
      de: 'Finanzen',
      fr: 'Finances',
      zh: '财务',
      ja: '財務'
    },
    avatarEmoji: '💳',
    themeColor: 'emerald',
    bgGradient: 'from-emerald-500/20 to-stone-900/40',
    borderColor: '#10B981',
    description: {
      es: 'Asesora sobre tipo de cambio, propinas, cajeros automáticos y presupuesto para tu viaje a Costa Rica.',
      en: 'Advises on exchange rates, tipping, ATMs, and budgeting for your trip to Costa Rica.',
      de: 'Berät zu Wechselkursen, Trinkgeld, Geldautomaten und Budgetplanung für Costa Rica.',
      fr: 'Conseille sur le taux de change, les pourboires, les distributeurs et le budget de voyage.',
      zh: '为您的哥斯达黎加之旅提供汇率、小费、自动取款机和预算方面的建议。',
      ja: 'コスタリカ旅行の為替レート、チップ、ATM、予算計画についてアドバイスします。'
    },
    welcomeMessage: {
      es: '¿Colones o Dólares? Te ayudo a optimizar tu dinero en Costa Rica. ¿Tienes dudas sobre propinas, uso de tarjetas o el tipo de cambio oficial (BCCR)?',
      en: 'Colones or Dollars? I help you optimize your money in Costa Rica. Any questions about tipping, card usage, or the official exchange rate (BCCR)?',
      de: 'Colones oder Dollar? Ich helfe Ihnen, Ihr Geld in Costa Rica zu optimieren.',
      fr: 'Colones ou Dollars? Je vous aide à optimiser votre argent au Costa Rica.',
      zh: '科朗还是美元？我帮你优化在哥斯达黎加的资金使用。对小费、刷卡有什么疑问吗？',
      ja: 'コロンとドルのどちらですか？コスタリカでのお金の最適化をお手伝いします。'
    },
    suggestedQuestions: {
      es: [
        '¿Es mejor pagar en dólares o colones?',
        '¿Es obligatorio dejar propina en los restaurantes?',
        '¿Dónde me recomiendas cambiar dinero?'
      ],
      en: [
        'Is it better to pay in dollars or colones?',
        'Is tipping mandatory in restaurants?',
        'Where do you recommend exchanging money?'
      ],
      de: [
        'Ist es besser, in Dollar oder Colones zu bezahlen?',
        'Ist Trinkgeld in Restaurants obligatorisch?',
        'Wo empfehlen Sie Geld zu wechseln?'
      ],
      fr: [
        'Vaut-il mieux payer en dollars ou en colones?',
        'Le pourboire est-il obligatoire au restaurant?',
        'Où recommandez-vous de changer de l\'argent?'
      ],
      zh: [
        '用美元还是科朗支付更好？',
        '在餐厅给小费是必须的吗？',
        '你建议在哪里换钱？'
      ],
      ja: [
        'ドルとコロンのどちらで支払うのが良いですか？',
        'レストランでのチップは義務ですか？',
        'どこで両替するのがお勧めですか？'
      ]
    },
    specialtyTags: {
      es: ['Colones', 'Propinas', 'Tarjetas'],
      en: ['Colones', 'Tipping', 'Cards'],
      de: ['Colones', 'Trinkgeld', 'Karten'],
      fr: ['Colones', 'Pourboires', 'Cartes'],
      zh: ['科朗', '小费', '信用卡'],
      ja: ['コロン', 'チップ', 'カード']
    }
  },

  {
    id: 'concierge',
    workflowCategory: 'booking',
    name: {
      es: 'Valeria • Pura Vida Concierge VIP',
      en: 'Valeria • VIP Pura Vida Concierge',
      de: 'Valeria • VIP Pura Vida Concierge',
      fr: 'Valeria • Concierge VIP Pura Vida',
      zh: 'Valeria • Pura Vida VIP 礼宾顾问',
      ja: 'ヴァレリア • VIPコンシェルジュ'
    },
    role: {
      es: 'Diseño de Itinerarios a Medida & Lunas de Miel',
      en: 'Custom Itinerary Design & Honeymoons',
      de: 'Individuelle Reiserouten & Flitterwochen',
      fr: 'Création d\'itinéraires sur mesure & Lunes de miel',
      zh: '定制行程设计与蜜月度假顾问',
      ja: 'オーダーメイド旅程作成＆ハネムーン相談'
    },
    badge: {
      es: 'Itinerarios & Planes VIP',
      en: 'VIP Itinerary Planning',
      de: 'VIP-Reiseplanung',
      fr: 'Planification VIP',
      zh: 'VIP行程规划',
      ja: 'VIP旅行プランニング'
    },
    avatarEmoji: '🧭',
    themeColor: '#1E4D2B',
    bgGradient: 'from-[#14391F] to-[#1E4D2B]',
    borderColor: '#2D663B',
    description: {
      es: 'Especialista en armar viajes inolvidables de 3 a 14 días conectando volcanes, playas, bosques nubosos y hoteles boutique en Costa Rica a través de costaricatours.es.',
      en: 'Specialist in crafting 3 to 14-day dream vacations connecting volcanoes, beaches, cloud forests, and boutique eco-lodges via costaricatours.es.',
      de: 'Spezialistin für 3- bis 14-tägige Traumreisen zu Vulkanen, Stränden und Öko-Boutique-Hotels in Costa Rica via costaricatours.es.',
      fr: 'Spécialiste de la conception de voyages de 3 à 14 jours reliant volcans, plages et éco-lodges via costaricatours.es.',
      zh: '专精于打造3至14天全景度假路线，无缝串联火山、海滩、云雾森林及精品生态酒店（基于 costaricatours.es 官方网络）。',
      ja: '火山、ビーチ、熱帯雨林、ブティックホテルを最適に結ぶ3日〜14日のフルオーダー旅程をご提案します。'
    },
    welcomeMessage: {
      es: '¡Pura Vida! 👋 Soy Valeria, tu Concierge VIP en costaricatours.es. Cuéntame cuántos días tienes, si viajas en pareja, familia o amigos, y diseñaré el itinerario perfecto para ti.',
      en: 'Pura Vida! 👋 I am Valeria, your VIP Concierge at costaricatours.es. Tell me how many days you have, who you are traveling with, and I will craft your bespoke itinerary.',
      de: 'Pura Vida! 👋 Ich bin Valeria, Ihre VIP-Concierge bei costaricatours.es. Verraten Sie mir Reisedauer und Vorlieben, und ich erstelle Ihre perfekte Reiseroute.',
      fr: 'Pura Vida ! 👋 Je suis Valeria, votre Concierge VIP sur costaricatours.es. Dites-moi vos dates et préférences, et je composerai votre itinéraire idéal.',
      zh: 'Pura Vida! 👋 我是 Valeria，您在 costaricatours.es 的 VIP 专属礼宾顾问。请告诉我您的旅行天数和同行伙伴，我将为您量身定制专属行程。',
      ja: 'Pura Vida! 👋 costaricatours.es 専属VIPコンシェルジュのヴァレリアです。旅行日数や同行者をお知らせいただければ、最適なカスタムプランを作成します。'
    },
    workflowSteps: {
      es: [
        '1. Diagnóstico de estilo de viaje (Aventura, Relax, Familia, Parejas)',
        '2. Selección de regiones clave (Arenal, Monteverde, Manuel Antonio, Caribe)',
        '3. Optimización de tiempos de traslado para evitar cansancio',
        '4. Entrega de propuesta con enlaces directos de reserva en costaricatours.es'
      ],
      en: [
        '1. Travel style assessment (Adventure, Romance, Family, Wildlife)',
        '2. Key region selection (Arenal, Monteverde, Manuel Antonio, Caribbean)',
        '3. Transfer & drive-time route optimization',
        '4. Complete proposal with direct costaricatours.es booking links'
      ],
      de: [
        '1. Analyse des Reisestils (Abenteuer, Entspannung, Familie, Natur)',
        '2. Auswahl der Zielregionen (Arenal, Monteverde, Manuel Antonio)',
        '3. Optimierung der Transferzeiten zwischen den Etappen',
        '4. Maßgeschneidertes Angebot mit direkten Buchungslinks'
      ],
      fr: [
        '1. Diagnostic du profil (Aventure, Détente, Famille, Faune)',
        '2. Sélection des régions clés (Arenal, Monteverde, Manuel Antonio)',
        '3. Optimisation des temps de route et transferts',
        '4. Devis complet avec liens directs de réservation'
      ],
      zh: [
        '1. 旅行偏好评估（户外探险、浪漫蜜月、亲子家庭、生态摄影）',
        '2. 核心目的地搭配（阿雷纳尔火山、蒙特维多、曼努埃尔安东尼奥）',
        '3. 行程车程与转场时间深度优化',
        '4. 提供可在 costaricatours.es 一键预订的完整方案'
      ],
      ja: [
        '1. 旅行スタイルのヒアリング（アクティブ、癒やし、ファミリー、自然）',
        '2. 主要エリアの選定（アレナル、モンテベルデ、マヌエル・アントニオ）',
        '3. 移動時間・ルートの最適化',
        '4. 即時予約可能なプランとバウチャーのご案内'
      ]
    },
    suggestedQuestions: {
      es: [
        '¿Cómo organizo un viaje de 7 días entre Arenal y Manuel Antonio?',
        '¿Cuál es el mejor itinerario de 10 días para luna de miel?',
        '¿Recomiendas visitar el Caribe Sur o Guanacaste en septiembre?',
        '¿Cómo combinar bosque nuboso de Monteverde con aguas termales de La Fortuna?'
      ],
      en: [
        'How to organize a 7-day trip combining Arenal and Manuel Antonio?',
        'What is the best 10-day honeymoon itinerary in Costa Rica?',
        'Do you recommend Caribbean or Guanacaste in September?',
        'How to best pair Monteverde cloud forest with Arenal hot springs?'
      ],
      de: [
        'Wie plane ich 7 Tage zwischen Arenal und Manuel Antonio?',
        'Beste 10-Tage-Route für Flitterwochen in Costa Rica?',
        'Sollte man im September die Karibik oder Guanacaste besuchen?',
        'Wie kombiniert man Monteverde und die heißen Quellen von Arenal?'
      ],
      fr: [
        'Comment organiser 7 jours entre Arenal et Manuel Antonio ?',
        'Quel est le meilleur itinéraire de 10 jours pour une lune de miel ?',
        'Faut-il aller aux Caraïbes ou au Guanacaste en septembre ?',
        'Comment combiner Monteverde et les thermes d\'Arenal ?'
      ],
      zh: [
        '如何规划结合阿雷纳尔与曼努埃尔安东尼奥的7天行程？',
        '哥斯达黎加最佳的10天蜜月度假路线是什么？',
        '9月份推荐前往加勒比海侧还是瓜纳卡斯特海滩？',
        '如何把蒙特维多云雾森林与拉福图纳温泉无缝串联？'
      ],
      ja: [
        'アレナルとマヌエル・アントニオを巡る7日間の最適ルートは？',
        '10日間のハネムーン旅行のおすすめ旅程を教えてください',
        '9月はカリブ海側とグアナカステのどちらがおすすめですか？',
        'モンテベルデの熱帯雨林とアレナルの温泉を上手につなぐ方法は？'
      ]
    },
    specialtyTags: {
      es: ['Itinerarios a Medida', 'Lunas de Miel', 'Eco-Lodge VIP', 'Multi-Destino'],
      en: ['Custom Itineraries', 'Honeymoons', 'VIP Eco-Lodges', 'Multi-Destination'],
      de: ['Maßgeschneiderte Routen', 'Flitterwochen', 'VIP Öko-Lodges', 'Multi-Stopp'],
      fr: ['Itinéraires sur mesure', 'Lunes de miel', 'Éco-lodges VIP', 'Multi-destinations'],
      zh: ['定制行程', '蜜月度假', '顶级生态酒店', '多目的地连线'],
      ja: ['カスタム旅程', 'ハネムーン', '高級エコホテル', '複数エリア周遊']
    }
  },
  {
    id: 'booking_specialist',
    workflowCategory: 'booking',
    name: {
      es: 'Andrés • Especialista en Reservas & Vouchers',
      en: 'Andres • Booking & Voucher Specialist',
      de: 'Andres • Buchungs- & Gutschein-Spezialist',
      fr: 'Andres • Spécialiste Réservations & Billetterie',
      zh: 'Andres • 官方预订与票务核销专家',
      ja: 'アンドレス • 予約＆バウチャースペシャリスト'
    },
    role: {
      es: 'Tarifas Oficiales, Cupos en Tiempo Real & Facturación Electrónica',
      en: 'Official Rates, Live Availability & Digital Invoicing',
      de: 'Offizielle Tarife, Live-Verfügbarkeit & E-Rechnung',
      fr: 'Tarifs officiels, Disponibilités & Facturation',
      zh: '官方直售价、实时余位核验与电子凭证',
      ja: '公式定価保証・空席確認・電子バウチャー即時発行'
    },
    badge: {
      es: 'Reservas & Pagos 24/7',
      en: '24/7 Booking & Payments',
      de: 'Buchung & Zahlung 24/7',
      fr: 'Réservations 24/7',
      zh: '24小时极速预订',
      ja: '24時間予約・決済対応'
    },
    avatarEmoji: '💳',
    themeColor: '#0F766E',
    bgGradient: 'from-[#0A3D39] to-[#0F766E]',
    borderColor: '#14B8A6',
    description: {
      es: 'Gestiona reservas de última hora, confirmaciones instantáneas con operadores verificados, pagos seguros en USD/CRC (Stripe, SINPE Móvil, PayPal) y facturas tributarias de Costa Rica.',
      en: 'Handles urgent last-minute bookings, instant confirmations with verified operators, secure USD/CRC payments, and Costa Rican official tax invoices.',
      de: 'Verwaltet Last-Minute-Buchungen, Sofortbestätigungen mit zertifizierten Partnern, sichere Zahlungen und Steuerrechnungen.',
      fr: 'Gère les réservations de dernière minute, confirmations instantanées, paiements sécurisés et facturation officielle.',
      zh: '处理即时加急预订、官方地接社余位锁定、多币种安全支付及哥斯达黎加税务合规电子凭证。',
      ja: '直前予約の手続き、公認催行会社との枠確保、安全なカード・送金決済、公式バウチャー発行を即時対応します。'
    },
    welcomeMessage: {
      es: '¡Hola! 💳 Soy Andrés, especialista en reservas de costaricatours.es. Puedo verificar cupos para hoy o mañana, procesar pagos seguros con garantía de reembolso 48h y emitir tu voucher digital con código QR.',
      en: 'Hello! 💳 I am Andres, booking specialist at costaricatours.es. I can verify seats for today or tomorrow, process secure payments with 48h refund guarantee, and issue your QR voucher.',
      de: 'Hallo! 💳 Ich bin Andres, Buchungsspezialist bei costaricatours.es. Ich prüfe kurzfristige Plätze und stelle Ihren digitalen QR-Gutschein mit 48h-Stornogarantie aus.',
      fr: 'Bonjour ! 💳 Je suis Andres, spécialiste réservations sur costaricatours.es. Je vérifie les disponibilités et génère votre voucher QR avec garantie 48h.',
      zh: '您好！💳 我是 costaricatours.es 预订专员 Andres。我可以为您查询今日或明天的加急名额，协助完成支付并生成带核销二维码的官方凭证。',
      ja: 'こんにちは！💳 costaricatours.es 予約担当のアンドレスです。直前の空席確認、48時間前無料キャンセル付き決済、QRコード入りバウチャーの発行をサポートします。'
    },
    workflowSteps: {
      es: [
        '1. Validación de fecha y cupos con operadores autorizados',
        '2. Confirmación de punto de recogida en hotel y horario',
        '3. Procesamiento seguro de pago (Tarjeta, PayPal, SINPE Móvil)',
        '4. Emisión instantánea de voucher con QR y confirmación por WhatsApp'
      ],
      en: [
        '1. Date and live seat verification with official operators',
        '2. Hotel pickup location and schedule confirmation',
        '3. Secure checkout processing (Credit Card, PayPal, SINPE)',
        '4. Instant digital voucher generation with QR & WhatsApp alert'
      ],
      de: [
        '1. Prüfung der Termine und Plätze beim offiziellen Anbieter',
        '2. Bestätigung von Hotelabholung und Uhrzeit',
        '3. Sichere Zahlungsabwicklung',
        '4. Sofortiger Versand des QR-Vouchers und WhatsApp-Bestätigung'
      ],
      fr: [
        '1. Vérification des places avec les opérateurs officiels',
        '2. Confirmation du lieu de prise en charge et de l\'horaire',
        '3. Paiement sécurisé',
        '4. Émission immédiate du voucher numérique avec QR code'
      ],
      zh: [
        '1. 与官方地接社实时同步核实出发日期与剩余席位',
        '2. 确认酒店接送地点、接驳时间及特殊需求',
        '3. 安全通道完成结算（信用卡、PayPal、本地即时转账）',
        '4. 极速生成带防伪二维码的电子凭证并推送至 WhatsApp'
      ],
      ja: [
        '1. 公式催行会社とのリアルタイム空席照会',
        '2. ホテル送迎場所と出発時刻の確定',
        '3. 安全な決済処理（各種クレジットカード、PayPal）',
        '4. QRコード付き確定バウチャーの即時発行と通知'
      ]
    },
    suggestedQuestions: {
      es: [
        '¡Necesito una reserva de URGENCIA para mañana temprano!',
        '¿Cómo funciona la garantía de reembolso si cancelo 48 horas antes?',
        '¿Puedo pagar con SINPE Móvil o tarjeta internacional en colones/dólares?',
        '¿Cómo recibo mi voucher con código QR para mostrar al guía?'
      ],
      en: [
        'I need an URGENT booking for tomorrow morning!',
        'How does the 48-hour free cancellation refund guarantee work?',
        'Can I pay via international credit card or PayPal in USD?',
        'How do I receive my QR voucher to show the tour guide?'
      ],
      de: [
        'Ich brauche eine DRINGENDE Buchung für morgen früh!',
        'Wie funktioniert die 48h-Geld-zurück-Garantie?',
        'Kann ich per Kreditkarte oder PayPal in USD bezahlen?',
        'Wie erhalte ich meinen QR-Gutschein für den Guide?'
      ],
      fr: [
        'J\'ai besoin d\'une réservation URGENTE pour demain matin !',
        'Comment fonctionne la garantie d\'annulation gratuite 48h ?',
        'Puis-je payer par carte internationale ou PayPal ?',
        'Comment recevoir mon voucher QR à présenter au guide ?'
      ],
      zh: [
        '我急需预订明天早上的行程！',
        '提前48小时全额退款保障具体如何运作？',
        '支持使用国际信用卡或 PayPal 以美元/科朗结算吗？',
        '我将如何收到出示给导游的二维码确认单？'
      ],
      ja: [
        '明日の朝出発のツアーを大至急予約したいです！',
        '48時間前までの無料キャンセル返金保証について教えてください',
        '国際クレジットカードやPayPalで支払えますか？',
        'ガイドに提示するQRコードバウチャーはどのように届きますか？'
      ]
    },
    specialtyTags: {
      es: ['Cupos Urgentes', 'Cancelación 48h', 'Voucher con QR', 'Factura Electrónica'],
      en: ['Urgent Seats', '48h Cancellation', 'QR Voucher', 'Official Invoicing'],
      de: ['Kurzfristige Plätze', '48h-Storno', 'QR-Gutschein', 'E-Rechnung'],
      fr: ['Places urgentes', 'Annulation 48h', 'Voucher QR', 'Facturation'],
      zh: ['加急席位', '48小时退改', '二维码凭证', '官方合规发票'],
      ja: ['緊急手配', '48時間前無料取消', 'QRバウチャー', '公式領収証']
    }
  },
  {
    id: 'wildlife',
    workflowCategory: 'nature_adventure',
    name: {
      es: 'Dra. Silvestre • Bio-Guía SINAC',
      en: 'Dr. Sloth • SINAC Eco-Biologist',
      de: 'Dr. Sloth • SINAC Öko-Biologe',
      fr: 'Dr. Sloth • Éco-Biologiste SINAC',
      zh: 'Dr. Sloth • 国家公园生态生物学家',
      ja: 'ドクター・スロース • 国立公園自然生物ガイド'
    },
    role: {
      es: 'Biodiversidad 6% Mundial, Avistamientos & Desove',
      en: 'World 6% Biodiversity, Sloths, Whales & Turtles',
      de: '6% der Welt-Biodiversität, Wildtiere & Schildkröten',
      fr: '6% biodiversité mondiale, Paresseux & Baleines',
      zh: '全球6%生物多样性、观鸟观鲸与海龟产卵专线',
      ja: '世界6%の生物多様性・野生動物＆ウミガメ産卵専門'
    },
    badge: {
      es: 'Eco & Vida Silvestre',
      en: 'Wildlife & Nature',
      de: 'Wildtiere & Natur',
      fr: 'Faune & Flore',
      zh: '野生动植物探秘',
      ja: '野生動物とエコツーリズム'
    },
    avatarEmoji: '🦥',
    themeColor: '#166534',
    bgGradient: 'from-[#0f3d1f] to-[#15803d]',
    borderColor: '#22c55e',
    description: {
      es: 'Identificación de especies nativas (perezosos de 2 y 3 dedos, quetzales, ranitas dardo, ballenas en Uvita), temporadas de desove en Tortuguero/Ostional y reglas de conservación SINAC.',
      en: 'Expert on native wildlife spotting (two/three-toed sloths, quetzals, poison frogs, humpback whales in Uvita), turtle nesting seasons in Tortuguero, and SINAC park regulations.',
      de: 'Experte für Tierbeobachtungen (Faultiere, Quetzale, Pfeilgiftfrösche, Wale), Schildkröten-Nistzeiten und Nationalpark-Regeln.',
      fr: 'Expert de l\'observation de la faune (paresseux, quetzals, grenouilles, baleines), ponte des tortues et parcs SINAC.',
      zh: '深度解析两趾/三趾树懒、凤尾绿咬鹃、红眼树蛙、乌维塔座头鲸及托尔图格罗海龟产卵季与国家公园环保准则。',
      ja: 'ナマケモノ、ケツァール、ヤドクガエル、ウビタのザトウクジラ、トルトゥゲーロのウミガメ産卵期と国立公園保護規則の専門家。'
    },
    welcomeMessage: {
      es: '¡Saludos naturalistas! 🌿 Soy la Dra. Silvestre. Costa Rica concentra el 6% de las especies del planeta en solo el 0.03% de la tierra. ¿Qué animal o parque deseas descubrir hoy?',
      en: 'Greetings nature lovers! 🌿 I am Dr. Sloth. Costa Rica holds 6% of the world\'s species in just 0.03% of the landmass. Which wildlife experience are you looking for today?',
      de: 'Herzliche Grüße Naturfreunde! 🌿 Ich bin Dr. Sloth. Costa Rica beherbergt 6% der weltweiten Arten. Welche Tiere möchten Sie auf Ihrer Reise entdecken?',
      fr: 'Salutations aux passionnés de nature ! 🌿 Je suis Dr. Sloth. Le Costa Rica abrite 6% des espèces mondiales. Quel animal ou parc voulez-vous explorer ?',
      zh: '探索大自然的朋友们，Pura Vida！🌿 我是生态生物学向导 Dr. Sloth。哥斯达黎加以千分之三的国土承载了全球6%的物种。今天您最想探访哪种动物或国家公园？',
      ja: '自然を愛する皆様、こんにちは！🌿 国立公園公認自然ガイドのドクター・スロースです。世界の6%の生物が生息するコスタリカの野生動物探索はお任せください。'
    },
    workflowSteps: {
      es: [
        '1. Análisis de temporada biológica (Desove jul-oct, Ballenas jul-nov/ene-mar)',
        '2. Selección de parque nacional o reserva biológica SINAC idónea',
        '3. Recomendación de equipo óptico (Telescopios Swarovsky, binoculares)',
        '4. Protocolo ético #StopAnimalSelfies y reserva de guía naturalista experto'
      ],
      en: [
        '1. Biological calendar analysis (Turtles Jul-Oct, Whales Jul-Nov/Jan-Mar)',
        '2. Selection of the best SINAC national park or private bio-reserve',
        '3. Optical gear recommendations (Spotting scopes, binoculars, macro lenses)',
        '4. #StopAnimalSelfies ethical wildlife guidelines & certified guide booking'
      ],
      de: [
        '1. Abgleich mit dem biologischen Kalender (Schildkröten, Wale, Zugvögel)',
        '2. Auswahl des idealen SINAC-Nationalparks',
        '3. Ausrüstungsempfehlungen (Spektive, wetterfeste Kleidung)',
        '4. Naturschutzregeln & Buchung zertifizierter Naturführer'
      ],
      fr: [
        '1. Analyse du calendrier biologique (Tortues, Baleines, Quetzals)',
        '2. Choix du parc national SINAC le plus adapté',
        '3. Recommandations d\'équipement d\'observation',
        '4. Règles d\'éthique environnementale et réservation d\'un guide agréé'
      ],
      zh: [
        '1. 生物物候日历核对（海龟产卵7-10月、座头鲸7-11月/1-3月、绿咬鹃繁殖季）',
        '2. 匹配最佳的 SINAC 国家公园或私人生物保护区',
        '3. 观鸟与生态摄影装备建议（长焦镜头、单筒望远镜、防水装备）',
        '4. 恪守 #StopAnimalSelfies 野生动物零距离保护原则并对接持证向导'
      ],
      ja: [
        '1. 生物カレンダーの照合（ウミガメ7〜10月、クジラ7〜11月/1〜3月）',
        '2. 目的地に最適なSINAC国立公園・保護区の選定',
        '3. 観察用光学機器（フィールドスコープ、双眼鏡）のアドバイス',
        '4. 野生生物保護マナーの確認と公認ナチュラリストガイドの手配'
      ]
    },
    suggestedQuestions: {
      es: [
        '¿Dónde y a qué hora es más fácil ver perezosos en su hábitat natural?',
        '¿Cuándo es la temporada de desove de tortugas en Tortuguero y Ostional?',
        '¿Cuál es la mejor época para ver el Quetzal en Monteverde y San Gerardo de Dota?',
        '¿Qué parques nacionales exigen entrada comprada con anticipación en SINAC?'
      ],
      en: [
        'Where and what time is easiest to see sloths in their natural habitat?',
        'When is the turtle nesting season in Tortuguero and Ostional?',
        'What is the peak month to spot the Resplendent Quetzal in Monteverde?',
        'Which national parks require advance online tickets on SINAC?'
      ],
      de: [
        'Wo und wann sieht man am besten Faultiere in freier Wildbahn?',
        'Wann nisten die Schildkröten in Tortuguero und Ostional?',
        'Beste Reisezeit für den Quetzal in Monteverde?',
        'Welche Nationalparks erfordern SINAC-Online-Tickets im Voraus?'
      ],
      fr: [
        'Où et quand observer des paresseux en liberté ?',
        'Quand a lieu la ponte des tortues à Tortuguero et Ostional ?',
        'Quelle est la meilleure période pour voir le Quetzal ?',
        'Quels parcs nécessitent une réservation préalable sur le site du SINAC ?'
      ],
      zh: [
        '在哥斯达黎加什么地点和时间最容易看到野生树懒？',
        '托尔图格罗和奥斯蒂奥纳尔海龟产卵季的具体月份？',
        '在蒙特维多和圣赫拉尔多德多塔观赏凤尾绿咬鹃的最佳时期？',
        '哪些国家公园需要提前在 SINAC 官网实名预约门票？'
      ],
      ja: [
        '自然の生息地でナマケモノに出会えるベストスポットと時間帯は？',
        'トルトゥゲーロとオスティオナルのウミガメ産卵シーズンはいつですか？',
        'モンテベルデで幻の鳥ケツァールを見るためのベストシーズンは？',
        'SINAC事前予約が必須の国立公園はどこですか？'
      ]
    },
    specialtyTags: {
      es: ['Perezosos & Aves', 'Desove de Tortugas', 'Ballenas en Uvita', 'Parques SINAC'],
      en: ['Sloths & Birds', 'Turtle Nesting', 'Whale Watching', 'SINAC Parks'],
      de: ['Faultiere & Vögel', 'Schildkrötenbrut', 'Walbeobachtung', 'SINAC-Parks'],
      fr: ['Paresseux & Oiseaux', 'Ponte tortues', 'Baleines Uvita', 'Parcs SINAC'],
      zh: ['树懒与观鸟', '海龟产卵', '乌维塔座头鲸', 'SINAC国家公园'],
      ja: ['ナマケモノ・野鳥', 'ウミガメ産卵', 'ホエールウォッチング', 'SINAC国立公園']
    }
  },
  {
    id: 'extreme',
    workflowCategory: 'nature_adventure',
    name: {
      es: 'Fabián • Ranger de Aventura & Surf Scout',
      en: 'Fabian • Extreme Adventure & Surf Scout',
      de: 'Fabian • Abenteuer- & Surf-Scout',
      fr: 'Fabian • Ranger Aventure & Surf Scout',
      zh: 'Fabian • 极限探险与冲浪向导',
      ja: 'ファビアン • アドベンチャー＆サーフスカウト'
    },
    role: {
      es: 'Rafting Clase IV/V, Canopy Superman & Swells de Surf',
      en: 'Class IV/V Rafting, Superman Ziplines & Surf Swells',
      de: 'Wildwasser-Rafting Klasse IV/V, Ziplines & Surf-Swells',
      fr: 'Rafting Classe IV/V, Tyroliennes Superman & Spots de Surf',
      zh: '帕库阿雷河IV级漂流、超长超人滑索与世界级浪点',
      ja: '激流ラフティングIV/V級・スーパーマンジップライン・サーフ波予報'
    },
    badge: {
      es: 'Aventura Extrema & Surf',
      en: 'Extreme Adventure & Surf',
      de: 'Extremsport & Surf',
      fr: 'Aventure Extrême & Surf',
      zh: '极限户外与冲浪',
      ja: 'エクストリーム＆サーフィン'
    },
    avatarEmoji: '🏄‍♂️',
    themeColor: '#EA580C',
    bgGradient: 'from-[#7C2D12] to-[#EA580C]',
    borderColor: '#FB923C',
    description: {
      es: 'Asesor en adrenalina pura: Río Pacuare (top 5 mundial de rafting), cañonismo en cascadas de La Fortuna, tirolesa Superman en Monteverde y predicción de oleaje en Roca Bruja, Pavones y Salsa Brava.',
      en: 'Pure adrenaline advisor: Pacuare River (world top 5 rafting), waterfall canyoning in Arenal, Superman ziplining in Monteverde, and swell forecast for Witch\'s Rock, Pavones & Salsa Brava.',
      de: 'Berater für Adrenalinkicks: Pacuare-Rafting, Wasserfall-Abseilen in Arenal, Mega-Ziplines in Monteverde und Surf-Spots wie Pavones.',
      fr: 'Conseiller adrénaline : Rafting Pacuare (top 5 mondial), canyoning aux cascades d\'Arenal, tyrolienne Superman et surf à Pavones.',
      zh: '极致肾上腺素专家：全球排名前五的帕库阿雷河漂流、阿雷纳尔瀑布速降、蒙特维多超人飞索，以及巫师岩、帕沃内斯世界级浪况分析。',
      ja: '激流パクレ川ラフティング、アレナル滝下りキャニオニング、モンテベルデの巨大ジップライン、パボネス等の波情報を提供。'
    },
    welcomeMessage: {
      es: '¡Adrenalina pura! 🏄‍♂️ Soy Fabián. Si buscas emociones fuertes en ríos bravos, las mejores tirolesas del planeta o las olas más largas del Pacífico, estás en el lugar correcto. ¿Cuál es tu nivel de aventura?',
      en: 'Pure adrenaline! 🏄‍♂️ I am Fabian. If you crave intense whitewater, world-class ziplines, or the longest left-hand point breaks on Earth, let\'s dial in your action plan!',
      de: 'Pures Adrenalin! 🏄‍♂️ Ich bin Fabian. Für Wildwasser, epische Ziplines und Weltklasse-Wellen in Costa Rica bin ich Ihr Guide. Welches Abenteuer planen Sie?',
      fr: 'Adrénaline pure ! 🏄‍♂️ Je suis Fabian. Prêt pour des rapides intenses, des tyroliennes géantes ou des vagues de classe mondiale ? Quel défi voulez-vous relever ?',
      zh: '极速激情，Pura Vida！🏄‍♂️ 我是极限探险向导 Fabian。无论您想挑战世界顶级激流、飞越云海滑索，还是追逐太平洋最长浪峰，随时告诉我您的探险等级！',
      ja: 'アドレナリン全開！🏄‍♂️ エクストリームアドベンチャー担当のファビアンです。激流下り、世界最高峰のジップライン、太平洋の極上の波をご案内します。'
    },
    workflowSteps: {
      es: [
        '1. Clasificación de nivel de experiencia y condición física (Principiante / Intermedio / Experto)',
        '2. Chequeo de condiciones meteorológicas y caudales de ríos (Pacuare, Sarapiquí, Balsa)',
        '3. Verificación de certificaciones de seguridad, arneses y guías ACA/IRF',
        '4. Coordinación de traslados con equipo y lockers seguros'
      ],
      en: [
        '1. Skill and fitness level assessment (Beginner / Intermediate / Pro)',
        '2. Weather, swell forecast, and river water-level safety check',
        '3. Verification of ACA/IRF guide certifications and international safety gear',
        '4. Gear logistics and secure locker transport coordination'
      ],
      de: [
        '1. Einstufung von Fitness und Erfahrungslevel',
        '2. Sicherheitscheck der Flusspegel und Wetterbedingungen',
        '3. Prüfung der internationalen Sicherheitsstandards (ACA/IRF)',
        '4. Koordination von Ausrüstungstransfer und Guides'
      ],
      fr: [
        '1. Évaluation du niveau physique et d\'expérience',
        '2. Contrôle de sécurité météo et niveau des rivières',
        '3. Vérification du matériel homologué et des guides certifiés',
        '4. Logistique du matériel et réservation sécurisée'
      ],
      zh: [
        '1. 探险经验与体能等级评估（初阶体验 / 进阶玩家 / 极限挑战者）',
        '2. 实时水文气象与河流水位安全核查（Pacuare、Sarapiquí、Balsa）',
        '3. 催行商国际安全认证（ACA / IRF 认证水上救援向导及专业装备）',
        '4. 防水装备接驳与行程现场储物无缝衔接'
      ],
      ja: [
        '1. 体力・経験レベルの判定（初級・中級・上級エキスパート）',
        '2. 天候・河川水位・サーフスウェルの安全確認',
        '3. 国際基準（IRF/ACA）の安全ギアと有資格レスキューガイドの確認',
        '4. 機材・送迎・ロッカー手配の調整'
      ]
    },
    suggestedQuestions: {
      es: [
        '¿El rafting en Río Pacuare es seguro para principiantes o se requiere experiencia?',
        '¿Cuáles son los mejores meses y mareas para surfear en Witch\'s Rock y Pavones?',
        '¿Cuál es la diferencia entre Sky Trek Arenal y 100% Aventura en Monteverde?',
        '¿En qué consiste el tour de Cañonismo y Rapel en cascadas de Pure Trek?'
      ],
      en: [
        'Is Pacuare River rafting safe for beginners or is prior experience required?',
        'What are the best months and tides for surfing Witch\'s Rock and Pavones?',
        'What is the difference between Sky Trek Arenal and 100% Aventura Monteverde?',
        'What does the Pure Trek Waterfall Canyoning tour include?'
      ],
      de: [
        'Ist Pacuare-Rafting für Anfänger sicher oder braucht man Erfahrung?',
        'Beste Monate und Gezeiten zum Surfen in Witch\'s Rock und Pavones?',
        'Unterschied zwischen Sky Trek Arenal und 100% Aventura Monteverde?',
        'Wie läuft die Pure Trek Wasserfall-Abseiltour ab?'
      ],
      fr: [
        'Le rafting sur la rivière Pacuare est-il accessible aux débutants ?',
        'Quelles sont les meilleures périodes pour surfer à Witch\'s Rock et Pavones ?',
        'Quelle est la différence entre Sky Trek Arenal et 100% Aventura ?',
        'Que comprend l\'excursion de canyoning aux cascades Pure Trek ?'
      ],
      zh: [
        '帕库阿雷河漂流适合没有经验的初学者吗？安全保障如何？',
        '在巫师岩（Witch\'s Rock）和帕沃内斯（Pavones）冲浪的最佳月份与潮汐？',
        '阿雷纳尔 Sky Trek 与蒙特维多 100% Aventura 飞索有什么区别？',
        'Pure Trek 瀑布速降与峡谷探险的具体流程和安全装备是怎样的？'
      ],
      ja: [
        'パクレ川のラフティングは初心者でも参加できますか？安全基準は？',
        'ウィッチズロックやパボネスでサーフィンをするベストシーズンは？',
        'アレナルのスカイトレックとモンテベルデの100%アベンチュラの違いは？',
        'ピュアトレックの滝下りキャニオニングツアーの詳細は？'
      ]
    },
    specialtyTags: {
      es: ['Rafting Pacuare', 'Surf Swells', 'Tirolesa Superman', 'Cañonismo Cascadas'],
      en: ['Pacuare Rafting', 'Surf Spots', 'Superman Zipline', 'Waterfall Canyoning'],
      de: ['Pacuare-Rafting', 'Surf-Spots', 'Superman-Zipline', 'Wasserfall-Abseilen'],
      fr: ['Rafting Pacuare', 'Spots de Surf', 'Tyrolienne géante', 'Canyoning'],
      zh: ['帕库阿雷漂流', '世界级冲浪', '超人滑翔飞索', '瀑布峡谷速降'],
      ja: ['パクレ川激流下り', 'サーフスポット', 'スーパーマンジップライン', '滝下りキャニオニング']
    }
  },
  {
    id: 'logistics',
    workflowCategory: 'logistics_food',
    name: {
      es: 'Esteban • Capitán de Rutas & Logística 4x4',
      en: 'Esteban • Route Captain & 4x4 Logistics',
      de: 'Esteban • Routenkapitän & 4x4-Logistik',
      fr: 'Esteban • Capitaine de Route & Logistique 4x4',
      zh: 'Esteban • 陆路交通与4x4四驱调度专家',
      ja: 'エステバン • ルートキャプテン＆4WDロジスティクス'
    },
    role: {
      es: 'Tiempos Reales de Manejo, Shuttles, Ferris & Vuelos Sansa',
      en: 'Real Drive Times, Shuttles, Ferries & Sansa Flights',
      de: 'Fahrtzeiten, Shuttle-Busse, Fähren & Sansa-Flüge',
      fr: 'Temps de route réels, Navettes, Ferries & Vols Sansa',
      zh: '实际驾车耗时、城际穿梭车、轮渡与Sansa境内航班',
      ja: 'リアル移動時間・シャトルバス・フェリー・Sansa国内線手配'
    },
    badge: {
      es: 'Transporte & Carreteras',
      en: 'Transport & Roads',
      de: 'Transport & Straßen',
      fr: 'Transport & Routes',
      zh: '交通路况与转运',
      ja: '交通・道路・国内フライト'
    },
    avatarEmoji: '🚐',
    themeColor: '#0369A1',
    bgGradient: 'from-[#082F49] to-[#0369A1]',
    borderColor: '#38BDF8',
    description: {
      es: 'Cálculo de tiempos reales de traslado (100 km toman 3 a 4 horas por montaña), cuándo alquilar 4x4 vs SUV, horarios de ferri de Paquera y conexiones aéreas con vuelos domésticos.',
      en: 'Accurate drive times (100 km takes 3 to 4 hours in mountain terrain), 4x4 vs 4x2 rental recommendations, Paquera ferry ticketing, and domestic flight hops.',
      de: 'Berechnung realistischer Fahrtzeiten im Bergland, 4x4-Mietwagen-Empfehlungen, Paquera-Fähre und Inlandsflüge.',
      fr: 'Calcul précis des temps de route en montagne, conseils location 4x4, ferry de Paquera et vols intérieurs.',
      zh: '精准测算山区真实驾车时间（100公里约需3-4小时）、4x4四驱与SUV选型、帕克拉轮渡班次及境内直达航班换乘。',
      ja: '山道での正確な所要時間計算（100kmに3〜4時間）、4WDレンタカー要否、パケラフェリー時刻表、国内線乗り継ぎをご案内。'
    },
    welcomeMessage: {
      es: '¡Buenas rutas! 🚐 Soy Esteban. En Costa Rica las distancias engañan: una curva en la montaña o un río cambia todo. Dime tu punto de partida y destino para darte la ruta más rápida y segura.',
      en: 'Smooth travels! 🚐 I am Esteban. In Costa Rica distances are deceptive due to mountainous terrain. Give me your start and end points for the safest, fastest route.',
      de: 'Gute Fahrt! 🚐 Ich bin Esteban. Entfernungen in Costa Rica werden oft unterschätzt. Nennen Sie mir Start und Ziel für die sicherste und schnellste Route.',
      fr: 'Bonne route ! 🚐 Je suis Esteban. Au Costa Rica, les distances sont trompeuses en montagne. Indiquez-moi votre trajet pour obtenir l\'itinéraire idéal.',
      zh: '一路顺风，Pura Vida！🚐 我是交通物流专家 Esteban。哥斯达黎加地势多山，地图上的直线距离极具迷惑性。告诉我您的出发地与目的地，我来帮您测算最平稳省时的路线。',
      ja: '快適なドライブを！🚐 ルートロジスティクス担当のエステバンです。コスタリカは山道が多く距離感が日本と異なります。出発地と目的地をお知らせいただければ最短・安全なルートを計算します。'
    },
    workflowSteps: {
      es: [
        '1. Análisis topográfico de la ruta y estado de carreteras (Ruta 32, Ruta 27, Costanera)',
        '2. Evaluación de necesidad de vehículo 4x4 alto (Monteverde, Santa Teresa, Drake Bay)',
        '3. Comparativa de costos y tiempos: Manejo vs Shuttle Turístico vs Vuelo Doméstico',
        '4. Emisión de recomendaciones viales con puntos de combustible y peajes'
      ],
      en: [
        '1. Route topography and road condition check (Route 32, Route 27, Costanera 34)',
        '2. 4x4 high-clearance requirement evaluation (Monteverde, Santa Teresa, Osa)',
        '3. Price and time comparison: Self-Drive vs Shared Shuttle vs Domestic Flight',
        '4. Practical road advice: Gas stations, toll payments, and offline maps'
      ],
      de: [
        '1. Überprüfung von Straßenverhältnissen und Bergstrecken',
        '2. Prüfung, ob ein echter 4x4 Geländewagen nötig ist',
        '3. Vergleich: Mietwagen vs. Touristen-Shuttle vs. Inlandsflug',
        '4. Tipps zu Mautstellen, Tankstellen und Offline-Navigation'
      ],
      fr: [
        '1. Étude de la topographie et de l\'état des routes',
        '2. Évaluation du besoin d\'un véhicule 4x4 surélevé',
        '3. Comparatif : Voiture de location vs Navette partagée vs Vol intérieur',
        '4. Conseils pratiques sur les péages, stations et cartes hors-ligne'
      ],
      zh: [
        '1. 路线地形与公路路况核验（32号穿越国家公园路段、27号收费公路、34号滨海公路）',
        '2. 评估是否必须配备高底盘4x4四驱（蒙特维多碎石路、圣特雷莎过河、德雷克湾）',
        '3. 综合性价比对比：自驾租车 vs 门到门城际Shuttle vs 40分钟境内航线',
        '4. 输出行车注意事项（加油站分布、ETC/现金收费站、离线地图下载）'
      ],
      ja: [
        '1. ルートの地形と道路状況の診断（32号線、27号線、海岸34号線）',
        '2. 高床4WDの必要性判定（モンテベルデ、サンタ・テレサ、オサ半島）',
        '3. 費用と時間の比較（レンタカー vs 共有シャトル vs 国内線40分）',
        '4. ガソリンスタンド、有料道路、オフラインマップ等の実用アドバイス'
      ]
    },
    suggestedQuestions: {
      es: [
        '¿Cuánto tiempo real toma manejar de San José (SJO) a La Fortuna o Manuel Antonio?',
        '¿Es realmente necesario un vehículo 4x4 para subir a Monteverde o ir a Santa Teresa?',
        '¿Cómo funciona el cruce en ferri de Puntarenas a Paquera para ir a Tambor y Montezuma?',
        '¿Vale la pena tomar un vuelo doméstico interno hacia Bahía Drake / Corcovado?'
      ],
      en: [
        'How long does it realistically take to drive from SJO Airport to Arenal or Manuel Antonio?',
        'Is a 4x4 vehicle really required for Monteverde or Santa Teresa?',
        'How does the Puntarenas to Paquera ferry work for visiting Nicoya Peninsula?',
        'Is it worth booking a domestic flight to Drake Bay / Corcovado?'
      ],
      de: [
        'Wie lange fährt man realistisch vom Flughafen SJO nach Arenal oder Manuel Antonio?',
        'Braucht man für Monteverde oder Santa Teresa wirklich einen 4x4?',
        'Wie bucht man die Fähre Puntarenas-Paquera für die Nicoya-Halbinsel?',
        'Lohnt sich ein Inlandsflug nach Drake Bay / Corcovado?'
      ],
      fr: [
        'Combien de temps faut-il pour aller de l\'aéroport SJO à Arenal ou Manuel Antonio ?',
        'Un 4x4 est-il indispensable pour aller à Monteverde ou Santa Teresa ?',
        'Comment réserver le ferry de Puntarenas à Paquera ?',
        'Vaut-il la peine de prendre un vol intérieur vers Drake Bay / Corcovado ?'
      ],
      zh: [
        '从圣何塞国际机场（SJO）自驾到阿雷纳尔或曼努埃尔安东尼奥真实耗时多久？',
        '前往蒙特维多或圣特雷莎是否必须租用高底盘 4x4 四驱车？',
        '蓬塔雷纳斯到帕克拉（Puntarenas - Paquera）的渡轮如何提前订票与登船？',
        '从圣何塞前往德雷克湾/科尔科瓦多国家公园乘坐境内飞机划算吗？'
      ],
      ja: [
        'サンホセ国際空港（SJO）からアレナルやマヌエル・アントニオまでの実際の運転時間は？',
        'モンテベルデやサンタ・テレサへ行くのに4WD車は本当に必須ですか？',
        'プンタレナスからパケラへのフェリーの予約方法と乗り方は？',
        'ドレイク湾やコルコバード国立公園へSansa国内線フライトを利用するメリットは？'
      ]
    },
    specialtyTags: {
      es: ['Tiempos de Manejo', 'Alquiler 4x4', 'Ferri Paquera', 'Vuelos Sansa'],
      en: ['Drive Times', '4x4 Rental', 'Paquera Ferry', 'Sansa Flights'],
      de: ['Fahrtzeiten', '4x4 Mietwagen', 'Paquera-Fähre', 'Sansa-Flüge'],
      fr: ['Temps de route', 'Location 4x4', 'Ferry Paquera', 'Vols Sansa'],
      zh: ['实际驾车耗时', '4x4四驱租赁', '轮渡预订', 'Sansa国内航线'],
      ja: ['運転時間計算', '4WDレンタカー', 'フェリー手配', 'Sansa国内線']
    }
  },
  {
    id: 'culinary',
    workflowCategory: 'logistics_food',
    name: {
      es: 'Doña Carmen • Chef Tica & Maestra Cafetalera',
      en: 'Dona Carmen • Tico Chef & Coffee Master',
      de: 'Doña Carmen • Tica-Köchin & Kaffee-Meisterin',
      fr: 'Doña Carmen • Cheffe Tica & Experte Café',
      zh: 'Carmen 主厨 • 哥斯达黎加美食与咖啡品鉴大师',
      ja: 'カルメン • コスタリカ料理シェフ＆最高級珈琲マイスター'
    },
    role: {
      es: 'Gastronomía Autóctona, Sodas Tradicionales & Café de Altura Tarrazú',
      en: 'Autochthonous Gastronomy, Local Sodas & Tarrazu Specialty Coffee',
      de: 'Traditionelle Sodas, Lokalküche & Hochlandkaffee aus Tarrazú',
      fr: 'Gastronomie locale, Sodas typiques & Café d\'altitude Tarrazú',
      zh: '传统地道Sodas小馆、加洛平托、塔拉珠高海拔精品咖啡',
      ja: '伝統ローカル食堂ソーダ・郷土料理・タラズ最高級高地産アラビカ珈琲'
    },
    badge: {
      es: 'Gastronomía & Café',
      en: 'Food & Coffee Culture',
      de: 'Essen & Kaffee',
      fr: 'Gastronomie & Café',
      zh: '地道美食与咖啡文化',
      ja: '郷土グルメ＆コーヒー'
    },
    avatarEmoji: '☕',
    themeColor: '#78350F',
    bgGradient: 'from-[#451A03] to-[#78350F]',
    borderColor: '#D97706',
    description: {
      es: 'Guía de platos típicos (Gallo Pinto con Salsa Lizano, Casados campesinos, Chifrijo josefino, Rice & Beans caribeño) y cata de café 100% Arábica de altura en Tarrazú, Naranjo y Poás.',
      en: 'Guide to authentic local dishes (Gallo Pinto with Salsa Lizano, Casados, Chifrijo, Caribbean Rice & Beans) and 100% Arabica specialty coffee tours in Tarrazu, Naranjo & Poas.',
      de: 'Führer für authentische Gerichte (Gallo Pinto, Casado, Chifrijo) und Kaffeetouren in den Regionen Tarrazú und Naranjo.',
      fr: 'Guide des saveurs locales (Gallo Pinto, Casados, Chifrijo, Rice & Beans) et dégustation de café 100% Arabica à Tarrazú et Poás.',
      zh: '带您品尝哥斯达黎加最具灵魂的特色美食（加洛平托配秘制利扎诺酱、卡萨多农夫套餐、奇弗里霍、加勒比椰浆饭）及塔拉珠、波阿斯高山精品咖啡庄园巡礼。',
      ja: '国民食ガジョピント（リサノソース添え）、カサード、チフリホ、加勒比風ココナッツライス、タラズ産100%アラビカ種スペシャリティコーヒーを徹底案内。'
    },
    welcomeMessage: {
      es: '¡Buen provecho y Pura Vida! ☕ Soy Doña Carmen. En Costa Rica el amor entra por la cocina: desde un buen café chorreado al amanecer hasta un chifrijo con chicharrones crujientes. ¿Qué te gustaría saborear?',
      en: 'Buen provecho and Pura Vida! ☕ I am Dona Carmen. In Costa Rica life begins with pour-over coffee and homemade Casados. What flavors are you eager to taste today?',
      de: 'Guten Appetit und Pura Vida! ☕ Ich bin Doña Carmen. Entdecken Sie frisch aufgebrühten Tarrazú-Kaffee und typische Casados. Worauf haben Sie Appetit?',
      fr: 'Bon appétit et Pura Vida ! ☕ Je suis Doña Carmen. Découvrez le vrai café chorreado et nos savoureux plats traditionnels. Quelles saveurs vous tentent ?',
      zh: '好胃口，Pura Vida！☕ 我是 Carmen 主厨。在哥斯达黎加，最动人的故事都从清晨那杯布袋滴滤的高山咖啡和一份地道的 Casado 开始。今天想品尝什么美味？',
      ja: '召し上がれ、Pura Vida！☕ シェフのカルメンです。木製ドリッパーで淹れる本場タラズの朝珈琲から、絶品ローカル料理まで、食の魅力をたっぷりお届けします。'
    },
    workflowSteps: {
      es: [
        '1. Identificación de preferencias culinarias o restricciones dietéticas (Vegano, Gluten-Free, Pescetariano)',
        '2. Mapeo de "Sodas" tradicionales con mejor calificación local en cada cantón',
        '3. Selección de tour de café de especialidad con cata profesional y proceso de beneficiado',
        '4. Recomendación de compras de souvenirs gastronómicos (Salsa Lizano, Café Geisha, Cacao orgánico)'
      ],
      en: [
        '1. Dietary preference analysis (Vegan, Vegetarian, Gluten-Free, Seafood)',
        '2. Top-rated authentic family "Sodas" mapping across each region',
        '3. Specialty coffee plantation tour selection with professional cupping',
        '4. Culinary souvenir buying tips (Salsa Lizano, Tarrazu beans, organic dark chocolate)'
      ],
      de: [
        '1. Abstimmung auf Ernährungswünsche (Vegan, Glutenfrei, Meeresfrüchte)',
        '2. Empfehlung der besten traditionellen Familien-Sodas vor Ort',
        '3. Buchung von Kaffeetouren mit professioneller Verkostung',
        '4. Souvenir-Tipps für die besten Kaffeebohnen und Schokolade'
      ],
      fr: [
        '1. Prise en compte des régimes alimentaires (Végétarien, Végan, Sans gluten)',
        '2. Sélection des meilleures "Sodas" familiales authentiques',
        '3. Choix d\'une plantation de café avec dégustation professionnelle',
        '4. Recommandations de souvenirs gourmands (Café, Cacao bio, Salsa Lizano)'
      ],
      zh: [
        '1. 饮食偏好与过敏原排查（纯素食 Vegan、无麸质 Gluten-Free、海鲜嗜好者）',
        '2. 各省份与小镇最高口碑的本土家庭餐厅（Soda）精确定位推荐',
        '3. 预订配备专业杯测（Cupping）的高海拔咖啡庄园与有机可可制作体验',
        '4. 伴手礼选购指南（正宗 Lizano 秘制酱汁、瑰夏/卡杜拉咖啡豆、生豆原产地证明）'
      ],
      ja: [
        '1. 食の好み・アレルギー確認（ヴィーガン、グルテンフリー、魚介類）',
        '2. 各エリアで評判の地元密着型大衆食堂「ソーダ」の厳選案内',
        '3. カッピング体験付き高級珈琲農園＆オーガニックカカオツアーの手配',
        '4. お土産購入ガイド（リサノソース、タラズ産ゲイシャ種珈琲豆）'
      ]
    },
    suggestedQuestions: {
      es: [
        '¿Qué ingredientes lleva el auténtico Gallo Pinto y por qué la Salsa Lizano es indispensable?',
        '¿Qué es una "Soda" en Costa Rica y cuánto cuesta comer un Casado típico en colones?',
        '¿Cuáles son las diferencias de sabor entre el café de Tarrazú, Naranjo y Poás?',
        '¿Dónde probar la mejor comida caribeña (Rice and Beans y Pollo Caribeño) en Puerto Viejo?'
      ],
      en: [
        'What are the key ingredients of authentic Gallo Pinto and why is Salsa Lizano essential?',
        'What is a Costa Rican "Soda" and how much does a typical Casado lunch cost in USD/CRC?',
        'What are the flavor profile differences between Tarrazu, Naranjo, and Poas coffee?',
        'Where to find the best Caribbean food (Rice and Beans & Caribbean Chicken) in Puerto Viejo?'
      ],
      de: [
        'Was gehört in ein echtes Gallo Pinto und warum ist Salsa Lizano so berühmt?',
        'Was ist eine Soda und wie viel kostet ein Casado-Mittagessen?',
        'Unterschiede im Geschmack zwischen Tarrazú-, Naranjo- und Poás-Kaffee?',
        'Wo gibt es das beste Rice & Beans an der Karibikküste?'
      ],
      fr: [
        'Quels sont les ingrédients du vrai Gallo Pinto et le secret de la Salsa Lizano ?',
        'Qu\'est-ce qu\'une "Soda" et quel est le prix moyen d\'un Casado ?',
        'Quelles sont les caractéristiques des cafés de Tarrazú, Naranjo et Poás ?',
        'Où déguster les meilleurs plats afro-caribéens à Puerto Viejo ?'
      ],
      zh: [
        '地道的 Gallo Pinto 包含哪些配料？为什么 Salsa Lizano 是不可或缺的灵魂酱汁？',
        '什么是哥斯达黎加的“Soda”小馆？一份典型的 Casado 午餐大约花费多少科朗/美元？',
        '塔拉珠（Tarrazú）、纳兰霍（Naranjo）和波阿斯（Poás）产区咖啡的风味有何差异？',
        '在加勒比海港 Puerto Viejo 哪里能吃到最地道的椰浆饭（Rice and Beans）？'
      ],
      ja: [
        '伝統的なガジョピントの材料と、リサノソースが欠かせない理由は？',
        'コスタリカの「ソーダ」とはどんな店で、カサードの相場はいくらですか？',
        'タラズ、ナランホ、ポアス各産地のコーヒーの風味の違いは？',
        'プエルト・ビエホで一番美味しいカリブ風ライス＆ビーンズを食べるならどこ？'
      ]
    },
    specialtyTags: {
      es: ['Gallo Pinto & Sodas', 'Café de Tarrazú', 'Chifrijo Tico', 'Comida Caribeña'],
      en: ['Gallo Pinto & Sodas', 'Tarrazu Coffee', 'Chifrijo Snack', 'Caribbean Food'],
      de: ['Gallo Pinto & Sodas', 'Tarrazú-Kaffee', 'Chifrijo', 'Karibische Küche'],
      fr: ['Gallo Pinto & Sodas', 'Café Tarrazú', 'Chifrijo', 'Cuisine des Caraïbes'],
      zh: ['平托饭与传统小馆', '塔拉珠精品咖啡', '奇弗里霍小吃', '加勒比风味'],
      ja: ['ガジョピントとソーダ', 'タラズ産高級珈琲', 'チフリホ名物', 'カリブ料理']
    }
  },
  {
    id: 'budget_backpacker',
    workflowCategory: 'specialized',
    name: {
      es: 'Sofía • Guía Mochilera & Ahorro Inteligente',
      en: 'Sofia • Budget Backpacker & Smart Savings',
      de: 'Sofia • Backpacker & Spartipps',
      fr: 'Sofia • Guide Routard & Bons Plans',
      zh: 'Sofia • 穷游背包客与高性价比向导',
      ja: 'ソフィア • バックパッカー＆スマート節約ガイド'
    },
    role: {
      es: 'Buses Públicos, Hostels Verificados, Sodas Económicas & Entradas Low-Cost',
      en: 'Public Buses, Verified Hostels, Cheap Sodas & Low-Cost Tips',
      de: 'Öffentliche Busse, Hostels, günstige Sodas & Spartipps',
      fr: 'Bus publics, Auberges de jeunesse, Sodas pas chères & Bons plans',
      zh: '公共长途巴士、青年旅舍、平价Sodas与省钱秘籍',
      ja: 'ローカル長距離バス・格安ホステル・地元食堂・節約トラベル術'
    },
    badge: {
      es: 'Mochileros & Low-Cost',
      en: 'Backpackers & Budget',
      de: 'Backpacker & Budget',
      fr: 'Routards & Budget',
      zh: '背包客与省钱攻略',
      ja: '格安＆バックパッカー'
    },
    avatarEmoji: '🎒',
    themeColor: '#4F46E5',
    bgGradient: 'from-[#312E81] to-[#4F46E5]',
    borderColor: '#818CF8',
    description: {
      es: 'Optimizadora de presupuestos para viajar por Costa Rica con el mejor costo-beneficio: terminales de buses públicos de San José (TUASA, Tralapa, MEPE), hostels con cocina y actividades gratuitas.',
      en: 'Budget optimization pro to experience Costa Rica without breaking the bank: public bus terminals in San Jose, vetted hostels with kitchens, free hot springs and swimming holes.',
      de: 'Expertin für kostengünstiges Reisen in Costa Rica: Öffentliche Busse ab San José, Hostels mit Küche und kostenlose Geheimtipps.',
      fr: 'Experte pour voyager au Costa Rica à petit budget : Lignes de bus publics, auberges avec cuisine et spots naturels gratuits.',
      zh: '为您打造超高性价比的哥斯达黎加背包穷游方案：圣何塞各大长途公车站指引、带厨房的优质青旅、免费野溪天然温泉与省钱门票组合。',
      ja: 'コスパ良くコスタリカを旅する節約術のプロ。サンホセの長距離バスターミナル、キッチン付きホステル、無料の天然野天温泉情報をお届け。'
    },
    welcomeMessage: {
      es: '¡Hola viajero! 🎒 Soy Sofía. Costa Rica tiene fama de cara, pero sabiendo usar buses públicos (¡viajes por $3-$8 USD!), comiendo en sodas y visitando pozas naturales, puedes recorrerla con presupuesto mochilero. ¿Cuál es tu límite diario?',
      en: 'Hey traveler! 🎒 I am Sofia. Costa Rica can be expensive, but with public buses ($3-$8 rides!), market Sodas, and secret swimming holes, you can do it on a real budget. What is your daily target?',
      de: 'Hallo Backpacker! 🎒 Ich bin Sofia. Mit öffentlichen Bussen für wenige Dollar, Mahlzeiten in Sodas und kostenlosen Naturspots reisen Sie günstig durch Costa Rica.',
      fr: 'Salut voyageur ! 🎒 Je suis Sofia. Découvrez le Costa Rica sans vous ruiner grâce aux bus locaux, sodas de marché et coins de baignade gratuits.',
      zh: '背包客朋友们好！🎒 我是省钱攻略向导 Sofia。很多人觉得哥斯达黎加消费高，但只要掌握长途公车（单程仅需3-8美元）、菜市场 Soda 和免费野溪温泉，就能以极低预算玩转全境。',
      ja: 'バックパッカーの皆さん、こんにちは！🎒 節約アドバイザーのソフィアです。片道3〜8ドルのローカルバスや市場のソーダ、無料の秘境スポットを駆使して低予算でコスタリカを満喫しましょう。'
    },
    workflowSteps: {
      es: [
        '1. Establecimiento de presupuesto diario en colones y dólares ($30 - $70 USD/día)',
        '2. Planificación de rutas en buses de línea regular desde terminales josefinas (Coca-Cola, 7-10, Caribe)',
        '3. Selección de hostales con cocina comunitaria para ahorrar en desayunos y cenas',
        '4. Lista de atracciones gratuitas o de bajo costo (Río Chollín gratis en Arenal, Catarata Montezuma)'
      ],
      en: [
        '1. Daily budget bracket definition ($30 - $70 USD/day target)',
        '2. Public bus route planning from San Jose terminals (Coca-Cola, 7-10, Terminal Caribe)',
        '3. Kitchen-equipped hostel selection to save on food expenses',
        '4. Curated list of free natural attractions (Free hot spring river in Arenal, Montezuma waterfalls)'
      ],
      de: [
        '1. Festlegung des Tagesbudgets ($30 - $70 pro Tag)',
        '2. Routenplanung mit öffentlichen Überlandbussen ab San José',
        '3. Auswahl von Hostels mit Küche zum Selbstkochen',
        '4. Zusammenstellung kostenloser Natur-Highlights'
      ],
      fr: [
        '1. Définition du budget quotidien ($30 - $70 / jour)',
        '2. Itinéraires en bus locaux depuis les gares de San José',
        '3. Sélection d\'auberges avec cuisine partagée',
        '4. Liste des attractions naturelles gratuites (Sources chaudes libres, cascades)'
      ],
      zh: [
        '1. 制定每日预算阶梯（30 - 70 美元/天）',
        '2. 规划圣何塞各大客运枢纽的公共长途巴士路线（Coca-Cola、7-10 Terminal、Caribe 站）',
        '3. 筛选配备公用厨房的高评分青旅以节省餐食开销',
        '4. 整理免费或低门票自然景观清单（阿雷纳尔免费野溪温泉 El Chollín、蒙特苏马多层瀑布）'
      ],
      ja: [
        '1. 1日あたりの目標予算の設定（1日30〜70米ドル目安）',
        '2. サンホセ主要バスターミナルからの定期路線バスルート作成',
        '3. 自炊キッチン付きの高評価格安ホステルの選定',
        '4. 無料・格安の自然スポット（アレナルの無料天然温泉川、モンテスマの滝）のリストアップ'
      ]
    },
    suggestedQuestions: {
      es: [
        '¿Cómo ir de San José a La Fortuna en autobús público y cuánto cuesta el boleto?',
        '¿Dónde está el río de aguas termales GRATIS (El Chollín) en La Fortuna frente a Tabacón?',
        '¿Cuánto se gasta por día en Costa Rica viajando en plan mochilero económico?',
        '¿Qué terminal de buses en San José viaja hacia Manuel Antonio, Monteverde y Puerto Viejo?'
      ],
      en: [
        'How to get from San José to La Fortuna by public bus and how much is the ticket?',
        'Where is the FREE hot spring river (El Chollin) in La Fortuna near Tabacon?',
        'What is a realistic daily backpacker budget for Costa Rica?',
        'Which bus terminals in San Jose serve Manuel Antonio, Monteverde, and Puerto Viejo?'
      ],
      de: [
        'Wie fährt man mit dem öffentlichen Bus von San José nach La Fortuna und was kostet es?',
        'Wo liegt der KOSTENLOSE heiße Thermalfluss (El Chollín) bei Arenal?',
        'Wie hoch ist ein realistisches Tagesbudget für Backpacker in Costa Rica?',
        'Welche Busterminals in San José fahren nach Manuel Antonio und Puerto Viejo?'
      ],
      fr: [
        'Comment aller de San José à La Fortuna en bus public et quel est le tarif ?',
        'Où se trouve la rivière thermale GRATUITE (El Chollín) près d\'Arenal ?',
        'Quel budget journalier prévoir pour voyager en mode routard au Costa Rica ?',
        'Quels sont les terminaux de bus à San José pour Manuel Antonio et Puerto Viejo ?'
      ],
      zh: [
        '如何乘坐公共长途巴士从圣何塞到拉福图纳（阿雷纳尔）？票价大约多少？',
        '拉福图纳 Tabacón 对面的免费野溪地热温泉（El Chollín）具体在哪里？',
        '在哥斯达黎加背包自由行，真实的每日低成本预算是多少？',
        '圣何塞开往曼努埃尔安东尼奥、蒙特维多和加勒比港的巴士分别在哪个汽车站乘坐？'
      ],
      ja: [
        'サンホセからラ・フォルトゥナまでローカルバスで行く方法と運賃は？',
        'タバコンの近くにある無料の天然温泉川（エル・チョジン）の場所は？',
        'コスタリカをバックパッカー旅行する場合の1日の平均予算は？',
        'マヌエル・アントニオやプエルト・ビエホ行きのバスターミナルはどこですか？'
      ]
    },
    specialtyTags: {
      es: ['Buses Públicos', 'Hostels Low-Cost', 'Termales Gratis', 'Ahorro Máximo'],
      en: ['Public Buses', 'Budget Hostels', 'Free Hot Springs', 'Max Savings'],
      de: ['Öffentliche Busse', 'Günstige Hostels', 'Gratis-Thermalquellen', 'Spartipps'],
      fr: ['Bus publics', 'Auberges pas chères', 'Thermes gratuits', 'Économies'],
      zh: ['公共大巴', '高性价比青旅', '免费天然温泉', '极致省钱攻略'],
      ja: ['長距離路線バス', '格安ホステル', '無料天然温泉', 'スマート節約術']
    }
  },
  {
    id: 'family_accessible',
    workflowCategory: 'specialized',
    name: {
      es: 'Mariana • Familias & Accesibilidad Universal',
      en: 'Mariana • Family Travel & Universal Access',
      de: 'Mariana • Familien & Barrierefreies Reisen',
      fr: 'Mariana • Familles & Accessibilité Universelle',
      zh: 'Mariana • 亲子家庭与无障碍通用出行专家',
      ja: 'マリアナ • ファミリー旅行＆ユニバーサルアクセシビリティ'
    },
    role: {
      es: 'Tours con Niños, Adultos Mayores & Senderos Accesibles Ley 7600',
      en: 'Tours for Kids, Seniors & Ley 7600 Accessible Trails',
      de: 'Touren für Kinder, Senioren & barrierefreie Wege (Ley 7600)',
      fr: 'Voyages en famille, Séniors & Sentiers accessibles',
      zh: '亲子适宜路线、银发长者呵护与无障碍轮椅通道（7600法案）',
      ja: 'お子様連れ・シニア層・車椅子対応ユニバーサルトレイル（7600号法）'
    },
    badge: {
      es: 'Familias & Inclusión',
      en: 'Family & Accessible',
      de: 'Familie & Barrierefrei',
      fr: 'Famille & Accessibilité',
      zh: '家庭亲子与无障碍',
      ja: 'ファミリー＆バリアフリー'
    },
    avatarEmoji: '👨‍👩‍👧‍👦',
    themeColor: '#059669',
    bgGradient: 'from-[#064E3B] to-[#059669]',
    borderColor: '#34D399',
    description: {
      es: 'Planificación cuidadosa para viajes con niños pequeños, adultos mayores o personas con movilidad reducida: senderos 100% accesibles en Poás y Manuel Antonio, aguas termales suaves y botiquín familiar.',
      en: 'Specialized planning for trips with toddlers, grandparents, or travelers with reduced mobility: 100% paved accessible trails in Poas & Manuel Antonio, gentle thermal pools, and family safety.',
      de: 'Spezialisiert auf Reisen mit kleinen Kindern, Großeltern oder Personen mit eingeschränkter Mobilität: Barrierefreie Wege und sanfte Touren.',
      fr: 'Planification dédiée aux familles avec jeunes enfants ou personnes à mobilité réduite : Sentiers aménagés et bains thermaux adaptés.',
      zh: '为携带幼儿、长辈或行动不便人士的家庭提供周密方案：波阿斯火山与曼努埃尔安东尼奥无障碍木栈道、温和亲水温泉及家庭应急医疗常备建议。',
      ja: '小さな子ども連れ、シニア世代、車椅子利用者が安心して楽しめるポアス火山やマヌエル・アントニオの舗装遊歩道、体に優しい温泉をご提案。'
    },
    welcomeMessage: {
      es: '¡Bienvenidos familias! 👨‍👩‍👧‍👦 Soy Mariana. En Costa Rica todos merecen disfrutar la naturaleza sin barreras ni prisas. Dime las edades de tu grupo o necesidades especiales para armar un viaje cómodo y seguro.',
      en: 'Welcome families! 👨‍👩‍👧‍👦 I am Mariana. In Costa Rica everyone deserves to experience wildlife safely and comfortably. Tell me the ages or mobility needs of your group!',
      de: 'Herzlich willkommen Familien! 👨‍👩‍👧‍👦 Ich bin Mariana. Lassen Sie uns eine entspannte und barrierefreie Reise für alle Altersstufen planen.',
      fr: 'Bienvenue aux familles ! 👨‍👩‍👧‍👦 Je suis Mariana. Tout le monde doit pouvoir profiter de la nature du Costa Rica en toute sécurité. Quelles sont les particularités de votre groupe ?',
      zh: '欢迎各位家庭旅行者！👨‍👩‍👧‍👦 我是亲子与无障碍旅行顾问 Mariana。在哥斯达黎加，每一位长辈和孩子都应当安全、舒适地亲近雨林与动物。请告诉我您家人的年龄与特殊需求！',
      ja: 'ご家族の皆様、ようこそ！👨‍👩‍👧‍👦 ファミリー・バリアフリー担当のマリアナです。年齢や歩行ペースに配慮した安心・安全なプランニングはお任せください。'
    },
    workflowSteps: {
      es: [
        '1. Censo de edades (bebés, niños, adultos mayores) y necesidades de accesibilidad',
        '2. Filtrado de parques con senderos pavimentados Ley 7600 (Volcán Poás, Manuel Antonio)',
        '3. Selección de hoteles y transportes con rampas, habitaciones en planta baja y aire acondicionado',
        '4. Diseño de ritmo descansado con paradas técnicas frecuentes y actividades familiares'
      ],
      en: [
        '1. Group age census (infants, kids, seniors) and accessibility checklist',
        '2. Filtering national parks with paved wheelchair accessible trails (Poas, Manuel Antonio)',
        '3. Booking step-free ground floor accommodations and spacious private vans',
        '4. Relaxed pacing design with frequent rest stops and child-friendly activities'
      ],
      de: [
        '1. Erfassung der Altersgruppen und Mobilitätsanforderungen',
        '2. Auswahl rollstuhlgerechter Nationalparks mit befestigten Wegen',
        '3. Buchung barrierefreier Zimmer im Erdgeschoss und bequemer Transfers',
        '4. Entspannte Reiseetappen mit ausreichend Pausen für Kinder und Senioren'
      ],
      fr: [
        '1. Recensement des âges et des besoins de mobilité',
        '2. Sélection des parcs avec sentiers goudronnés accessibles (Poás, Manuel Antonio)',
        '3. Réservation d\'hébergements de plain-pied et de véhicules spacieux',
        '4. Rythme doux avec pauses régulières et activités pour enfants'
      ],
      zh: [
        '1. 统计全团年龄段（婴儿、学龄儿童、银发长辈）及无障碍轮椅支持需求',
        '2. 优先筛选严格符合 7600 无障碍法案平整木栈道的国家公园（波阿斯火山、曼努埃尔安东尼奥）',
        '3. 锁定配备无障碍坡道、一层无门槛客房及宽敞空调专车的酒店与地接',
        '4. 打造张弛有度的舒缓节奏，设置充足的休息补给点与趣味亲子科普环节'
      ],
      ja: [
        '1. ご家族の年齢構成（乳幼児、小学生、シニア）と歩行サポートの確認',
        '2. バリアフリー舗装路完備の国立公園（ポアス火山、マヌエル・アントニオ）の選定',
        '3. 段差なしの1階客室や広々とした専用送迎車両の手配',
        '4. こまめな休憩とお子様向け体験を組み込んだゆったり日程の作成'
      ]
    },
    suggestedQuestions: {
      es: [
        '¿Qué parques nacionales tienen senderos 100% pavimentados aptos para sillas de ruedas o coches de bebé?',
        '¿Cuáles son los mejores tours en La Fortuna y Arenal para niños menores de 6 años?',
        '¿Cómo preparar el botiquín y repelente para mosquitos para viajar con niños a Costa Rica?',
        '¿Hay aguas termales en Arenal con piscinas de baja temperatura y toboganes infantiles?'
      ],
      en: [
        'Which national parks have 100% paved trails suitable for wheelchairs or baby strollers?',
        'What are the best tours in Arenal / La Fortuna for kids under 6 years old?',
        'What health, first-aid kit, and mosquito repellent tips do you recommend for children?',
        'Are there Arenal hot springs resorts with mild warm pools and kids splash zones?'
      ],
      de: [
        'Welche Nationalparks haben rollstuhl- und kinderwagengerechte befestigte Wege?',
        'Beste Touren in Arenal für Kinder unter 6 Jahren?',
        'Tipps zu Mückenschutz und Reiseapotheke für Familien in Costa Rica?',
        'Welche Thermalquellen in Arenal haben flache Kinderbecken und Rutschen?'
      ],
      fr: [
        'Quels parcs nationaux disposent de sentiers adaptés aux poussettes et fauteuils roulants ?',
        'Quelles sont les meilleures activités à Arenal pour les enfants de moins de 6 ans ?',
        'Quels conseils santé et anti-moustiques pour les jeunes enfants au Costa Rica ?',
        'Existe-t-il des thermes à Arenal avec des bassins tièdes et des jeux aquatiques ?'
      ],
      zh: [
        '哪些国家公园拥有100%全平整铺装、适合婴儿推车或轮椅通行的观景栈道？',
        '阿雷纳尔/拉福图纳有哪些适合6岁以下幼童参与的温和生态游项目？',
        '带孩子前往哥斯达黎加雨林，应如何准备家庭防蚊液与常备应急药箱？',
        '阿雷纳尔温泉度假村中，哪些拥有适合儿童的安全温水泳池与水上滑梯？'
      ],
      ja: [
        '車椅子やベビーカーで100%通行できる舗装遊歩道のある国立公園はどこですか？',
        'アレナル周辺で6歳未満の幼児連れにおすすめのツアーはありますか？',
        '子連れ旅行での虫除け対策や常備薬のアドバイスを教えてください',
        '子ども向けのスライダーやぬるめの温水プールがあるアレナルの温泉施設は？'
      ]
    },
    specialtyTags: {
      es: ['Senderos Ley 7600', 'Tours para Niños', 'Aguas Termales Suaves', 'Ritmo Relajado'],
      en: ['Accessible Trails', 'Kids Friendly Tours', 'Gentle Hot Springs', 'Relaxed Pacing'],
      de: ['Barrierefreie Wege', 'Kinderfreundliche Touren', 'Sanfte Thermen', 'Entspanntes Tempo'],
      fr: ['Sentiers accessibles', 'Tours enfants', 'Thermes adaptés', 'Rythme doux'],
      zh: ['无障碍栈道', '亲子友好游', '温和儿童温泉', '舒缓慢节奏'],
      ja: ['バリアフリー遊歩道', '子ども向けツアー', '安心のぬる湯温泉', 'ゆったり日程']
    }
  }
];

export const getAgentById = (id: AgentId | string): AIAgent => {
  // Aliases for backwards compatibility
  const aliasMap: Record<string, AgentId> = {
    'biologist': 'wildlife',
    'adventure': 'extreme',
    'chef': 'culinary'
  };

  const resolvedId = aliasMap[id] || (id as AgentId);
  const found = AI_AGENTS.find(a => a.id === resolvedId);
  return found || AI_AGENTS[0];
};

export const getAIAgentById = getAgentById;


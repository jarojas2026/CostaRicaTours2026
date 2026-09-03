import { Language, TourRegion, Tour } from '../types';

export interface RegionEcoFact {
  regionId: TourRegion;
  regionName: Record<Language, string>;
  title: Record<Language, string>;
  fact: Record<Language, string>;
  conservationHighlight: Record<Language, string>;
  species: string[];
  biodiversityStat: Record<Language, string>;
  icon: string;
}

export const ECO_FACTS_BY_REGION: Record<string, RegionEcoFact> = {
  arenal: {
    regionId: 'arenal',
    regionName: {
      es: 'La Fortuna / Volcán Arenal',
      en: 'La Fortuna / Arenal Volcano',
      de: 'La Fortuna / Arenal-Vulkan',
      fr: 'La Fortuna / Volcan Arenal',
      zh: '拉福图纳 / 阿雷纳尔火山',
      ja: 'ラ・フォルトゥナ / アレナル火山'
    },
    title: {
      es: 'Energía 100% Renovable & Bosque Húmedo',
      en: '100% Renewable Energy & Rainforest',
      de: '100% Erneuerbare Energie & Regenwald',
      fr: 'Énergie 100% Renouvelable & Forêt Tropicale',
      zh: '100%可再生能源与热带雨林',
      ja: '100%再生可能エネルギーと熱帯雨林'
    },
    fact: {
      es: 'La cuenca y geotermia del Volcán y Lago Arenal generan más del 30% de la matriz eléctrica de Costa Rica, que opera al 99% con fuentes 100% limpias (hidroeléctrica, eólica y geotérmica). Sus bosques protegidos albergan más de 500 especies de aves y el 50% de los anfibios de Costa Rica.',
      en: 'The geothermal and hydro basin of Arenal Volcano & Lake generates over 30% of Costa Rica\'s electricity grid, which runs on 99% renewable clean energy. The protected biological reserve shelters over 500 bird species and 50% of Costa Rica\'s native amphibians.',
      de: 'Das geothermische Becken um den Vulkan und See Arenal erzeugt über 30% des 99% erneuerbaren Stroms in Costa Rica und beheimatet über 500 Vogelarten.',
      fr: 'Le bassin géothermique et hydroélectrique de l\'Arenal produit plus de 30% de l\'électricité 100% propre du Costa Rica, abritant 500 espèces d\'oiseaux.',
      zh: '阿雷纳尔火山与湖泊的水电和地热为哥斯达黎加提供超30%的可再生清洁电力，森林中栖息着500多种鸟类。',
      ja: 'アレナル火山と湖の水力・地熱発電はコスタリカのクリーン電力の30%以上を担い、500種以上の野鳥の生息地です。'
    },
    conservationHighlight: {
      es: 'Corredor Biológico Arenal-Monteverde que une la vertiente Pacífica y Caribe.',
      en: 'Arenal-Monteverde Biological Corridor connecting Pacific and Caribbean slopes.',
      de: 'Biologischer Korridor zwischen Arenal und Monteverde.',
      fr: 'Corridor biologique reliant les versants Pacifique et Caraïbe.',
      zh: '连接太平洋与加勒比生态带的阿雷纳尔-蒙特贝尔德生物走廊。',
      ja: '太平洋側とカリブ海側を結ぶアレナル〜モンテベルデ生物回廊。'
    },
    species: ['Tucán Pico Iris', 'Rana de Ojos Rojos', 'Perezoso de Tres Dedos', 'Mono Aullador'],
    biodiversityStat: {
      es: '500+ especies de aves registradas',
      en: '500+ recorded bird species',
      de: '500+ Vogelarten erfasst',
      fr: '500+ espèces d\'oiseaux recensées',
      zh: '记录超过500种鸟类',
      ja: '500種以上の野鳥記録'
    },
    icon: '🌋'
  },
  monteverde: {
    regionId: 'monteverde',
    regionName: {
      es: 'Monteverde / Bosque Nuboso',
      en: 'Monteverde / Cloud Forest',
      de: 'Monteverde / Nebelwald',
      fr: 'Monteverde / Forêt de Nuages',
      zh: '蒙特贝尔德 / 云雾森林',
      ja: 'モンテベルデ / 熱帯雲霧林'
    },
    title: {
      es: '2.5% de la Biodiversidad del Planeta',
      en: '2.5% of the Planet\'s Biodiversity',
      de: '2,5% der weltweiten Artenvielfalt',
      fr: '2,5% de la Biodiversité Mondiale',
      zh: '占全球2.5%的物种多样性',
      ja: '地球上の生物多様性の2.5%が集結'
    },
    fact: {
      es: 'La Reserva Biológica del Bosque Nuboso de Monteverde protege el 2.5% de toda la biodiversidad del planeta en tan solo el 0.004% de la superficie de la Tierra. Alberga más de 500 especies de orquídeas (la mayor concentración del mundo), 400 especies de aves y es el santuario del Quetzal Resplandeciente.',
      en: 'The Monteverde Cloud Forest Reserve protects 2.5% of the world\'s entire biodiversity within just 0.004% of Earth\'s surface. It houses over 500 orchid species (the world\'s highest concentration), 400 bird species, and is prime habitat for the sacred Resplendent Quetzal.',
      de: 'Der Nebelwald von Monteverde schützt 2,5% der weltweiten Artenvielfalt auf nur 0,004% der Erdoberfläche und beheimatet über 500 Orchideenarten.',
      fr: 'La Réserve de Monteverde abrite 2,5% de la biodiversité mondiale sur 0,004% de la Terre et compte plus de 500 espèces d\'orchidées.',
      zh: '蒙特贝尔德云雾森林在仅占地球0.004%的面积内保护着全球2.5%的生物多样性，拥有世界最高密度的兰花品种（500+种）。',
      ja: 'モンテベルデ雲霧林は地球表面のわずか0.004%で全世界の生物種の2.5%を保護し、500種以上の蘭が生息します。'
    },
    conservationHighlight: {
      es: 'Pioneros mundiales en conservación comunitaria e investigación botánica.',
      en: 'Global pioneer in community conservation and cloud-mist botanical research.',
      de: 'Weltweiter Pionier im kommunalen Naturschutz.',
      fr: 'Pionnier mondial de la conservation communautaire.',
      zh: '社区生态保护与云雾森林科学研究的世界先驱。',
      ja: '地域主導の自然保護と植物研究の世界的パイオニア。'
    },
    species: ['Quetzal Resplandeciente', 'Pájaro Campana', 'Olinguito', 'Orquídeas Miniatura'],
    biodiversityStat: {
      es: '500+ especies de orquídeas nativas',
      en: '500+ native orchid species',
      de: '500+ einheimische Orchideenarten',
      fr: '500+ espèces d\'orchidées indigènes',
      zh: '500多类原生兰花',
      ja: '500種以上の固有野生ラン'
    },
    icon: '🌿'
  },
  manuel_antonio: {
    regionId: 'manuel_antonio',
    regionName: {
      es: 'Manuel Antonio / Quepos',
      en: 'Manuel Antonio / Quepos',
      de: 'Manuel Antonio / Quepos',
      fr: 'Manuel Antonio / Quepos',
      zh: '曼努埃尔·安东尼奥 / 克波斯',
      ja: 'マヌエル・アントニオ / ケポス'
    },
    title: {
      es: 'Santuario Marino-Terrestre & Mono Tití',
      en: 'Marine-Terrestrial Sanctuary & Squirrel Monkey',
      de: 'Meeres- & Landschutzgebiet',
      fr: 'Sanctuaire Marin-Terrestre & Singe Écureuil',
      zh: '海陆国家公园与松鼠猴庇护所',
      ja: '海洋・森林複合国立公園とリスザル保護区'
    },
    fact: {
      es: 'Manuel Antonio es un modelo de coexistencia entre selva tropical y playas vírgenes. Protege a 109 especies de mamíferos y 184 de aves, siendo el principal refugio del mono ardilla o tití (Saimiri oerstedii), una especie amenazada que se recupera gracias a corredores biológicos de copas de árboles.',
      en: 'Manuel Antonio is a world-class model of rainforest meeting pristine beaches. It protects 109 mammal species and 184 bird species, serving as the prime sanctuary for the endangered Central American Squirrel Monkey (mono tití) protected by aerial canopy bridges.',
      de: 'Manuel Antonio schützt 109 Säugetier- und 184 Vogelarten und ist das Hauptrefugium des bedrohten Totenkopfäffchens.',
      fr: 'Manuel Antonio protège 109 espèces de mammifères et 184 d\'oiseaux, refuge clé du singe écureuil menacé.',
      zh: '曼努埃尔·安东尼奥保护着109种哺乳动物和184种鸟类，是濒危红背松鼠猴的关键栖息地。',
      ja: 'マヌエル・アントニオは109種の哺乳類と184種の鳥類を保護し、絶滅危惧種のリスザルの楽園です。'
    },
    conservationHighlight: {
      es: 'Corredores aéreos de dosel para prevenir atropellos de fauna en la costa.',
      en: 'Canopy canopy bridges installed to ensure safe wildlife crossing above coastal roads.',
      de: 'Baumkronenbrücken zum Schutz der Tierwelt.',
      fr: 'Ponts suspendus dans la canopée pour la faune.',
      zh: '建立树冠高空通道以保护野生动物安全通行。',
      ja: '野生動物の道路横断事故を防ぐ樹冠ブリッジを設置。'
    },
    species: ['Mono Tití (Ardilla)', 'Perezoso de Dos y Tres Dedos', 'Pizote', 'Iguana Negra'],
    biodiversityStat: {
      es: '109 especies de mamíferos marinos y terrestres',
      en: '109 terrestrial & marine mammal species',
      de: '109 Säugetierarten',
      fr: '109 espèces de mammifères',
      zh: '109种陆地与海洋哺乳动物',
      ja: '109種の哺乳類'
    },
    icon: '🐒'
  },
  pacuare: {
    regionId: 'pacuare',
    regionName: {
      es: 'Río Pacuare / Turrialba',
      en: 'Pacuare River / Turrialba',
      de: 'Pacuare-Fluss / Turrialba',
      fr: 'Rivière Pacuare / Turrialba',
      zh: '帕库阿雷河 / 图里亚尔瓦',
      ja: 'パクアレ川 / トゥリアルバ'
    },
    title: {
      es: 'Corredor de Agua Pura & Jaguar',
      en: 'Pristine Water Corridor & Jaguar Habitat',
      de: 'Wildfluss-Korridor & Jaguar-Refugium',
      fr: 'Corridor Fluvial Pur & Habitat du Jaguar',
      zh: '原始水系走廊与美洲豹栖息地',
      ja: '原生自然の水流回廊とジャガー生息地'
    },
    fact: {
      es: 'El Río Pacuare, clasificado entre los 5 mejores ríos de rafting del planeta por National Geographic, atraviesa cañones vírgenes que forman parte del Corredor Biológico La Amistad. Sus aguas cristalinas de montaña no tienen represas y sus orillas albergan jaguares, ocelotes y tapires.',
      en: 'Ranked among the top 5 whitewater rafting rivers on Earth by National Geographic, the Pacuare River traverses pristine jungle gorges within the La Amistad Biosphere Reserve. Free of dams, its pure mountain headwaters protect jaguars, ocelots, and Baird\'s tapirs.',
      de: 'Vom National Geographic zu den Top 5 Wildwasserflüssen der Welt gekürt, schützt die Pacuare-Schlucht Jaguare, Ozelots und Tapire.',
      fr: 'Classée parmi les 5 plus belles rivières de rafting au monde par National Geographic, elle abrite jaguars, ocelots et tapirs.',
      zh: '被《国家地理》评为全球五大漂流胜地之一，未建大坝的原始水系庇护着美洲豹、虎猫和中美貘。',
      ja: 'ナショナルジオグラフィックが選ぶ世界トップ5のラフティング河川。ダムのない清流がジャガーやバクを守ります。'
    },
    conservationHighlight: {
      es: 'Protección activa de cuencas fluviales libres de represas hidroeléctricas.',
      en: 'Active protection of free-flowing, dam-free biological river canyons.',
      de: 'Strikter Schutz staufreier Wildfluss-Canyons.',
      fr: 'Protection rigoureuse des cours d\'eau sauvages non endigués.',
      zh: '严格保护无大坝阻隔的原生态天然河流峡谷。',
      ja: 'ダム建設を排した自然水系峡谷の完全保護。'
    },
    species: ['Jaguar', 'Danta (Tapir)', 'Nutria Neotropical', 'Oropéndola Montezuma'],
    biodiversityStat: {
      es: 'Río 100% de caudal libre y aguas puras de montaña',
      en: '100% free-flowing river with pristine mountain waters',
      de: '100% frei fließender Gebirgsfluss',
      fr: 'Rivière 100% sauvage à débit libre',
      zh: '100%原生态自由流淌的高山清泉',
      ja: '100%自然のまま流れる高山清流'
    },
    icon: '🌊'
  },
  tortuguero: {
    regionId: 'tortuguero',
    regionName: {
      es: 'Tortuguero / Caribe Norte',
      en: 'Tortuguero / North Caribbean',
      de: 'Tortuguero / Nordkaribik',
      fr: 'Tortuguero / Caraïbes Nord',
      zh: '托尔图格罗 / 北加勒比',
      ja: 'トルトゥゲーロ / 北カリブ'
    },
    title: {
      es: 'Capital Mundial de la Tortuga Verde',
      en: 'World Capital of the Green Sea Turtle',
      de: 'Welthauptstadt der Grünen Meeresschildkröte',
      fr: 'Capitale Mondiale de la Tortue Verte',
      zh: '绿海龟的世界级繁衍圣地',
      ja: 'アオウミガメの世界的重要産卵地'
    },
    fact: {
      es: 'El Parque Nacional Tortuguero es el mayor sitio de anidación de la tortuga verde (Chelonia mydas) en el hemisferio occidental. No existen carreteras ni automóviles en todo el parque; el transporte es 100% en botes y canoas eléctricas por canales naturales, erradicando el ruido y la contaminación.',
      en: 'Tortuguero National Park is the primary nesting site for the endangered Green Sea Turtle in the entire Western Hemisphere. With zero roads or cars in the park, all transport is 100% boat-based through tranquil freshwater canals, preventing habitat fragmentation.',
      de: 'Tortuguero ist der größte Nistplatz der Grünen Meeresschildkröte in der westlichen Hemisphäre. Straßenfrei mit 100% Bootstransport.',
      fr: 'Tortuguero est le premier site de nidification de la tortue verte dans l\'hémisphère occidental, sans routes ni voitures.',
      zh: '托尔图格罗是西半球最大的绿海龟筑巢繁育地。园内无公路，全部通过运河水路出行，有效消除交通污染。',
      ja: '西半球最大のアオウミガメ産卵地。車道が一切なく、水路ボート移動のみで自然環境が守られています。'
    },
    conservationHighlight: {
      es: 'Vigilancia nocturna comunitaria de playas de desove y protección de nidos.',
      en: 'Community-led nocturnal turtle beach patrol and scientific egg protection.',
      de: 'Gemeindebasierter Nachtschutz der Niststrände.',
      fr: 'Patrouilles nocturnes communautaires pour la ponte des tortues.',
      zh: '社区主导的夜间海龟巡护与科学孵化保护。',
      ja: '地域住民と科学者による夜間ウミガメ産卵パトロール。'
    },
    species: ['Tortuga Verde Marina', 'Manatí del Caribe', 'Caimán de Anteojos', 'Basilisco Verde'],
    biodiversityStat: {
      es: 'Más de 40.000 nidos protegidos por temporada',
      en: 'Over 40,000 nests protected per season',
      de: 'Über 40.000 geschützte Nester pro Saison',
      fr: 'Plus de 40 000 nids protégés par saison',
      zh: '每季保护超过4万个海龟巢穴',
      ja: 'シーズンあたり4万以上の産卵巣を保護'
    },
    icon: '🐢'
  },
  guanacaste: {
    regionId: 'guanacaste',
    regionName: {
      es: 'Guanacaste / Tamarindo / Papagayo',
      en: 'Guanacaste / Tamarindo / Papagayo',
      de: 'Guanacaste / Tamarindo / Papagayo',
      fr: 'Guanacaste / Tamarindo / Papagayo',
      zh: '瓜纳卡斯特 / 塔马林多 / 帕帕加约',
      ja: 'グアナカステ / タマリンロ / パパガヨ'
    },
    title: {
      es: 'Patrimonio Mundial de Bosque Seco Tropical',
      en: 'UNESCO Tropical Dry Forest World Heritage',
      de: 'UNESCO-Weltnaturerbe Tropischer Trockenwald',
      fr: 'Patrimoine Mondial de la Forêt Tropicale Sèche',
      zh: '联合国教科文组织热带干旱森林世界遗产',
      ja: 'ユネスコ世界遺産：熱帯乾燥林'
    },
    fact: {
      es: 'El Área de Conservación Guanacaste es Patrimonio de la Humanidad por la UNESCO y contiene el único bosque tropical seco continuo e intacto de Mesoamérica. Sus aguas marinas son hábitat de mantarrayas gigantes, tortugas lora y ballenas jorobadas migratorias.',
      en: 'The Guanacaste Conservation Area is a UNESCO World Heritage Site protecting the only continuous, intact tropical dry forest ecosystem from Mexico to Panama. Its coastal waters shelter giant manta rays, olive ridley turtles, and migrating humpback whales.',
      de: 'UNESCO-Weltnaturerbe zum Schutz des einzigen intakten tropischen Trockenwaldes Mittelamerikas mit reichem Meeresleben.',
      fr: 'Site UNESCO protégeant l\'unique forêt tropicale sèche intacte de Mésoamérique et des sanctuaires marins côtiers.',
      zh: '联合国教科文组织世界自然遗产，保护中美洲唯一连片完整的热带干旱森林与近海巨型蝠鲼及座头鲸。',
      ja: '中米唯一の連続した熱帯乾燥林を保護するユネスコ世界自然遺産。巨大マンタやザトウクジラが訪れます。'
    },
    conservationHighlight: {
      es: 'Mayor proyecto de restauración y regeneración de bosque seco del planeta.',
      en: 'The world\'s largest active tropical dry forest restoration and regeneration project.',
      de: 'Weltweit größtes Regenerationsprojekt für Trockenwälder.',
      fr: 'Le plus vaste projet mondial de régénération de forêt sèche.',
      zh: '全球规模最大的热带干旱林生态恢复工程。',
      ja: '世界最大規模の熱帯乾燥林再生・保護プロジェクト。'
    },
    species: ['Manta Gigante del Pacífico', 'Tortuga Lora', 'Venado Cola Blanca', 'Urraca Copetona'],
    biodiversityStat: {
      es: '335.000 especies estimadas (60% de la biodiversidad de CR)',
      en: '335,000 estimated species (60% of Costa Rica\'s total fauna)',
      de: '335.000 geschätzte Arten',
      fr: '335 000 espèces estimées',
      zh: '预估保护33.5万物种（占哥斯达黎加60%）',
      ja: '推定33万5千種（コスタリカ全種の約60%）'
    },
    icon: '☀️'
  },
  osa: {
    regionId: 'osa',
    regionName: {
      es: 'Península de Osa / Parque Corcovado',
      en: 'Osa Peninsula / Corcovado National Park',
      de: 'Osa-Halbinsel / Corcovado-Nationalpark',
      fr: 'Péninsule d\'Osa / Parc National Corcovado',
      zh: '奥萨半岛 / 科尔科瓦多国家公园',
      ja: 'オサ半島 / コルコバード国立公園'
    },
    title: {
      es: 'El Lugar Más Biológicamente Intenso del Mundo',
      en: 'The Most Biologically Intense Place on Earth',
      de: 'Der biologisch intensivste Ort der Erde',
      fr: 'L\'Endroit le Plus Biologiquement Intense de la Terre',
      zh: '地球上生物密度最高的热带殿堂',
      ja: '地球上で最も生物密度が高い場所'
    },
    fact: {
      es: 'Descrito por National Geographic como "el lugar con mayor intensidad biológica sobre la faz de la Tierra", Corcovado reúne el 2.5% de todas las formas de vida del planeta en apenas el 0.001% de la superficie terrestre. Aquí conviven las 4 especies de monos de Costa Rica, jaguares y tapires.',
      en: 'Described by National Geographic as "the most biologically intense place on the face of the Earth," Corcovado concentrates 2.5% of all planetary life forms in just 0.001% of Earth\'s surface, harboring all 4 Costa Rican monkey species, jaguars, and Baird\'s tapirs.',
      de: 'Von National Geographic als „biologisch intensivster Ort der Erde“ bezeichnet, beheimatet Corcovado 2,5% aller Lebensformen der Erde.',
      fr: 'Qualifié par National Geographic de lieu le plus intense biologiquement sur Terre, Corcovado abrite 2,5% de toute la vie terrestre.',
      zh: '被《国家地理》誉为“地球上生物密度最稠密的地方”，在0.001%的土地汇集了全球2.5%的生命形态，包括哥斯达黎加全部4种猴类。',
      ja: 'ナショナルジオグラフィックが「地球上で最も生物学的に濃密な場所」と称賛。世界全生物種の2.5%が生息します。'
    },
    conservationHighlight: {
      es: 'Entrada estrictamente regulada con guías naturalistas expertos y senderos de mínimo impacto.',
      en: 'Strict carrying-capacity limits and 100% certified local naturalist guide requirements.',
      de: 'Strenge Besucherquoten und zertifizierte Naturführer.',
      fr: 'Quotas stricts et accompagnement obligatoire par des guides naturalistes.',
      zh: '严格的人流承载限制与100%国家持证自然向导陪同制。',
      ja: '入園人数制限と国家公認ナチュラリストガイド同行の義務化。'
    },
    species: ['Jaguar', 'Danta Centroamericana', 'Mono Araña', 'Lapa Roja (Guacamayo)'],
    biodiversityStat: {
      es: 'Concentra el 2.5% de la biodiversidad mundial',
      en: 'Concentrates 2.5% of world biodiversity',
      de: '2,5% der weltweiten Biodiversität',
      fr: '2,5% de la biodiversité mondiale',
      zh: '凝聚全球2.5%的生物物种',
      ja: '全世界の生物多様性の2.5%を凝縮'
    },
    icon: '🐆'
  },
  caribe: {
    regionId: 'caribe',
    regionName: {
      es: 'Caribe Sur / Cahuita / Puerto Viejo',
      en: 'South Caribbean / Cahuita / Puerto Viejo',
      de: 'Südkaribik / Cahuita / Puerto Viejo',
      fr: 'Caraïbes Sud / Cahuita / Puerto Viejo',
      zh: '南加勒比 / 卡维塔 / 老港',
      ja: '南カリブ / カウィータ / プエルト・ビエホ'
    },
    title: {
      es: 'Arrecifes de Coral Vivos & Cultura Afro-Indígena',
      en: 'Living Coral Reefs & Afro-Indigenous Heritage',
      de: 'Lebendige Korallenriffe & Biodiversität',
      fr: 'Récifs Coralliens Vivants & Forêt Côtière',
      zh: '活体珊瑚礁与热带海岸雨林',
      ja: '生きたサンゴ礁と沿岸熱帯雨林'
    },
    fact: {
      es: 'El Parque Nacional Cahuita protege el arrecife de coral vivo más importante del Caribe costarricense (600 hectáreas con 35 especies de coral y 123 de peces tropicales). Es el único parque co-administrado entre la comunidad local y el SINAC, reinvirtiendo el 100% de aportes en conservación.',
      en: 'Cahuita National Park protects Costa Rica\'s premier living Caribbean coral reef (600 hectares with 35 coral species and 123 tropical fish species). It is the country\'s only national park co-managed directly with the local community, recycling 100% of contributions into reef protection.',
      de: 'Cahuita schützt das wichtigste Korallenriff der costa-ricanischen Karibik und wird vorbildlich mit der lokalen Gemeinschaft verwaltet.',
      fr: 'Cahuita protège le plus grand récif corallien vivant du Costa Rica, cogéré directement avec la communauté locale.',
      zh: '卡维塔国家公园保护着哥斯达黎加加勒比海域最重要的活体珊瑚礁（35种珊瑚、123种热带鱼），由当地社区与国家公园管理局共同管理。',
      ja: 'コスタリカ最大の生きたサンゴ礁（35種のサンゴ、123種の熱帯魚）を守る、地域共生型国立公園です。'
    },
    conservationHighlight: {
      es: 'Co-gestión comunitaria galardonada y proyectos de siembra de coral vivo.',
      en: 'Award-winning community co-management and active coral restoration nurseries.',
      de: 'Gemeindebasierte Korallengärtnerei und Riffschutz.',
      fr: 'Pépinières de restauration corallienne citoyennes.',
      zh: '社区主导的珊瑚苗圃培育与繁育修复工程。',
      ja: '地域住民によるサンゴ養殖・再生プロジェクト。'
    },
    species: ['Perezoso de Dos Dedos', 'Tucán Pico Castaño', 'Pez Loro Arcoíris', 'Coral Cerebro'],
    biodiversityStat: {
      es: '35 especies de coral y 123 de peces de arrecife',
      en: '35 coral species & 123 reef fish species',
      de: '35 Korallen- und 123 Riffischarten',
      fr: '35 espèces de coraux et 123 de poissons',
      zh: '35类造礁珊瑚与123种热带鱼',
      ja: '35種の造礁サンゴと123種の熱帯魚'
    },
    icon: '🪸'
  },
  sjo: {
    regionId: 'sjo',
    regionName: {
      es: 'San José / Valle Central & Volcanes',
      en: 'San José / Central Valley & Volcanoes',
      de: 'San José / Zentraltal & Vulkane',
      fr: 'San José / Vallée Centrale & Volcans',
      zh: '圣何塞 / 中央山谷与火山群',
      ja: 'サンホセ / 中央盆地と火山群'
    },
    title: {
      es: 'Café de Sombra Carbono-Neutral & Volcanes',
      en: 'Carbon-Neutral Shade Coffee & Volcano Peaks',
      de: 'CO2-neutraler Schattenkaffee & Vulkane',
      fr: 'Café d\'Ombre Carbone-Neutre & Volcans',
      zh: '碳中和林下咖啡与活火山群',
      ja: 'カーボンニュートラル木陰栽培コーヒーと活火山'
    },
    fact: {
      es: 'El Valle Central está flanqueado por los volcanes Poás e Irazú y el Parque Braulio Carrillo, fuente del 50% del agua potable de la capital. Sus cafetales de altura se cultivan bajo sombra de árboles nativos, fijando toneladas de CO2 y protegiendo aves migratorias intercontinentales.',
      en: 'The Central Valley is flanked by Poás and Irazú volcanoes and Braulio Carrillo National Park, providing 50% of the capital\'s fresh drinking water. High-altitude coffee farms are shade-grown beneath native trees, capturing carbon and shielding intercontinental migratory birds.',
      de: 'Das Zentraltal wird von Vulkanen Poás und Irazú umrahmt und liefert 50% des Trinkwassers durch geschützte Nebelwälder.',
      fr: 'Entourée par les volcans Poás et Irazú, la vallée produit du café d\'altitude sous ombrage protecteur pour les oiseaux.',
      zh: '中央山谷被波阿斯火山与伊拉苏火山环抱，高山咖啡在遮阴树冠下种植，捕获碳排放并保护候鸟迁徙通道。',
      ja: 'ポアス火山やイラス火山に抱かれた中央盆地。原生樹の木陰で栽培されるコーヒー農園が渡り鳥の宿り木となります。'
    },
    conservationHighlight: {
      es: 'Pago por Servicios Ambientales (PSA) a fincas de café que conservan bosques de cuenca.',
      en: 'Pioneering Payment for Environmental Services (PES) rewarding sustainable coffee agroforestry.',
      de: 'Pionierprogramm für Ökosystem-Dienstleistungen (PES).',
      fr: 'Paiement pour Services Environnementaux aux caféiculteurs.',
      zh: '向保护水源森林的生态咖啡庄园提供生态补偿资金（PES机制）。',
      ja: '水源林を保全する農園に環境サービス支払い（PES）を還元する先進モデル。'
    },
    species: ['Ciprés de Montaña', 'Jilguero', 'Pájaro Bobo', 'Mariposa Morfo Azul'],
    biodiversityStat: {
      es: '100% de café cultivado bajo estándares de sostenibilidad',
      en: '100% Arabica shade-grown sustainable coffee',
      de: '100% nachhaltiger Schattenkaffee',
      fr: '100% de café cultivé sous ombrage durable',
      zh: '100%高标准可持续林下种植阿拉比卡咖啡',
      ja: '100%持続可能な森林調和型アラビカ種栽培'
    },
    icon: '☕'
  }
};

// Aliases
ECO_FACTS_BY_REGION['san_jose'] = ECO_FACTS_BY_REGION['sjo'];

export function getEcoFactForRegion(regionId: string, language: Language = 'es'): RegionEcoFact {
  const norm = regionId.toLowerCase().trim();
  if (ECO_FACTS_BY_REGION[norm]) {
    return ECO_FACTS_BY_REGION[norm];
  }
  if (norm.includes('arenal') || norm.includes('fortuna')) return ECO_FACTS_BY_REGION['arenal'];
  if (norm.includes('monteverde')) return ECO_FACTS_BY_REGION['monteverde'];
  if (norm.includes('manuel') || norm.includes('quepos')) return ECO_FACTS_BY_REGION['manuel_antonio'];
  if (norm.includes('pacuare') || norm.includes('turrialba') || norm.includes('rafting')) return ECO_FACTS_BY_REGION['pacuare'];
  if (norm.includes('tortuguero')) return ECO_FACTS_BY_REGION['tortuguero'];
  if (norm.includes('guanacaste') || norm.includes('tamarindo') || norm.includes('papagayo') || norm.includes('coco')) return ECO_FACTS_BY_REGION['guanacaste'];
  if (norm.includes('osa') || norm.includes('corcovado') || norm.includes('drake') || norm.includes('puerto jimenez')) return ECO_FACTS_BY_REGION['osa'];
  if (norm.includes('caribe') || norm.includes('cahuita') || norm.includes('puerto viejo') || norm.includes('limon')) return ECO_FACTS_BY_REGION['caribe'];
  if (norm.includes('san_jose') || norm.includes('sjo') || norm.includes('poas') || norm.includes('irazu') || norm.includes('central')) return ECO_FACTS_BY_REGION['sjo'];

  return ECO_FACTS_BY_REGION['arenal'];
}

export function getEcoFactForTour(tour: Tour, language: Language = 'es') {
  const eco = getEcoFactForRegion(tour.region || 'arenal', language);
  const lang = language as Language;

  return {
    regionId: eco.regionId,
    regionName: eco.regionName[lang] || eco.regionName['es'],
    title: eco.title[lang] || eco.title['es'],
    text: eco.fact[lang] || eco.fact['es'],
    highlight: eco.conservationHighlight[lang] || eco.conservationHighlight['es'],
    species: eco.species,
    stat: eco.biodiversityStat[lang] || eco.biodiversityStat['es'],
    icon: eco.icon
  };
}

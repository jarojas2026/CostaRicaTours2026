const fs = require('fs');
let content = fs.readFileSync('src/utils/i18n.ts', 'utf8');

const additions = `
  licenseText: { es: 'Pura Vida Tours Costa Rica • Licencia ICT #1042', en: 'Pura Vida Tours Costa Rica • ICT License #1042', de: 'Pura Vida Tours Costa Rica • ICT Lizenz #1042', fr: 'Pura Vida Tours Costa Rica • Licence ICT #1042', zh: '哥斯达黎加纯享旅游 • ICT 许可证 #1042', ja: 'プラビダ・ツアーズ・コスタリカ • ICTライセンス #1042' },
  discover: { es: 'DESCUBRE', en: 'DISCOVER', de: 'ENTDECKE', fr: 'DÉCOUVREZ', zh: '发现', ja: '発見する' },
  happyTravelers: { es: 'Viajeros felices desde 2018', en: 'Happy travelers since 2018', de: 'Glückliche Reisende seit 2018', fr: 'Voyageurs heureux depuis 2018', zh: '2018年以来的快乐旅行者', ja: '2018年からの幸せな旅行者' },
  verifiedReviews: { es: '1,200+ Reseñas Verificadas', en: '1,200+ Verified Reviews', de: '1.200+ verifizierte Bewertungen', fr: '1 200+ Avis vérifiés', zh: '1,200+ 条真实评价', ja: '1,200件以上の確認済みレビュー' },
  localGuides: { es: 'Guías ICT Locales', en: 'Local ICT Guides', de: 'Lokale ICT-Führer', fr: 'Guides ICT Locaux', zh: '当地 ICT 导游', ja: '地元ICTガイド' },
  allRegions: { es: '🌴 Todas las Regiones', en: '🌴 All Regions', de: '🌴 Alle Regionen', fr: '🌴 Toutes les régions', zh: '🌴 所有区域', ja: '🌴 すべての地域' },
  allCategories: { es: '🎯 Todas las Categorías', en: '🎯 All Categories', de: '🎯 Alle Kategorien', fr: '🎯 Toutes les catégories', zh: '🎯 所有类别', ja: '🎯 すべてのカテゴリー' },
  exploreCatalog: { es: 'Ver Catálogo', en: 'Explore Catalog', de: 'Katalog ansehen', fr: 'Explorer le catalogue', zh: '浏览目录', ja: 'カタログを見る' },
  aiPlannerBtn: { es: 'IA Planner', en: 'AI Planner', de: 'KI-Planer', fr: 'Planificateur IA', zh: 'AI 规划师', ja: 'AI プランナー' },
`;

content = content.replace('};', additions + '\n};');
fs.writeFileSync('src/utils/i18n.ts', content);

let hero = fs.readFileSync('src/components/HeroSection.tsx', 'utf8');
hero = hero.replace(/language === 'es' \? 'Pura Vida Tours Costa Rica • Licencia ICT #1042' : 'Pura Vida Tours Costa Rica • ICT License #1042'/g, "t('licenseText')");
hero = hero.replace(/language === 'es' \? 'DESCUBRE' : 'DISCOVER'/g, "t('discover')");
hero = hero.replace(/language === 'es' \? 'Viajeros felices desde 2018' : 'Happy travelers since 2018'/g, "t('happyTravelers')");
hero = hero.replace(/language === 'es' \? '1,200\+ Reseñas Verificadas' : '1,200\+ Verified Reviews'/g, "t('verifiedReviews')");
hero = hero.replace(/language === 'es' \? 'Guías ICT Locales' : 'Local ICT Guides'/g, "t('localGuides')");
hero = hero.replace(/language === 'es' \? '🌴 Todas las Regiones' : '🌴 All Regions'/g, "t('allRegions')");
hero = hero.replace(/language === 'es' \? '🎯 Todas las Categorías' : '🎯 All Categories'/g, "t('allCategories')");
hero = hero.replace(/language === 'es' \? 'Ver Catálogo' : 'Explore Catalog'/g, "t('exploreCatalog')");
hero = hero.replace(/language === 'es' \? 'IA Planner' : 'AI Planner'/g, "t('aiPlannerBtn')");

// Also ensure t is available
if (!hero.includes('const t = (key: string)')) {
  hero = hero.replace(
    /(const \[.*\] = useState.*)/,
    "const t = (key: string) => UI_TRANSLATIONS[key]?.[language] || UI_TRANSLATIONS[key]?.['es'] || key;\n  $1"
  );
}

fs.writeFileSync('src/components/HeroSection.tsx', hero);
console.log('patched hero');

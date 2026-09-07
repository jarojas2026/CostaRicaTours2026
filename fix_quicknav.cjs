const fs = require('fs');
let code = fs.readFileSync('src/components/HomeQuickNav.tsx', 'utf8');

const eighthCard = `    {
      id: 'vip',
      title: tico ? '✨ VIP Concierge Privado' : '✨ VIP Private Concierge',
      subtitle: tico ? 'Jets privados, yates de lujo y chofer bilingüe dedicado' : 'Private jets, luxury yachts & dedicated bilingual driver',
      icon: <Sparkles className="w-6 h-6 text-amber-400" />,
      badge: tico ? 'Exclusivo' : 'Exclusive',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      tab: 'tours' as const,
      gradient: 'from-amber-950/90 to-stone-950/90 hover:border-amber-400/60',
      actionText: tico ? 'Cotizar VIP' : 'Request VIP'
    }`;

// Insert before the closing bracket of navCards
if (!code.includes("id: 'vip'")) {
  code = code.replace(/    \}\s*\];\s*\n\s*return \(/, `    },\n${eighthCard}\n  ];\n\n  return (`);
  fs.writeFileSync('src/components/HomeQuickNav.tsx', code);
  console.log('Added 8th card to HomeQuickNav');
}

const fs = require('fs');
let code = fs.readFileSync('src/components/HomeQuickNav.tsx', 'utf8');

// Fix price badge text
code = code.replace(/bg-orange-500 text-stone-900/g, 'bg-orange-500 text-white');
// The card titles inside the image wrapper? Let's check how they were structured.
// Wait, the text inside the image wrapper might have been text-white. If it is now text-stone-900, it's black on a dark image overlay!
// I should just restore text-white for those.
code = code.replace(/<h3 className="text-lg font-black text-stone-900/g, '<h3 className="text-lg font-black text-stone-900'); // wait, the h3 is inside <div className="p-5 flex-1..."> which is outside the image. So it's fine!

fs.writeFileSync('src/components/HomeQuickNav.tsx', code);

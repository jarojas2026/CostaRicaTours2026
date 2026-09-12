const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules')) {
                results = results.concat(walk(file));
            }
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('./src');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Inputs
    content = content.replace(/className="w-full p-2 border rounded-lg"/g, 'className="w-full px-4 py-3 border border-stone-200 bg-stone-50 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all duration-300 text-stone-800 font-medium"');
    
    // Selects / Textareas that might have similar basic styling
    content = content.replace(/className="w-full p-2 border rounded-md"/g, 'className="w-full px-4 py-3 border border-stone-200 bg-stone-50 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all duration-300 text-stone-800 font-medium"');

    // Submit buttons (orange)
    content = content.replace(/className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl mt-6"/g, 'className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black py-4 rounded-xl mt-8 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-1 active:scale-[0.98] transition-all duration-300"');
    
    // Other generic primary buttons
    content = content.replace(/className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl mt-4"/g, 'className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-black py-4 rounded-xl mt-6 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-1 active:scale-[0.98] transition-all duration-300"');
    
    // Modal Containers
    content = content.replace(/className="bg-white p-6 rounded-2xl/g, 'className="bg-white p-6 md:p-8 rounded-[24px] shadow-2xl shadow-black\\/50 border border-stone-100/50');
    content = content.replace(/className="bg-white p-8 rounded-2xl/g, 'className="bg-white p-6 md:p-8 rounded-[24px] shadow-2xl shadow-black\\/50 border border-stone-100/50');

    // Labels
    content = content.replace(/className="text-xs font-bold block mb-1"/g, 'className="text-[11px] font-black tracking-wider text-stone-500 uppercase mb-2 block"');

    // Close buttons (X)
    content = content.replace(/className="absolute top-4 right-4 text-stone-500 hover:text-stone-900 z-10 bg-white\/80 rounded-full p-1"/g, 'className="absolute top-4 right-4 text-stone-400 hover:text-stone-800 z-10 bg-stone-100 hover:bg-stone-200 rounded-full p-2 transition-colors duration-200"');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated UI in ${file}`);
    }
});

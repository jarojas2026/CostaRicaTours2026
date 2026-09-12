const fs = require('fs');
const path = require('path');

function updateFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    for (const [search, replace] of replacements) {
        content = content.replace(search, replace);
    }
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

// MapServiceBookingModal
updateFile('./src/components/MapServiceBookingModal.tsx', [
    // Inputs
    [/className="w-full px-3 py-2 bg-emerald-950\/70 border border-emerald-500\/30 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"/g, 'className="w-full px-4 py-3 bg-[#0a291f] border border-emerald-800/50 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 transition-all duration-300 placeholder-emerald-800/50"'],
    // Selects
    [/className="w-full px-3 py-2 bg-emerald-950\/70 border border-emerald-500\/30 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"/g, 'className="w-full px-4 py-3 bg-[#0a291f] border border-emerald-800/50 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 transition-all duration-300 placeholder-emerald-800/50"'],
    // Submit button
    [/className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"/g, 'className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-black py-4 px-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2"'],
    // Dialog wrapper
    [/className="bg-\[\#051e16\] border-2 border-emerald-500\/40 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-6 text-white animate-in zoom-in-95 duration-150 flex flex-col max-h-\[92vh\]"/g, 'className="bg-[#051e16]/95 backdrop-blur-2xl border border-emerald-500/30 rounded-[28px] max-w-2xl w-full shadow-[0_0_40px_rgba(0,0,0,0.6)] overflow-hidden my-6 text-white animate-in zoom-in-95 duration-300 flex flex-col max-h-[92vh] ring-1 ring-white/10"']
]);

// FlightBookingModal
updateFile('./src/components/FlightBookingModal.tsx', [
    // Wrapper
    [/className="bg-white border-2 border-orange-400\/80 rounded-\[2rem\] max-w-2xl w-full shadow-2xl overflow-hidden my-6 animate-fade-in text-white"/g, 'className="bg-stone-50 border border-stone-200 rounded-[28px] max-w-2xl w-full shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden my-6 animate-fade-in text-stone-900"'],
    
    // Header
    [/className="bg-stone-100\/90 p-5 sm:p-6 border-b border-teal-500\/30 flex items-center justify-between"/g, 'className="bg-white p-5 sm:p-6 border-b border-stone-200 flex items-center justify-between"'],
    [/text-white/g, 'text-stone-900'], // Careful with this, might need precision
    
    // Actually, FlightBookingModal has complex classes. Let's do it safer.
]);

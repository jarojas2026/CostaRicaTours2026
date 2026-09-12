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

const files = walk('./src/components');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // We can just look for standard buttons and inputs that were missed.
    
    // Convert generic text inputs (but ignore complex inline ones)
    // Sometimes it's `className="w-full p-3 border rounded-xl"`
    content = content.replace(/className="w-full p-2 border rounded-xl"/g, 'className="input-modern"');
    content = content.replace(/className="w-full p-3 border rounded-xl"/g, 'className="input-modern"');
    content = content.replace(/className="w-full p-3 border border-stone-200 rounded-xl"/g, 'className="input-modern"');
    content = content.replace(/className="w-full border rounded-xl p-3"/g, 'className="input-modern"');

    // Generic primary buttons
    content = content.replace(/className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors"/g, 'className="btn-primary w-full"');
    content = content.replace(/className="bg-orange-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-orange-600 transition-colors"/g, 'className="btn-primary"');
    content = content.replace(/className="bg-orange-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-orange-600 transition-colors"/g, 'className="btn-primary"');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Polished ${file}`);
    }
});

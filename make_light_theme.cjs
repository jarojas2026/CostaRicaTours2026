const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function convertToLight(content) {
  // 1. Convert dark backgrounds to light backgrounds
  content = content.replace(/bg-stone-950/g, 'bg-white');
  content = content.replace(/bg-stone-900\/([0-9]+)/g, 'bg-stone-100/$1');
  content = content.replace(/bg-stone-900/g, 'bg-stone-50');
  content = content.replace(/bg-stone-800\/([0-9]+)/g, 'bg-stone-200/$1');
  content = content.replace(/bg-stone-800/g, 'bg-stone-100');
  content = content.replace(/bg-stone-700/g, 'bg-stone-200');
  
  // 2. Convert dark text to dark text on light backgrounds
  content = content.replace(/text-stone-100/g, 'text-stone-900');
  content = content.replace(/text-stone-200/g, 'text-stone-800');
  content = content.replace(/text-stone-300/g, 'text-stone-700');
  content = content.replace(/text-stone-400/g, 'text-stone-600');
  
  content = content.replace(/text-neutral-100/g, 'text-stone-900');
  content = content.replace(/text-neutral-200/g, 'text-stone-800');
  content = content.replace(/text-neutral-300/g, 'text-stone-700');
  content = content.replace(/text-neutral-400/g, 'text-stone-600');
  
  // 3. Borders
  content = content.replace(/border-stone-800/g, 'border-stone-200');
  content = content.replace(/border-stone-900/g, 'border-stone-200');
  content = content.replace(/border-white\/([0-9]+)/g, 'border-black/$1');
  
  // 4. text-white that are meant to be text (like header) -> text-stone-900
  // But we want to KEEP text-white if it's on a button like bg-orange-500
  // We can do a safe pass: Replace `text-white` with `text-stone-900`, then manually revert it for orange/teal backgrounds.
  // Actually, a simpler way is just regexing the classes...
  
  return content;
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let newContent = convertToLight(content);
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent);
    }
  }
});
console.log("Converted TSX files to light theme classes!");

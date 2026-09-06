const fs = require('fs');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = require('path').join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix contrast on primary colored badges/buttons
    content = content.replace(/bg-green-([0-9]+)\/([0-9]+) backdrop-blur-md text-stone-900/g, 'bg-green-$1/$2 backdrop-blur-md text-white');
    content = content.replace(/bg-teal-([0-9]+)\/([0-9]+) backdrop-blur-md text-stone-900/g, 'bg-teal-$1/$2 backdrop-blur-md text-white');
    content = content.replace(/bg-purple-([0-9]+)\/([0-9]+) backdrop-blur-md text-stone-900/g, 'bg-purple-$1/$2 backdrop-blur-md text-white');
    content = content.replace(/bg-rose-([0-9]+) text-stone-900/g, 'bg-rose-$1 text-white');
    content = content.replace(/bg-blue-([0-9]+)\/([0-9]+) backdrop-blur-md text-stone-900/g, 'bg-blue-$1/$2 backdrop-blur-md text-white');
    
    fs.writeFileSync(filePath, content);
  }
});
console.log("Fixed text contrast on colored badges!");

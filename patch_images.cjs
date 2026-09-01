const fs = require('fs');

let hero = fs.readFileSync('src/components/HeroSection.tsx', 'utf8');
hero = hero.replace('"/images/arenal_volcano_tour_1785203794047.jpg"', '"https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80"');
hero = hero.replace('"/images/manuel_antonio_beach_1785203803239.jpg"', '"https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80"');
hero = hero.replace('"/images/pacuare_rafting_adventure_1785203824345.jpg"', '"https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=1200&q=80"');
hero = hero.replace('"/images/costa_rica_hero_1785203783748.jpg"', '"https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80"');
fs.writeFileSync('src/components/HeroSection.tsx', hero);

let tours = fs.readFileSync('src/data/toursData.ts', 'utf8');
tours = tours.replace(/'\/images\/arenal_volcano_tour_1785203794047\.jpg'/g, "'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80'");
tours = tours.replace(/'\/images\/manuel_antonio_beach_1785203803239\.jpg'/g, "'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'");
tours = tours.replace(/'\/images\/pacuare_rafting_adventure_1785203824345\.jpg'/g, "'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=1200&q=80'");
tours = tours.replace(/'\/images\/monteverde_cloud_forest_1785203813611\.jpg'/g, "'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80'");
fs.writeFileSync('src/data/toursData.ts', tours);

console.log("patched images to use unsplash");

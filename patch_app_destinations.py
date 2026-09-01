import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import
import_statement = "import { DestinationsCarousel } from './components/DestinationsCarousel';\n"
if "DestinationsCarousel" not in content:
    content = content.replace("import { HeroSection }", import_statement + "import { HeroSection }")

# 2. Add component inside activeTab === 'home'
hero_render = """            <HeroSection
              language={language}
              currency={currency}
              onOpenBookingList={() => setActiveTab('bookings')}
            />"""

new_render = hero_render + """

            {/* Destinations Carousel */}
            <DestinationsCarousel 
              language={language}
              onSelectRegion={(reg) => {
                setSelectedRegion(reg);
                setActiveTab('tours');
                setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
              }}
            />"""

if "DestinationsCarousel language" not in content:
    content = content.replace(hero_render, new_render)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

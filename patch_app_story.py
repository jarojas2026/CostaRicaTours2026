import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import
import_statement = "import { OurStory } from './components/OurStory';\n"
if "OurStory" not in content:
    content = content.replace("import { DestinationsCarousel }", import_statement + "import { DestinationsCarousel }")

# 2. Add component inside activeTab === 'home'
destinations_render = """            {/* Destinations Carousel */}
            <DestinationsCarousel 
              language={language}
              onSelectRegion={(reg) => {
                setSelectedRegion(reg);
                setActiveTab('tours');
                setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
              }}
            />"""

new_render = destinations_render + """

            {/* Our Story / Local Experts */}
            <OurStory language={language} />"""

if "<OurStory language" not in content:
    content = content.replace(destinations_render, new_render)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

import re

# HeroSection
with open('src/components/HeroSection.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

combo_opt = """                  <option value="combos">{language === 'es' ? '🚀 Combos de 1 Día' : '🚀 1-Day Combos'}</option>
                  <option value="volcanoes">"""
content = content.replace('<option value="volcanoes">', combo_opt)

with open('src/components/HeroSection.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# ToursGrid
with open('src/components/ToursGrid.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

combo_btn = """            <button
              onClick={() => setSelectedCategory('combos')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === 'combos'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 border border-neutral-200'
              }`}
            >
              🚀 {getLangText(UI_TRANSLATIONS.combos, language)}
            </button>
            <button
              onClick={() => setSelectedCategory('volcanoes')}"""

content = content.replace("""            <button
              onClick={() => setSelectedCategory('volcanoes')}""", combo_btn)

with open('src/components/ToursGrid.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

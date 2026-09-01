import re

with open('src/components/HeroSection.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_p = """            <p className="text-lg sm:text-xl text-emerald-50 max-w-2xl font-medium leading-relaxed drop-shadow-md">
              {language === 'es' 
                ? '¡Mae, descubrí la Costa Rica más chiva y auténtica! Tours guiados con compas locales a volcanes, bosques nubosos y playas vírgenes. Reservá al suave con cancelación gratis hasta 48h. ¡Pura vida!'
                : 'Explore wild, authentic Costa Rica. Guided tours with local naturalists to active volcanoes, cloud forests, and pristine beaches. Instant booking & free cancellation up to 48h.'}
            </p>"""

new_p = """            <p className="text-lg sm:text-xl text-emerald-50 max-w-2xl font-medium leading-relaxed drop-shadow-md">
              {language === 'es' 
                ? 'Encuentra y reserva todas las experiencias, shuttles y tours de Costa Rica en una sola plataforma. Trabajamos con los mejores operadores locales para garantizarte disponibilidad y el precio oficial.'
                : 'Find and book all experiences, shuttles, and tours in Costa Rica on a single platform. We work with the best local operators to guarantee you availability and the official price.'}
            </p>"""

content = content.replace(old_p, new_p)

with open('src/components/HeroSection.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

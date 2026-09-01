import re

with open('src/components/ServicesSection.tsx', 'r') as f:
    text = f.read()

# Replace "Guías certificados" to "Guías locales"
text = text.replace('Guías certificados y expertos locales para acompañarte en tu aventura.', 'Guías expertos locales para acompañarte en tu aventura.')
text = text.replace('Certified guides and local experts to accompany you on your adventure.', 'Local expert guides to accompany you on your adventure.')
text = text.replace('Guías y Consultoría', 'Guías Locales')
text = text.replace('Guides & Consulting', 'Local Guides')

# Remove the ICT banner
pattern = r'<div className="mt-16 bg-orange-950/80 backdrop-blur-xl p-8 rounded-3xl border border-orange-900/50/50 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">.*?</div>\s*</div>\s*</section>'
text = re.sub(pattern, '</div>\n    </section>', text, flags=re.DOTALL)

with open('src/components/ServicesSection.tsx', 'w') as f:
    f.write(text)


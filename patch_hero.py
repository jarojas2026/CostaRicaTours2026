import re

with open('src/components/HeroSection.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    "Explora la Costa Rica más salvaje y auténtica. Tours guiados con naturalistas locales a volcanes, bosques nubosos y playas vírgenes. Reserva instantánea y cancelación gratis hasta 48h.":
    "¡Mae, descubrí la Costa Rica más chiva y auténtica! Tours guiados con compas locales a volcanes, bosques nubosos y playas vírgenes. Reservá al suave con cancelación gratis hasta 48h. ¡Pura vida!",
    
    "Cotizar Paquete 2026": "Armar mi Viaje Tuanis",
    "Descubrir": "¡Mandarse!",
}

for old, new_val in replacements.items():
    content = content.replace(old, new_val)

with open('src/components/HeroSection.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

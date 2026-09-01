import re

with open('src/components/Footer.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    "Hecho con": "Hecho con buena vibra y",
    "en Costa Rica": "en Costa Rica, ¡Pura Vida mae!",
    "Expertos Locales en Costa Rica": "Tus compas locales en Costa Rica",
}

for old, new_val in replacements.items():
    content = content.replace(old, new_val)

with open('src/components/Footer.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

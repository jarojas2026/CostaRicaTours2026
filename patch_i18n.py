import re

with open('src/utils/i18n.ts', 'r', encoding='utf-8') as f:
    content = f.read()

new_trans = """
  combos: {
    es: 'Combos de 1 Día',
    en: '1-Day Combos',
    de: '1-Tages-Kombis',
    fr: 'Combos 1 Jour',
    zh: '一日游套餐',
    ja: '1日コンボ'
  },
  volcanoes: {"""

content = content.replace("  volcanoes: {", new_trans)

with open('src/utils/i18n.ts', 'w', encoding='utf-8') as f:
    f.write(content)

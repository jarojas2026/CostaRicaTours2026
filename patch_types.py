import re

with open('src/types.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("| 'culture'\n  | 'multiday';", "| 'culture'\n  | 'multiday'\n  | 'combos';")

with open('src/types.ts', 'w', encoding='utf-8') as f:
    f.write(content)

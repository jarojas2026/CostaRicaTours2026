import re

with open('src/components/AIAssistant.tsx', 'r') as f:
    content = f.read()

# Make the chat bubbles text-base (16px) instead of text-xs sm:text-sm
content = content.replace('text-xs sm:text-sm leading-relaxed', 'text-base leading-[1.6]')

# Also update the input field text size
content = content.replace('text-xs sm:text-sm focus:outline-none', 'text-base focus:outline-none')

# The header texts
content = content.replace('text-xs sm:text-sm text-neutral-300', 'text-base text-neutral-300 max-w-3xl mx-auto')

with open('src/components/AIAssistant.tsx', 'w') as f:
    f.write(content)

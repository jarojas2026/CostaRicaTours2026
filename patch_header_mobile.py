import re

with open('src/components/Header.tsx', 'r') as f:
    content = f.read()

# 1. Hide the flag on mobile to prevent Windows rendering "US" text taking up space
content = content.replace(
    '''<span className="text-sm sm:text-base leading-none">{currentLangInfo.flag}</span>''',
    '''<span className="hidden sm:block text-sm sm:text-base leading-none">{currentLangInfo.flag}</span>'''
)

# 2. Add min-w-0 to the logo so it can shrink and truncate properly
content = content.replace(
    '''className="flex items-center gap-2 sm:gap-3 group text-left cursor-pointer shrink"''',
    '''className="flex items-center gap-2 sm:gap-3 group text-left cursor-pointer shrink min-w-0"'''
)

content = content.replace(
    '''<div className="whitespace-nowrap shrink overflow-hidden">''',
    '''<div className="whitespace-nowrap shrink min-w-0 overflow-hidden">'''
)

with open('src/components/Header.tsx', 'w') as f:
    f.write(content)

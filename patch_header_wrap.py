import re

with open('src/components/Header.tsx', 'r') as f:
    content = f.read()

# Make the Main Bar container wrap
content = content.replace(
    '''<div className={`max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 flex justify-between items-center transition-all duration-300 ${isScrolled ? 'py-2' : 'py-3.5'}`}>''',
    '''<div className={`max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 flex flex-wrap justify-between items-center gap-y-2 transition-all duration-300 ${isScrolled ? 'py-2' : 'py-3.5'}`}>'''
)

with open('src/components/Header.tsx', 'w') as f:
    f.write(content)

import re

with open('src/components/HeroSection.tsx', 'r') as f:
    content = f.read()

# Replace gradient text with a solid color
content = content.replace(
    'className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 drop-shadow-lg"',
    'className="text-amber-400"'
)

# Remove drop-shadows on h1
content = content.replace(
    'className="text-5xl sm:text-7xl lg:text-8xl font-black leading-[0.9] text-white tracking-tight drop-shadow-[0_4px_25px_rgba(0,0,0,0.8)]"',
    'className="text-5xl sm:text-7xl lg:text-8xl font-black leading-[1.1] text-white tracking-tight"'
)

# Clean up the small pill at the top
content = content.replace(
    'className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-full text-xs font-black uppercase tracking-widest border border-emerald-400/50 shadow-lg"',
    'className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-900/60 text-emerald-100 rounded-full text-sm font-bold uppercase tracking-widest border border-emerald-500/30 backdrop-blur-md"'
)

with open('src/components/HeroSection.tsx', 'w') as f:
    f.write(content)

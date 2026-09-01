import re

with open('src/components/Header.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    '''text-[15px] sm:text-xl font-black tracking-tighter uppercase block leading-none text-white truncate''',
    '''text-[13px] sm:text-xl font-black tracking-tighter uppercase block leading-none text-white truncate'''
)

content = content.replace(
    '''text-[8px] sm:text-[10px] tracking-widest uppercase font-extrabold text-emerald-400''',
    '''text-[7px] sm:text-[10px] tracking-widest uppercase font-extrabold text-emerald-400'''
)

# Currency button padding
content = content.replace(
    '''px-1.5 sm:px-2.5 py-1 rounded-full border border-orange-500 text-[10px] sm:text-[11px] font-bold''',
    '''px-1 sm:px-2.5 py-1 rounded-full border border-orange-500 text-[9px] sm:text-[11px] font-bold'''
)

with open('src/components/Header.tsx', 'w') as f:
    f.write(content)

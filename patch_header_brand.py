import re

with open('src/components/Header.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_brand = """            <span className="text-xl font-black tracking-tighter text-white">
              PuraVida<span className="text-amber-400">Tours</span>
            </span>"""

new_brand = """            <span className="text-xl font-black tracking-tighter text-white leading-none flex flex-col">
              <span>PuraVida<span className="text-amber-400">Hub</span></span>
              <span className="text-[9px] font-medium text-emerald-300 uppercase tracking-widest mt-0.5">Costa Rica Booking</span>
            </span>"""

content = content.replace(old_brand, new_brand)

with open('src/components/Header.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

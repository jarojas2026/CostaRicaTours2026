import re

with open('src/components/Header.tsx', 'r') as f:
    content = f.read()

# 1. Update Logo container padding and spacing
content = content.replace(
    '''<div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center transition-all duration-300 ${isScrolled ? 'py-2' : 'py-3.5'}`}>''',
    '''<div className={`max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 flex justify-between items-center transition-all duration-300 ${isScrolled ? 'py-2' : 'py-3.5'}`}>'''
)

# 2. Make the Brand Logo smaller on mobile
content = content.replace(
    '''        <button
          onClick={() => handleTabChange('home')}
          className="flex items-center gap-3 group text-left cursor-pointer"
        >
          <div className="w-11 h-11 bg-emerald-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-md group-hover:scale-105 transition-transform border border-emerald-400 shrink-0">
            🌴
          </div>
          <div className="whitespace-nowrap">
            <span className="text-lg sm:text-xl font-black tracking-tighter uppercase block leading-none text-white">
              Pura Vida <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-amber-300">Tours</span>
            </span>
            <span className="text-[10px] tracking-widest uppercase font-extrabold text-emerald-400">
              COSTA RICA
            </span>
          </div>
        </button>''',
    '''        <button
          onClick={() => handleTabChange('home')}
          className="flex items-center gap-2 sm:gap-3 group text-left cursor-pointer shrink"
        >
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-emerald-600 rounded-2xl flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-md group-hover:scale-105 transition-transform border border-emerald-400 shrink-0">
            🌴
          </div>
          <div className="whitespace-nowrap shrink overflow-hidden">
            <span className="text-[15px] sm:text-xl font-black tracking-tighter uppercase block leading-none text-white truncate">
              Pura Vida <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-amber-300">Tours</span>
            </span>
            <span className="text-[8px] sm:text-[10px] tracking-widest uppercase font-extrabold text-emerald-400">
              COSTA RICA
            </span>
          </div>
        </button>'''
)

# 3. Action buttons container gap
content = content.replace(
    '''<div className="flex items-center gap-2 sm:gap-2.5 shrink-0">''',
    '''<div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">'''
)

# 4. Multi-Currency button
content = content.replace(
    '''            <button
              onClick={() => setIsCurrencyMenuOpen(!isCurrencyMenuOpen)}
              className="flex items-center gap-1.5 bg-orange-700/50 hover:bg-orange-700 px-2.5 py-1 rounded-full border border-orange-500 text-[11px] font-bold transition-colors cursor-pointer shadow-sm"
              title="Select Currency"
            >''',
    '''            <button
              onClick={() => setIsCurrencyMenuOpen(!isCurrencyMenuOpen)}
              className="flex items-center gap-1 sm:gap-1.5 bg-orange-700/50 hover:bg-orange-700 px-1.5 sm:px-2.5 py-1 rounded-full border border-orange-500 text-[10px] sm:text-[11px] font-bold transition-colors cursor-pointer shadow-sm"
              title="Select Currency"
            >'''
)

# 5. Multi-Language button
content = content.replace(
    '''            <button
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="flex items-center gap-1.5 bg-orange-700/50 hover:bg-orange-700 px-2.5 py-1 rounded-full border border-orange-500 text-[11px] font-bold transition-colors cursor-pointer shadow-sm"
              title="Select Language / Seleccionar Idioma"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-base leading-none">{currentLangInfo.flag}</span>
              <span className="text-white uppercase font-black">{currentLangInfo.code}</span>''',
    '''            <button
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="flex items-center gap-1 sm:gap-1.5 bg-orange-700/50 hover:bg-orange-700 px-1.5 sm:px-2.5 py-1 rounded-full border border-orange-500 text-[10px] sm:text-[11px] font-bold transition-colors cursor-pointer shadow-sm"
              title="Select Language / Seleccionar Idioma"
            >
              <Globe className="hidden sm:block w-3.5 h-3.5 text-amber-400" />
              <span className="text-sm sm:text-base leading-none">{currentLangInfo.flag}</span>
              <span className="text-white uppercase font-black">{currentLangInfo.code}</span>'''
)

# 6. Sparkles / Custom Trip button
content = content.replace(
    '''              className="flex justify-center items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white p-2 sm:px-3.5 sm:py-2 rounded-full text-xs font-black uppercase tracking-wider shadow-md transition-all hover:scale-105 cursor-pointer"''',
    '''              className="flex justify-center items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white p-1.5 sm:p-2 sm:px-3.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-md transition-all hover:scale-105 cursor-pointer"'''
)
content = content.replace(
    '''<Sparkles className="w-4 h-4 sm:w-3.5 sm:h-3.5" />''',
    '''<Sparkles className="w-3.5 h-3.5 sm:w-3.5 sm:h-3.5" />'''
)

# 7. My Bookings button
content = content.replace(
    '''              className="relative flex justify-center items-center bg-orange-500 hover:bg-orange-600 text-white p-2 sm:px-4 sm:py-2 rounded-full font-bold text-xs uppercase tracking-wider gap-2 shadow-lg shadow-orange-500/20 transition-transform hover:scale-105 cursor-pointer"''',
    '''              className="relative flex justify-center items-center bg-orange-500 hover:bg-orange-600 text-white p-1.5 sm:p-2 sm:px-4 sm:py-2 rounded-full font-bold text-[10px] sm:text-xs uppercase tracking-wider gap-1.5 sm:gap-2 shadow-lg shadow-orange-500/20 transition-transform hover:scale-105 cursor-pointer"'''
)
content = content.replace(
    '''<ShoppingBag className="w-4 h-4" />''',
    '''<ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />'''
)

with open('src/components/Header.tsx', 'w') as f:
    f.write(content)


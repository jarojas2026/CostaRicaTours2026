import re

with open('src/components/TourCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

group_tag = """                {tour.freeCancellation && (
                  <span className="bg-emerald-600/90 backdrop-blur-md text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border border-emerald-400 shadow-sm">
                    {t('freeCancellation')}
                  </span>
                )}
                {tour.maxGroupSize && tour.maxGroupSize >= 8 && (
                  <span className="bg-purple-600/90 backdrop-blur-md text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border border-purple-400 shadow-sm">
                    {language === 'es' ? 'Precios para Grupos' : 'Group Rates'}
                  </span>
                )}"""

content = content.replace("""                {tour.freeCancellation && (
                  <span className="bg-emerald-600/90 backdrop-blur-md text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border border-emerald-400 shadow-sm">
                    {t('freeCancellation')}
                  </span>
                )}""", group_tag)

departure_tag = """            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMiniMap(true);
              }}
              className="flex items-center gap-1.5 text-xs text-amber-400 font-bold tracking-wider hover:text-amber-300 transition-colors uppercase w-fit"
            >
              <MapPin className="w-4 h-4" />
              <span>{tour.region === 'sjo' ? (language === 'es' ? 'Salida desde: San José' : 'Departs from: San Jose') : tour.region}</span>
            </button>"""

content = content.replace("""            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMiniMap(true);
              }}
              className="flex items-center gap-1.5 text-xs text-amber-400 font-bold tracking-wider hover:text-amber-300 transition-colors uppercase w-fit"
            >
              <MapPin className="w-4 h-4" />
              <span>{tour.region}</span>
            </button>""", departure_tag)

with open('src/components/TourCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

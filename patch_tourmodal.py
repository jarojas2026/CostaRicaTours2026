import re

with open('src/components/TourDetailModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

location_badge = """              <span className="bg-teal-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full">
                📍 {tour.location?.placeName || tour.region}
              </span>
              {tour.region === 'sjo' && (
                <span className="bg-amber-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-md">
                  🚌 {language === 'es' ? 'Salida desde: San José' : 'Departs from: San Jose'}
                </span>
              )}"""

content = content.replace("""              <span className="bg-teal-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full">
                📍 {tour.location.placeName}
              </span>""", location_badge)

with open('src/components/TourDetailModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

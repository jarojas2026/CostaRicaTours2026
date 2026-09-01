import re

with open('src/components/TravelerToolkit.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Update activeTab definition
content = content.replace("useState<'seasons' | 'currency' | 'entry'>('seasons')", "useState<'transport' | 'seasons' | 'currency' | 'entry'>('transport')")

transport_tab_btn = """            <button
              onClick={() => setActiveTab('transport')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'transport'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Bus className="w-4 h-4" />
              <span>{language === 'es' ? 'Transporte & Shuttles' : 'Transport & Shuttles'}</span>
            </button>
            
            <button"""

content = content.replace("<button\n              onClick={() => setActiveTab('seasons')}", transport_tab_btn)

# Add transport content before seasons content
transport_content = """        {/* TAB 0: Transport & Logistics */}
        {activeTab === 'transport' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 flex flex-col items-center text-center space-y-4 hover:shadow-lg transition-all group">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Bus className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900">
                {language === 'es' ? 'Shuttles Privados' : 'Private Shuttles'}
              </h3>
              <p className="text-sm text-neutral-600 flex-1">
                {language === 'es' 
                  ? 'Viaja cómodo desde los aeropuertos (SJO o Liberia) directo a tu hotel. Ideal para familias o grupos, con aire acondicionado y chofer bilingüe.' 
                  : 'Travel comfortably from airports (SJO or Liberia) directly to your hotel. Ideal for families or groups, with AC and bilingual drivers.'}
              </p>
              <button 
                onClick={onOpenTripBuilder}
                className="w-full mt-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors cursor-pointer shadow-md hover:shadow-lg">
                {language === 'es' ? 'Cotizar Shuttle Privado' : 'Quote Private Shuttle'}
              </button>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 flex flex-col items-center text-center space-y-4 hover:shadow-lg transition-all group">
              <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <MapPin className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900">
                {language === 'es' ? 'Shuttles Compartidos' : 'Shared Shuttles'}
              </h3>
              <p className="text-sm text-neutral-600 flex-1">
                {language === 'es' 
                  ? 'Conecta los principales destinos (La Fortuna, Manuel Antonio, Tamarindo) de forma económica y segura con otros viajeros.' 
                  : 'Connect major destinations (La Fortuna, Manuel Antonio, Tamarindo) economically and safely with other travelers.'}
              </p>
              <button 
                onClick={onOpenTripBuilder}
                className="w-full mt-4 py-3 bg-white border-2 border-amber-500 text-amber-600 hover:bg-amber-50 rounded-xl font-bold text-sm transition-colors cursor-pointer">
                {language === 'es' ? 'Ver Rutas Compartidas' : 'View Shared Routes'}
              </button>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 flex flex-col items-center text-center space-y-4 hover:shadow-lg transition-all group">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Compass className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900">
                {language === 'es' ? 'Alquiler de Carro / Bus Local' : 'Rent a Car / Local Bus'}
              </h3>
              <p className="text-sm text-neutral-600 flex-1">
                {language === 'es' 
                  ? '¿Prefieres explorar por tu cuenta? Te asesoramos con alquiler de 4x4 o te mostramos las rutas de buses públicos locales.' 
                  : 'Prefer to explore on your own? We advise you on 4x4 rentals or show you local public bus routes.'}
              </p>
              <div className="w-full flex gap-2 mt-4">
                <button 
                  onClick={onOpenTripBuilder}
                  className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-bold text-sm transition-colors cursor-pointer">
                  {language === 'es' ? 'Rent a Car' : 'Rent a Car'}
                </button>
                {onOpenLocalBuses && (
                  <button 
                    onClick={onOpenLocalBuses}
                    className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-bold text-sm transition-colors cursor-pointer">
                    {language === 'es' ? 'Buses' : 'Buses'}
                  </button>
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 1: Seasons & Wildlife */}"""

content = content.replace("{/* TAB 1: Seasons & Wildlife */}", transport_content)

with open('src/components/TravelerToolkit.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

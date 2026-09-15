import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Loader2, Sparkles, MapPin, Clock, ArrowRight } from 'lucide-react';

export const PhotoTourFinder: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [recommendedTours, setRecommendedTours] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecciona un archivo de imagen válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64String = event.target?.result as string;
      setImagePreview(base64String);
      await analyzePhoto(base64String);
    };
    reader.onerror = () => {
      setError('Error al leer la imagen.');
    };
    reader.readAsDataURL(file);
  };

  const analyzePhoto = async (base64Image: string) => {
    setLoading(true);
    setError(null);
    setRecommendedTours([]);
    setKeywords([]);

    try {
      const response = await fetch('/api/ai/photo-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image }),
      });
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Error al analizar la imagen');
      }

      setRecommendedTours(data.tours || []);
      setKeywords(data.keywords || []);
      if (data.tours?.length === 0) {
        setError(data.message || 'No encontramos tours similares.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 rounded-full mb-3">
          <Camera className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">Encuentra tu Tour por Foto</h2>
        <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
          ¿Viste un lugar increíble en Instagram o Pinterest? Sube la foto y nuestra IA encontrará la experiencia exacta en Costa Rica.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Upload Area */}
        <div className="space-y-4">
          <div 
            className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 bg-slate-800/50 rounded-2xl p-8 text-center transition cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            {imagePreview ? (
              <div className="relative aspect-video rounded-xl overflow-hidden shadow-lg border border-slate-700">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white font-bold bg-black/50 px-3 py-1.5 rounded-lg flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Cambiar foto
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="bg-slate-800 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <ImageIcon className="w-8 h-8 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                </div>
                <p className="text-slate-300 font-bold mb-1">Haz clic para subir una foto</p>
                <p className="text-xs text-slate-500">JPG, PNG o WEBP (máx. 5MB)</p>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          {keywords.length > 0 && !loading && (
            <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4">
              <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Elementos detectados por IA
              </p>
              <div className="flex flex-wrap gap-1.5">
                {keywords.map((kw, i) => (
                  <span key={i} className="px-2 py-1 bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-md capitalize">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results Area */}
        <div>
          {loading ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
              <p className="font-bold text-white">Analizando imagen con Gemini Vision...</p>
              <p className="text-sm mt-1">Buscando coincidencias en nuestro catálogo</p>
            </div>
          ) : error ? (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-4 text-sm text-center">
              {error}
            </div>
          ) : recommendedTours.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Tours Recomendados
              </h3>
              
              <div className="space-y-3">
                {recommendedTours.map((tour) => (
                  <div key={tour.id} className="bg-slate-800/80 border border-slate-700 rounded-xl overflow-hidden flex flex-col sm:flex-row group hover:border-emerald-500/50 transition-colors">
                    <div className="sm:w-1/3 aspect-video sm:aspect-square relative overflow-hidden shrink-0">
                      <img src={tour.image} alt={tour.title?.es || 'Tour image'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="p-4 flex flex-col justify-between flex-1">
                      <div>
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1">
                          <MapPin className="w-3 h-3" />
                          {tour.region}
                        </div>
                        <h4 className="text-white font-bold leading-tight mb-2">{tour.title?.es || 'Tour Recomendado'}</h4>
                        
                        <div className="bg-amber-900/20 border border-amber-500/20 rounded-lg p-2.5 mb-3">
                          <p className="text-xs text-amber-200/90 leading-relaxed italic">
                            "{tour.matchReason}"
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-3 text-slate-400 text-xs">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {tour.durationHours}h</span>
                        </div>
                        <button className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold text-xs group-hover:translate-x-1 transition-transform">
                          Ver Tour <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
              <Camera className="w-12 h-12 mb-3 text-slate-700" />
              <p className="font-medium">Sube una foto para ver recomendaciones</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

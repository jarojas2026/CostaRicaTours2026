import React, { useState, useEffect } from 'react';
import { X, FileText, Plus, ExternalLink, RefreshCw, Trash2 } from 'lucide-react';
import { getAccessToken } from '../firebase';
import { Language } from '../types';

interface FormsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const FormsManagerModal: React.FC<FormsManagerModalProps> = ({ isOpen, onClose, language }) => {
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchForms = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("No access token available. Please sign in.");
      
      const res = await fetch('https://www.googleapis.com/drive/v3/files?q=mimeType=\'application/vnd.google-apps.form\'&fields=files(id,name,webViewLink,createdTime)', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setForms(data.files || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchForms();
    }
  }, [isOpen]);

  const handleCreateForm = async () => {
    setCreating(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("No access token available.");

      // 1. Create the Form
      const createRes = await fetch('https://forms.googleapis.com/v1/forms', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          info: {
            title: 'Costa Rica Tours (costaricatours.es) - Tour Feedback',
            documentTitle: 'Tour Feedback Form'
          }
        })
      });
      const createData = await createRes.json();
      if (createData.error) throw new Error(createData.error.message);

      const formId = createData.formId;

      // 2. Add Questions
      const updateRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            {
              createItem: {
                item: {
                  title: 'Which tour did you attend?',
                  questionItem: {
                    question: { required: true, textQuestion: {} }
                  }
                },
                location: { index: 0 }
              }
            },
            {
              createItem: {
                item: {
                  title: 'How would you rate your experience? (1-5)',
                  questionItem: {
                    question: { required: true, textQuestion: {} }
                  }
                },
                location: { index: 1 }
              }
            }
          ]
        })
      });

      const updateData = await updateRes.json();
      if (updateData.error) throw new Error(updateData.error.message);

      await fetchForms();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteForm = async (fileId: string, fileName: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete the form "${fileName}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("No access token available.");

      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
         const data = await res.json();
         throw new Error(data.error?.message || "Failed to delete form");
      }
      
      await fetchForms();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 border border-orange-500/30 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-stone-950 to-neutral-900 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center border border-orange-500/30">
              <FileText className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">
                {language === 'es' ? 'Gestor de Formularios' : 'Forms Manager'}
              </h2>
              <p className="text-xs text-neutral-400">
                {language === 'es' ? 'Gestiona formularios de Google' : 'Manage your Google Forms'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-200 uppercase">
              {language === 'es' ? 'Tus Formularios' : 'Your Forms'}
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchForms}
                disabled={loading}
                className="p-2 text-orange-400 hover:bg-orange-400/10 rounded-full transition-colors disabled:opacity-50"
                title={language === 'es' ? 'Actualizar' : 'Refresh'}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleCreateForm}
                disabled={creating}
                className="flex items-center gap-2 bg-orange-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              >
                {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {language === 'es' ? 'Crear Formulario de Feedback' : 'Create Feedback Form'}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {loading && !forms.length ? (
            <div className="py-12 flex justify-center">
              <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
            </div>
          ) : forms.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 text-sm border-2 border-dashed border-neutral-800 rounded-xl">
              {language === 'es' ? 'No hay formularios. Crea uno nuevo.' : 'No forms found. Create a new one.'}
            </div>
          ) : (
            <div className="grid gap-3">
              {forms.map(form => (
                <div key={form.id} className="bg-neutral-800/50 border border-neutral-700/50 p-4 rounded-xl flex items-center justify-between group hover:border-orange-500/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-purple-500/20 text-purple-400 rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{form.name}</h4>
                      <p className="text-[10px] text-neutral-500">
                        {new Date(form.createdTime).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={form.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-neutral-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                      title={language === 'es' ? 'Abrir formulario' : 'Open form'}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleDeleteForm(form.id, form.name)}
                      className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      title={language === 'es' ? 'Eliminar' : 'Delete'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

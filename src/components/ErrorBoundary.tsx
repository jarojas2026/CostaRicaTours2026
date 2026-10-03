import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_error: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error captured by ErrorBoundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <main role="alert" aria-live="assertive" className="min-h-screen bg-[#041711] flex items-center justify-center p-6 text-stone-100">
          <div className="max-w-md w-full bg-[#052118] border border-emerald-500/30 rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle aria-hidden="true" className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold font-heading text-white">No pudimos mostrar esta sección</h1>
              <p className="text-sm text-stone-300 leading-relaxed">
                Intenta recargar la página. Si el problema continúa, vuelve al inicio e inténtalo de nuevo.
              </p>
              <p lang="en" className="text-sm text-stone-400 leading-relaxed">
                We couldn’t load this section. Refresh the page, or return home and try again.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                aria-label="Recargar página / Reload page"
                onClick={() => window.location.reload()}
                className="flex-1 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw aria-hidden="true" className="w-4 h-4" />
                <span>Recargar / Reload</span>
              </button>
              
              <button
                type="button"
                aria-label="Ir al inicio / Go home"
                onClick={() => {
                  window.location.assign('/');
                }}
                className="flex-1 bg-emerald-900/60 hover:bg-emerald-900 text-white font-bold py-3 px-4 rounded-xl border border-emerald-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home aria-hidden="true" className="w-4 h-4 text-amber-400" />
                <span>Inicio / Home</span>
              </button>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}


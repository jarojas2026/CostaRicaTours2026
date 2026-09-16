import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error captured by ErrorBoundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#041711] flex items-center justify-center p-6 text-stone-100">
          <div className="max-w-md w-full bg-[#052118] border border-emerald-500/30 rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8 animate-bounce" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold font-heading text-white">¡Ups! Algo inesperado ocurrió</h1>
              <p className="text-sm text-stone-300 leading-relaxed">
                Hemos detectado un pequeño tropiezo técnico en esta sección. No te preocupes, tus datos y reservas están seguros con nosotros.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-[#03140e] p-3 rounded-xl border border-emerald-500/20 text-left text-xs font-mono text-amber-300/80 overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recargar Pantalla</span>
              </button>
              
              <button
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.href = '/';
                }}
                className="flex-1 bg-emerald-900/60 hover:bg-emerald-900 text-white font-bold py-3 px-4 rounded-xl border border-emerald-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4 text-amber-400" />
                <span>Ir al Inicio</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

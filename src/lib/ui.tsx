import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, XCircle, X, AlertTriangle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Toast notifications — replaces window.alert() across the app.
// ---------------------------------------------------------------------------

type ToastType = 'success' | 'error';
interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

let toastIdCounter = 0;

const ToastContext = createContext<(message: string, type?: ToastType) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="fixed top-4 right-4 left-4 sm:left-auto z-[200] flex flex-col gap-2 sm:w-full sm:max-w-sm pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border p-3.5 shadow-xl bg-white ${
              t.type === 'success' ? 'border-emerald-200' : 'border-red-200'
            }`}
          >
            {t.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            )}
            <p className="text-sm font-medium text-slate-800 flex-1 leading-snug">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer flex-shrink-0"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Confirm dialog — replaces window.confirm() across the app.
// ---------------------------------------------------------------------------

interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  message: string;
  resolve: (value: boolean) => void;
}

const ConfirmContext = createContext<(message: string, options?: ConfirmOptions) => Promise<boolean>>(
  async () => false
);

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirmFn = useCallback((message: string, options: ConfirmOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      setState({ message, resolve, ...options });
    });
  }, []);

  const handleClose = (result: boolean) => {
    state?.resolve(result);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirmFn}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4"
          onClick={() => handleClose(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  state.danger ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-600'
                }`}
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">{state.title || 'Confirmar ação'}</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{state.message}</p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => handleClose(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer transition"
              >
                {state.cancelLabel || 'Cancelar'}
              </button>
              <button
                onClick={() => handleClose(true)}
                className={`px-4 py-2 rounded-xl text-sm font-bold text-white cursor-pointer transition ${
                  state.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {state.confirmLabel || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

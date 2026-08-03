import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, XCircle, X, AlertTriangle } from 'lucide-react';
import { useEscapeKey } from '../hooks/useEscapeKey';

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
            className={`pointer-events-auto flex items-start gap-2.5 rounded-lg border-l-4 border-y border-r border-y-ink/10 border-r-ink/10 p-3.5 shadow-xl bg-card ${
              t.type === 'success' ? 'border-l-ok' : 'border-l-bad'
            }`}
          >
            {t.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-ok flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 text-bad flex-shrink-0 mt-0.5" />
            )}
            <p className="text-sm font-medium text-ink flex-1 leading-snug">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-ink-dim hover:text-ink cursor-pointer flex-shrink-0"
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

  useEscapeKey(() => handleClose(false), !!state);

  return (
    <ConfirmContext.Provider value={confirmFn}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-ink/50 p-4"
          onClick={() => handleClose(false)}
        >
          <div
            className="bg-card rounded-[20px_8px_20px_8px] shadow-xl p-6 w-full max-w-sm space-y-4 border border-ink/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  state.danger ? 'bg-bad/10 text-bad' : 'bg-brass-soft text-brass'
                }`}
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-ink text-sm font-display">{state.title || 'Confirmar ação'}</h3>
            </div>
            <p className="text-sm text-ink-dim leading-relaxed">{state.message}</p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => handleClose(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-ink-dim hover:bg-paper cursor-pointer transition"
              >
                {state.cancelLabel || 'Cancelar'}
              </button>
              <button
                onClick={() => handleClose(true)}
                className={`px-4 py-2 rounded-lg text-sm font-bold text-white cursor-pointer transition ${
                  state.danger ? 'bg-bad hover:opacity-90' : 'bg-brand-primary hover:opacity-90'
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

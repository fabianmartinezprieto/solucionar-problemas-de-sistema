import React from 'react';
import { LogOut, Wrench } from 'lucide-react';

interface MaintenanceViewProps {
  message: string;
  isLoggedIn: boolean;
  onLogout: () => void;
  onOpenLogin: () => void;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  message,
  isLoggedIn,
  onLogout,
  onOpenLogin,
}) => {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-slate-50 border border-slate-200 rounded-2xl p-8 sm:p-10 text-center space-y-5">
        <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
          <Wrench className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Plataforma en mantenimiento
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
        </div>

        <div className="pt-2 flex justify-center">
          {isLoggedIn ? (
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenLogin}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-sm font-medium transition"
            >
              Iniciar sesión
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

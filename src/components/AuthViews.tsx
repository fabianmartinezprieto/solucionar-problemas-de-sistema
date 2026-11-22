import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Phone,
  ShieldCheck,
  User,
} from 'lucide-react';
import {
  loginApi,
  recoverResetApi,
  recoverVerifyApi,
  registerApi,
  setStoredToken,
} from '../api';
import type { UserAccount } from '../types';

type AuthMode = 'login' | 'register' | 'pending_notice' | 'recover';

interface AuthViewsProps {
  onAuthenticated: (user: UserAccount) => void;
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
  maintenanceBanner?: string | null;
}

export const AuthViews: React.FC<AuthViewsProps> = ({
  onAuthenticated,
  onNotify,
  maintenanceBanner,
}) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);

  // Login state
  const [loginName, setLoginName] = useState('');
  const [loginSurname, setLoginSurname] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register state
  const [regName, setRegName] = useState('');
  const [regSurname, setRegSurname] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [regError, setRegError] = useState('');

  // Recovery state
  const [recStep, setRecStep] = useState<1 | 2>(1);
  const [recPhone, setRecPhone] = useState('');
  const [recFullName, setRecFullName] = useState('');
  const [recPass, setRecPass] = useState('');
  const [recConfirm, setRecConfirm] = useState('');
  const [showRecPass, setShowRecPass] = useState(false);
  const [showRecConfirm, setShowRecConfirm] = useState(false);
  const [recError, setRecError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    try {
      const res = await loginApi({
        name: loginName,
        surname: loginSurname,
        password: loginPassword,
      });
      if (!res?.token || !res?.user) {
        throw new Error('No se recibieron los datos de la sesión del servidor.');
      }
      setStoredToken(res.token);
      onAuthenticated(res.user);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo iniciar sesión.';
      setLoginError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (regPassword.length < 6) {
      setRegError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (regPassword !== regConfirm) {
      setRegError('Las contraseñas ingresadas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      await registerApi({
        name: regName,
        surname: regSurname,
        phone: regPhone,
        password: regPassword,
        confirmPassword: regConfirm,
      });
      setRegName('');
      setRegSurname('');
      setRegPhone('');
      setRegPassword('');
      setRegConfirm('');
      setMode('pending_notice');
    } catch (err) {
      setRegError(err instanceof Error ? err.message : 'No se pudo completar el registro.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecError('');
    setLoading(true);
    try {
      const res = await recoverVerifyApi(recPhone);
      setRecFullName(res.fullName);
      setRecStep(2);
    } catch (err) {
      setRecError(err instanceof Error ? err.message : 'No se pudo verificar el teléfono.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecError('');
    if (recPass.length < 6) {
      setRecError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (recPass !== recConfirm) {
      setRecError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      await recoverResetApi({
        phone: recPhone,
        newPassword: recPass,
        confirmPassword: recConfirm,
      });
      onNotify('Contraseña actualizada correctamente. Ya puedes iniciar sesión.', 'success');
      setRecStep(1);
      setRecPhone('');
      setRecPass('');
      setRecConfirm('');
      setMode('login');
    } catch (err) {
      setRecError(err instanceof Error ? err.message : 'Error al actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const regLengthOk = regPassword.length >= 6;
  const regMatchOk = regPassword.length > 0 && regPassword === regConfirm;
  const recLengthOk = recPass.length >= 6;
  const recMatchOk = recPass.length > 0 && recPass === recConfirm;

  return (
    <div className="min-h-screen bg-white grid grid-cols-1 lg:grid-cols-12">
      {/* Left Minimalist Editorial Panel */}
      <aside className="lg:col-span-5 bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 p-8 sm:p-12 lg:p-16 flex flex-col justify-between">
        <div>
          <div className="text-lg font-bold tracking-tight text-slate-900">
            Solucionar problemas de sistema
          </div>
          <div className="mt-12 lg:mt-20 max-w-md">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 leading-tight text-balance">
              Soporte técnico estructurado paso a paso.
            </h1>
            <p className="mt-4 text-base text-slate-600 leading-relaxed">
              Accede a guías visuales, videotutoriales verificados y procedimientos claros para
              resolver fallos de Windows, Office, redes y aplicaciones.
            </p>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-slate-200 space-y-3 text-sm text-slate-600">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Cuentas verificadas por un administrador antes del acceso</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Instrucciones paso a paso con imágenes y video</span>
          </div>
        </div>
      </aside>

      {/* Right Clean White Authentication Workspace */}
      <main className="lg:col-span-7 bg-white flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {maintenanceBanner && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
              <div className="font-semibold">Plataforma en mantenimiento</div>
              <p className="mt-1 text-amber-800">{maintenanceBanner}</p>
            </div>
          )}

          {mode === 'login' && (
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Iniciar sesión
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">
                Ingresa tus datos personales para acceder a la biblioteca de soluciones.
              </p>

              {loginError && (
                <div className="mt-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {loginError}
                </div>
              )}

              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="login-name"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Nombre
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="login-name"
                      type="text"
                      required
                      value={loginName}
                      onChange={(e) => setLoginName(e.target.value)}
                      placeholder="Ingresa tu nombre"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="login-surname"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Apellido
                  </label>
                  <input
                    id="login-surname"
                    type="text"
                    required={!loginName.trim().includes(' ')}
                    value={loginSurname}
                    onChange={(e) => setLoginSurname(e.target.value)}
                    placeholder="Ingresa tu apellido"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="login-password"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Contraseña
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setRecError('');
                        setRecStep(1);
                        setMode('recover');
                      }}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="login-password"
                      type={showLoginPass ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Ingresa tu contraseña"
                      className="w-full pl-10 pr-11 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPass((v) => !v)}
                      aria-label={showLoginPass ? 'Ocultar contraseña' : 'Ver contraseña'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                    >
                      {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-medium transition cursor-pointer"
                >
                  {loading ? 'Verificando...' : 'Iniciar sesión'}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between text-sm">
                <span className="text-slate-600">¿Aún no tienes cuenta?</span>
                <button
                  type="button"
                  onClick={() => {
                    setRegError('');
                    setMode('register');
                  }}
                  className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Registrarse
                </button>
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 mb-6"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver al inicio de sesión
              </button>

              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Crear cuenta nueva
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">
                Completa tus datos. Un administrador validará tu registro para habilitar el acceso.
              </p>

              {regError && (
                <div className="mt-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {regError}
                </div>
              )}

              <form onSubmit={handleRegister} className="mt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Nombre
                    </label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Tu nombre"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Apellido
                    </label>
                    <input
                      type="text"
                      required
                      value={regSurname}
                      onChange={(e) => setRegSurname(e.target.value)}
                      placeholder="Tu apellido"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Número de teléfono
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="Ej. 0981123456"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm tabular-nums focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPass ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full pl-3.5 pr-11 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPass((v) => !v)}
                      aria-label={showRegPass ? 'Ocultar contraseña' : 'Ver contraseña'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                    >
                      {showRegPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div
                    className={`mt-1.5 text-xs ${
                      regLengthOk ? 'text-emerald-700' : 'text-slate-500'
                    }`}
                  >
                    {regLengthOk ? 'Longitud válida (6+ caracteres)' : 'Debe tener al menos 6 caracteres'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showRegConfirm ? 'text' : 'password'}
                      required
                      value={regConfirm}
                      onChange={(e) => setRegConfirm(e.target.value)}
                      placeholder="Repite tu contraseña"
                      className="w-full pl-3.5 pr-11 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirm((v) => !v)}
                      aria-label={showRegConfirm ? 'Ocultar confirmación' : 'Ver confirmación'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                    >
                      {showRegConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {regConfirm.length > 0 && (
                    <div
                      className={`mt-1.5 text-xs ${
                        regMatchOk ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {regMatchOk ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium transition cursor-pointer"
                >
                  {loading ? 'Enviando registro...' : 'Registrarse'}
                </button>
              </form>
            </div>
          )}

          {mode === 'pending_notice' && (
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900">
                Solicitud de registro recibida
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Tu cuenta fue creada correctamente y quedó pendiente de validación por un
                administrador. Una vez aprobada, podrás iniciar sesión con tu nombre, apellido y
                contraseña.
              </p>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition"
              >
                Volver al inicio de sesión
              </button>
            </div>
          )}

          {mode === 'recover' && (
            <div>
              <button
                type="button"
                onClick={() => {
                  setRecStep(1);
                  setMode('login');
                }}
                className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 mb-6"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver al inicio de sesión
              </button>

              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Recuperar contraseña
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">
                {recStep === 1
                  ? 'Ingresa el número de teléfono asociado a tu cuenta para verificar tu identidad.'
                  : `Cuenta verificada (${recFullName}). Define y confirma tu nueva contraseña.`}
              </p>

              {recError && (
                <div className="mt-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {recError}
                </div>
              )}

              {recStep === 1 ? (
                <form onSubmit={handleVerifyPhone} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Número de teléfono registrado
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="tel"
                        required
                        value={recPhone}
                        onChange={(e) => setRecPhone(e.target.value)}
                        placeholder="Ej. 0981123456"
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm tabular-nums focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-medium transition"
                  >
                    {loading ? 'Verificando...' : 'Verificar teléfono'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Nueva contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showRecPass ? 'text' : 'password'}
                        required
                        value={recPass}
                        onChange={(e) => setRecPass(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full pl-3.5 pr-11 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRecPass((v) => !v)}
                        aria-label={showRecPass ? 'Ocultar contraseña' : 'Ver contraseña'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                      >
                        {showRecPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div
                      className={`mt-1.5 text-xs ${
                        recLengthOk ? 'text-emerald-700' : 'text-slate-500'
                      }`}
                    >
                      {recLengthOk
                        ? 'Contraseña válida (6+ caracteres)'
                        : 'Ingresa al menos 6 caracteres'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Confirmar nueva contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showRecConfirm ? 'text' : 'password'}
                        required
                        value={recConfirm}
                        onChange={(e) => setRecConfirm(e.target.value)}
                        placeholder="Repite la nueva contraseña"
                        className="w-full pl-3.5 pr-11 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRecConfirm((v) => !v)}
                        aria-label={showRecConfirm ? 'Ocultar confirmación' : 'Ver confirmación'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                      >
                        {showRecConfirm ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {recConfirm.length > 0 && (
                      <div
                        className={`mt-1.5 text-xs ${
                          recMatchOk ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {recMatchOk
                          ? 'Confirmación correcta'
                          : 'Las contraseñas no coinciden'}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium transition"
                  >
                    {loading ? 'Guardando...' : 'Confirmar nueva contraseña'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

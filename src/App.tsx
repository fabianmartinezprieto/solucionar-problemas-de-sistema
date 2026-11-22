import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  LogOut,
  Menu,
  RefreshCw,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  API_BASE_URL,
  fetchBootstrap,
  fetchPublicStatus,
  getStoredToken,
  markNotificationReadApi,
  setStoredToken,
  updateTutorialVisibilityApi,
} from './api';
import { AuthViews } from './components/AuthViews';
import { MaintenanceView } from './components/MaintenanceView';
import { NotificationsView } from './components/NotificationsView';
import { OfflineIndicator, PWAInstallButton } from './components/PWAControls';
import { SolutionLibrary } from './components/SolutionLibrary';
import { TutorialDetail } from './components/TutorialDetail';

const CreatorPanel = lazy(() =>
  import('./components/CreatorPanel').then((m) => ({ default: m.CreatorPanel }))
);
const TutorialEditor = lazy(() =>
  import('./components/TutorialEditor').then((m) => ({ default: m.TutorialEditor }))
);
import type {
  AuditLog,
  PlatformSettings,
  Tutorial,
  UserAccount,
  VideoNotification,
} from './types';

type AppTab = 'library' | 'notifications' | 'detail' | 'editor' | 'creator';

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [settings, setSettings] = useState<PlatformSettings>({
    maintenanceMode: false,
    maintenanceMessage:
      'La plataforma está temporalmente fuera de servicio por mantenimiento técnico.',
    allowAdminsDuringMaintenance: true,
    realtimeAlertsEnabled: true,
    activeAlert: null,
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [notifications, setNotifications] = useState<VideoNotification[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const [tab, setTab] = useState<AppTab>('library');
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [editingTutorial, setEditingTutorial] = useState<Tutorial | null>(null);
  const [showLoginDuringMaintenance, setShowLoginDuringMaintenance] = useState(false);
  const [dismissedAlertId, setDismissedAlertId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const wsConnectedRef = useRef(false);

  const notify = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  // Native Capacitor Android initialization (safe no-op on Web)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    void (async () => {
      try {
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#FFFFFF' });
      } catch {
        // Ignore on unsupported devices
      }
      try {
        await SplashScreen.hide();
      } catch {
        // Ignore
      }
    })();
  }, []);

  const loadAuthenticatedState = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      try {
        const pub = await fetchPublicStatus();
        setConnectionError(null);
        setSettings((prev) => ({
          ...prev,
          maintenanceMode: pub.maintenanceMode,
          maintenanceMessage: pub.maintenanceMessage,
          allowAdminsDuringMaintenance: pub.allowAdminsDuringMaintenance,
          realtimeAlertsEnabled: pub.realtimeAlertsEnabled,
          activeAlert: pub.activeAlert,
        }));
        setCurrentUser(null);
      } catch (err) {
        setConnectionError(
          err instanceof Error
            ? err.message
            : 'No se pudo establecer conexión con el servidor.'
        );
      } finally {
        setBooting(false);
      }
      return;
    }

    try {
      const data = await fetchBootstrap();
      setConnectionError(null);
      setCurrentUser(data.user);
      setSettings(data.settings);
      setCategories(data.categories);
      setTutorials(data.tutorials);
      setNotifications(data.notifications);
      setUsers(data.users || []);
      setLogs(data.logs || []);
      setShowLoginDuringMaintenance(false);
    } catch (err) {
      const typedErr = err as Error & {
        status?: number;
        code?: string;
        isNetworkError?: boolean;
      };
      if (typedErr.isNetworkError) {
        setConnectionError(typedErr.message);
      } else if (typedErr.status === 503 && typedErr.code === 'MAINTENANCE') {
        try {
          const pub = await fetchPublicStatus();
          setSettings((prev) => ({
            ...prev,
            maintenanceMode: pub.maintenanceMode,
            maintenanceMessage: pub.maintenanceMessage,
            allowAdminsDuringMaintenance: pub.allowAdminsDuringMaintenance,
          }));
        } catch {
          // ignore
        }
      } else {
        setStoredToken(null);
        setCurrentUser(null);
      }
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    void loadAuthenticatedState();
  }, [loadAuthenticatedState]);

  // Dual Real-Time Transport: WebSocket (Node) + Smart Polling Fallback (Vercel Serverless / Android)
  useEffect(() => {
    let active = true;
    let reconnectTimer: number | undefined;

    const getWsUrl = () => {
      const token = getStoredToken() || '';
      if (API_BASE_URL && /^https?:\/\//i.test(API_BASE_URL)) {
        const parsed = new URL(API_BASE_URL);
        const wsProto = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${wsProto}//${parsed.host}/ws?token=${encodeURIComponent(token)}`;
      }
      const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProto}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
    };

    const connect = () => {
      if (!active) return;
      try {
        const ws = new WebSocket(getWsUrl());
        wsRef.current = ws;

        ws.onopen = () => {
          wsConnectedRef.current = true;
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data) as { type: string; payload: any };
            switch (msg.type) {
              case 'maintenance:updated': {
                setSettings((prev) => ({
                  ...prev,
                  maintenanceMode: Boolean(msg.payload.maintenanceMode),
                  maintenanceMessage: msg.payload.maintenanceMessage || prev.maintenanceMessage,
                  allowAdminsDuringMaintenance: Boolean(
                    msg.payload.allowAdminsDuringMaintenance
                  ),
                }));
                void loadAuthenticatedState();
                break;
              }
              case 'alert:updated': {
                setDismissedAlertId(null);
                setSettings((prev) => ({
                  ...prev,
                  realtimeAlertsEnabled: Boolean(msg.payload.realtimeAlertsEnabled),
                  activeAlert: msg.payload.activeAlert || null,
                }));
                if (msg.payload.activeAlert && msg.payload.realtimeAlertsEnabled) {
                  notify(msg.payload.activeAlert.title, 'info');
                }
                break;
              }
              case 'tutorials:updated':
              case 'categories:updated':
              case 'notifications:updated':
              case 'creator:sync': {
                if (getStoredToken()) {
                  void loadAuthenticatedState();
                }
                break;
              }
              case 'notification:new': {
                const incoming = msg.payload as VideoNotification;
                setNotifications((prev) =>
                  prev.some((n) => n.id === incoming.id) ? prev : [incoming, ...prev]
                );
                notify(`Nueva notificación: ${incoming.title}`, 'info');
                break;
              }
              case 'user:updated': {
                setCurrentUser(msg.payload as UserAccount);
                void loadAuthenticatedState();
                break;
              }
              case 'user:status': {
                if (msg.payload.status !== 'ACTIVE') {
                  setStoredToken(null);
                  setCurrentUser(null);
                  notify(msg.payload.message || 'Tu acceso fue restringido.', 'error');
                }
                break;
              }
            }
          } catch {
            // Ignore malformed WS messages
          }
        };

        ws.onclose = () => {
          wsConnectedRef.current = false;
          if (active) {
            reconnectTimer = window.setTimeout(connect, 10000);
          }
        };

        ws.onerror = () => {
          wsConnectedRef.current = false;
        };
      } catch {
        wsConnectedRef.current = false;
      }
    };

    connect();

    // Background polling fallback when WebSocket is unavailable (e.g. Vercel Serverless)
    const pollId = window.setInterval(() => {
      if (!active || wsConnectedRef.current || document.visibilityState === 'hidden') return;
      void loadAuthenticatedState();
    }, 6000);

    const onVisibilityOrOnline = () => {
      if (document.visibilityState === 'visible') {
        void loadAuthenticatedState();
      }
    };
    window.addEventListener('online', onVisibilityOrOnline);
    document.addEventListener('visibilitychange', onVisibilityOrOnline);

    return () => {
      active = false;
      wsConnectedRef.current = false;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      window.clearInterval(pollId);
      window.removeEventListener('online', onVisibilityOrOnline);
      document.removeEventListener('visibilitychange', onVisibilityOrOnline);
      wsRef.current?.close();
    };
  }, [currentUser?.id, loadAuthenticatedState, notify]);

  const handleAuthenticated = async (user?: UserAccount) => {
    if (!user) {
      await loadAuthenticatedState();
      return;
    }
    setCurrentUser(user);
    setTab('library');
    setMobileMenuOpen(false);
    await loadAuthenticatedState();
    notify(`Bienvenido, ${user.name || 'usuario'}`, 'success');
  };

  const handleLogout = () => {
    setStoredToken(null);
    setCurrentUser(null);
    setUsers([]);
    setLogs([]);
    setTutorials([]);
    setNotifications([]);
    setSelectedTutorial(null);
    setEditingTutorial(null);
    setMobileMenuOpen(false);
    setTab('library');
    notify('Sesión cerrada correctamente.', 'info');
  };

  const handleToggleTutorialVisibility = async (tut: Tutorial) => {
    try {
      const nextStatus = tut.status === 'VISIBLE' ? 'HIDDEN' : 'VISIBLE';
      await updateTutorialVisibilityApi(tut.id, { status: nextStatus });
      await loadAuthenticatedState();
      notify(
        `Tutorial ${nextStatus === 'VISIBLE' ? 'visible nuevamente' : 'ocultado'}.`,
        'info'
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Error al actualizar visibilidad.', 'error');
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    if (!currentUser) return;
    try {
      await markNotificationReadApi(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id && !n.readByUserIds.includes(currentUser.id)
            ? { ...n, readByUserIds: [...n.readByUserIds, currentUser.id] }
            : n
        )
      );
    } catch {
      // ignore
    }
  };

  const canBypassMaintenance =
    currentUser &&
    (currentUser.role === 'CREATOR' ||
      (currentUser.role === 'HELPER' &&
        settings.allowAdminsDuringMaintenance &&
        currentUser.permissions?.canAccessMaintenance));

  const unreadCount = currentUser
    ? notifications.filter((n) => !n.readByUserIds.includes(currentUser.id)).length
    : 0;

  const canCreateTutorial =
    currentUser &&
    (currentUser.role === 'CREATOR' ||
      (currentUser.role === 'HELPER' && currentUser.permissions?.canCreateTutorials));

  const isCreator = currentUser?.role === 'CREATOR';

  const navigateTo = (nextTab: AppTab) => {
    setSelectedTutorial(null);
    setEditingTutorial(null);
    setTab(nextTab);
    setMobileMenuOpen(false);
  };

  const renderConnectionBanner = () =>
    connectionError ? (
      <div className="bg-red-50 border-b border-red-200 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-red-800">
          <span>{connectionError}</span>
          <button
            type="button"
            onClick={() => void loadAuthenticatedState()}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-red-700 hover:bg-red-800 text-white text-xs font-medium cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reintentar conexión
          </button>
        </div>
      </div>
    ) : null;

  const renderToastStack = () => (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto bg-white border border-slate-200 shadow-lg rounded-xl p-3.5 flex items-start gap-2.5 text-sm text-slate-800"
        >
          {t.type === 'success' && (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          )}
          {t.type === 'error' && (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          )}
          {t.type === 'info' && <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
          <span className="flex-1 leading-snug">{t.message}</span>
          <button
            type="button"
            onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );

  if (booting) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-sm text-slate-500">Cargando plataforma...</div>
      </div>
    );
  }

  // Maintenance gate
  if (settings.maintenanceMode && !canBypassMaintenance) {
    if (!currentUser && showLoginDuringMaintenance) {
      return (
        <>
          {renderConnectionBanner()}
          <AuthViews
            onAuthenticated={handleAuthenticated}
            onNotify={notify}
            maintenanceBanner={settings.maintenanceMessage}
          />
          <OfflineIndicator />
          {renderToastStack()}
        </>
      );
    }

    return (
      <>
        {renderConnectionBanner()}
        <MaintenanceView
          message={settings.maintenanceMessage}
          isLoggedIn={Boolean(currentUser)}
          onLogout={handleLogout}
          onOpenLogin={() => setShowLoginDuringMaintenance(true)}
        />
        <OfflineIndicator />
        {renderToastStack()}
      </>
    );
  }

  // Unauthenticated gate
  if (!currentUser) {
    return (
      <>
        {renderConnectionBanner()}
        <AuthViews onAuthenticated={handleAuthenticated} onNotify={notify} />
        <OfflineIndicator />
        {renderToastStack()}
      </>
    );
  }

  const activeAlert =
    settings.realtimeAlertsEnabled &&
    settings.activeAlert &&
    settings.activeAlert.id !== dismissedAlertId
      ? settings.activeAlert
      : null;

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      {renderConnectionBanner()}

      {/* Responsive Clean Top Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200 pt-[env(safe-area-inset-top)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4 md:gap-8">
          {/* Zone 1: Brand wordmark */}
          <button
            type="button"
            onClick={() => navigateTo('library')}
            className="text-base sm:text-lg font-semibold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Solucionar problemas
          </button>

          {/* Zone 2: Desktop / Tablet single-line navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => navigateTo('library')}
              className={`whitespace-nowrap shrink-0 py-1 transition cursor-pointer ${
                tab === 'library' || tab === 'detail'
                  ? 'text-blue-600 underline underline-offset-8 decoration-2'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Biblioteca
            </button>

            <button
              type="button"
              onClick={() => navigateTo('notifications')}
              className={`whitespace-nowrap shrink-0 py-1 transition cursor-pointer tabular-nums ${
                tab === 'notifications'
                  ? 'text-blue-600 underline underline-offset-8 decoration-2'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Notificaciones{unreadCount > 0 ? ` (${unreadCount})` : ''}
            </button>

            {canCreateTutorial && (
              <button
                type="button"
                onClick={() => navigateTo('editor')}
                className={`whitespace-nowrap shrink-0 py-1 transition cursor-pointer ${
                  tab === 'editor'
                    ? 'text-blue-600 underline underline-offset-8 decoration-2'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Nuevo tutorial
              </button>
            )}

            {isCreator && (
              <button
                type="button"
                onClick={() => navigateTo('creator')}
                className={`whitespace-nowrap shrink-0 py-1 transition cursor-pointer ${
                  tab === 'creator'
                    ? 'text-blue-600 underline underline-offset-8 decoration-2'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Administración
              </button>
            )}
          </nav>

          {/* Zone 3: Account + PWA Install + Sign Out + Mobile Menu Button */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden sm:block">
              <PWAInstallButton />
            </div>

            <span className="hidden lg:inline text-sm text-slate-600 whitespace-nowrap max-w-[170px] truncate">
              {currentUser.name} {currentUser.surname}
            </span>

            <button
              type="button"
              onClick={handleLogout}
              className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Salir
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Clean Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2">
            <div className="pb-2 mb-2 border-b border-slate-100 text-xs text-slate-500">
              Sesión activa: <span className="font-medium text-slate-900">{currentUser.name} {currentUser.surname}</span>
            </div>

            <button
              type="button"
              onClick={() => navigateTo('library')}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                tab === 'library' || tab === 'detail'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Biblioteca
            </button>

            <button
              type="button"
              onClick={() => navigateTo('notifications')}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium tabular-nums ${
                tab === 'notifications'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Notificaciones{unreadCount > 0 ? ` (${unreadCount})` : ''}
            </button>

            {canCreateTutorial && (
              <button
                type="button"
                onClick={() => navigateTo('editor')}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                  tab === 'editor'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Nuevo tutorial
              </button>
            )}

            {isCreator && (
              <button
                type="button"
                onClick={() => navigateTo('creator')}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                  tab === 'creator'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Administración
              </button>
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <PWAInstallButton />
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 ml-auto"
              >
                <LogOut className="w-3.5 h-3.5" />
                Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Real-Time Live Alert Banner */}
      {activeAlert && (
        <div
          className={`border-b ${
            activeAlert.severity === 'urgent'
              ? 'bg-red-50 border-red-200 text-red-900'
              : activeAlert.severity === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-start justify-between gap-4 text-sm">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">{activeAlert.title}</span>
                <span className="mx-2 opacity-60">·</span>
                <span>{activeAlert.message}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDismissedAlertId(activeAlert.id)}
              aria-label="Cerrar alerta"
              className="p-1 opacity-70 hover:opacity-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-10">
        {tab === 'library' && (
          <SolutionLibrary
            tutorials={tutorials}
            categories={categories}
            currentUser={currentUser}
            onSelectTutorial={(tut) => {
              setSelectedTutorial(tut);
              setTab('detail');
            }}
            onEditTutorial={(tut) => {
              setEditingTutorial(tut);
              setTab('editor');
            }}
            onToggleVisibility={handleToggleTutorialVisibility}
          />
        )}

        {tab === 'detail' && selectedTutorial && (
          <TutorialDetail
            tutorial={selectedTutorial}
            currentUser={currentUser}
            onBack={() => {
              setSelectedTutorial(null);
              setTab('library');
            }}
            onEdit={(tut) => {
              setEditingTutorial(tut);
              setTab('editor');
            }}
          />
        )}

        {tab === 'notifications' && (
          <NotificationsView
            notifications={notifications}
            tutorials={tutorials}
            currentUser={currentUser}
            onMarkRead={handleMarkNotificationRead}
            onOpenTutorial={(tut) => {
              setSelectedTutorial(tut);
              setTab('detail');
            }}
          />
        )}

        {tab === 'editor' && canCreateTutorial && (
          <Suspense fallback={<div className="py-12 text-center text-sm text-slate-500">Cargando editor...</div>}>
            <TutorialEditor
              existingTutorial={editingTutorial}
              categories={categories}
              allUsers={users}
              currentUser={currentUser}
              onCancel={() => {
                setEditingTutorial(null);
                setTab('library');
              }}
              onSaved={async () => {
                setEditingTutorial(null);
                await loadAuthenticatedState();
                setTab('library');
              }}
              onNotify={notify}
            />
          </Suspense>
        )}

        {tab === 'creator' && isCreator && (
          <Suspense fallback={<div className="py-12 text-center text-sm text-slate-500">Cargando panel...</div>}>
            <CreatorPanel
              users={users}
              tutorials={tutorials}
              categories={categories}
              notifications={notifications}
              logs={logs}
              settings={settings}
              onRefresh={loadAuthenticatedState}
              onEditTutorial={(tut) => {
                setEditingTutorial(tut);
                setTab('editor');
              }}
              onNewTutorial={() => {
                setEditingTutorial(null);
                setTab('editor');
              }}
              onNotify={notify}
            />
          </Suspense>
        )}
      </main>

      {/* Quiet Minimalist Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 px-4 sm:px-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>Solucionar problemas de sistema</span>
          <span>Plataforma de soporte técnico</span>
        </div>
      </footer>

      <OfflineIndicator />
      {renderToastStack()}
    </div>
  );
}

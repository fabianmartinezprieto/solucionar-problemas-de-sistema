import React, { useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  Flag,
  FolderPlus,
  Lock,
  Pencil,
  Plus,
  Search,
  Send,
  ShieldAlert,
  Trash2,
  Upload,
  UserCheck,
  Users,
  Wrench,
} from 'lucide-react';
import {
  addCategoryApi,
  deleteCategoryApi,
  deleteNotificationApi,
  deleteTutorialApi,
  deleteUserApi,
  exportBackupApi,
  importBackupApi,
  sendNotificationApi,
  updateAlertsSettingsApi,
  updateMaintenanceSettingsApi,
  updateTutorialVisibilityApi,
  updateUserRoleApi,
  updateUserStatusApi,
  uploadMediaFile,
} from '../api';
import type {
  AlertSeverity,
  AuditLog,
  PlatformSettings,
  Tutorial,
  UserAccount,
  UserPermissions,
  UserRole,
  UserStatus,
  VideoNotification,
} from '../types';

type CreatorTab =
  | 'users'
  | 'tutorials'
  | 'alerts'
  | 'categories'
  | 'maintenance'
  | 'logs';

interface CreatorPanelProps {
  users: UserAccount[];
  tutorials: Tutorial[];
  categories: string[];
  notifications: VideoNotification[];
  logs: AuditLog[];
  settings: PlatformSettings;
  onRefresh: () => Promise<void>;
  onEditTutorial: (tutorial: Tutorial) => void;
  onNewTutorial: () => void;
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const CreatorPanel: React.FC<CreatorPanelProps> = ({
  users,
  tutorials,
  categories,
  notifications,
  logs,
  settings,
  onRefresh,
  onEditTutorial,
  onNewTutorial,
  onNotify,
}) => {
  const [tab, setTab] = useState<CreatorTab>('users');

  // Users tab state
  const [userSearch, setUserSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | UserStatus>('ALL');
  const [reportTarget, setReportTarget] = useState<UserAccount | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<UserAccount | null>(null);

  // Tutorials audience modal
  const [audienceTarget, setAudienceTarget] = useState<Tutorial | null>(null);
  const [audienceScope, setAudienceScope] = useState<'ALL' | 'SELECTED'>('ALL');
  const [audienceUserIds, setAudienceUserIds] = useState<string[]>([]);
  const [confirmDeleteTutorial, setConfirmDeleteTutorial] = useState<Tutorial | null>(null);

  // Real-time alert composer
  const [alertTitle, setAlertTitle] = useState(settings.activeAlert?.title || '');
  const [alertMessage, setAlertMessage] = useState(settings.activeAlert?.message || '');
  const [alertSeverity, setAlertSeverity] = useState<AlertSeverity>(
    settings.activeAlert?.severity || 'info'
  );

  // Video notification composer
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifTutorialId, setNotifTutorialId] = useState('');
  const [notifVideoUrl, setNotifVideoUrl] = useState('');
  const [notifScope, setNotifScope] = useState<'ALL' | 'SELECTED'>('ALL');
  const [notifUserIds, setNotifUserIds] = useState<string[]>([]);
  const [uploadingNotifVideo, setUploadingNotifVideo] = useState(false);

  // Categories
  const [newCategoryName, setNewCategoryName] = useState('');

  // Maintenance settings
  const [maintMessage, setMaintMessage] = useState(settings.maintenanceMessage);

  const nonCreatorUsers = users.filter((u) => u.role !== 'CREATOR');
  const pendingCount = nonCreatorUsers.filter((u) => u.status === 'PENDING').length;

  const filteredUsers = users.filter((u) => {
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
    const q = userSearch.trim().toLowerCase();
    const matchesQuery =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.surname.toLowerCase().includes(q) ||
      u.phone.includes(q);
    return matchesStatus && matchesQuery;
  });

  const handleStatusChange = async (user: UserAccount, status: UserStatus, reason?: string) => {
    try {
      await updateUserStatusApi(user.id, status, reason);
      const labels: Record<UserStatus, string> = {
        ACTIVE: 'Cuenta validada y activada',
        PENDING: 'Cuenta marcada como pendiente',
        SUSPENDED: 'Cuenta suspendida',
        BLOCKED: 'Cuenta bloqueada',
        REPORTED: 'Cuenta reportada',
      };
      onNotify(`${labels[status]}: ${user.name} ${user.surname}`, 'success');
      await onRefresh();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Error al actualizar estado.', 'error');
    }
  };

  const handleRoleChange = async (
    user: UserAccount,
    role: UserRole,
    permissions?: Partial<UserPermissions>
  ) => {
    try {
      await updateUserRoleApi(user.id, role, permissions);
      onNotify('Rol y permisos actualizados.', 'success');
      await onRefresh();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Error al actualizar permisos.', 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!confirmDeleteUser) return;
    try {
      await deleteUserApi(confirmDeleteUser.id);
      onNotify(`Usuario eliminado: ${confirmDeleteUser.name} ${confirmDeleteUser.surname}`, 'info');
      setConfirmDeleteUser(null);
      await onRefresh();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Error al eliminar usuario.', 'error');
    }
  };

  const handleToggleTutorialStatus = async (tut: Tutorial) => {
    try {
      const nextStatus = tut.status === 'VISIBLE' ? 'HIDDEN' : 'VISIBLE';
      await updateTutorialVisibilityApi(tut.id, { status: nextStatus });
      onNotify(
        `Tutorial "${tut.title}" ahora está ${nextStatus === 'VISIBLE' ? 'visible' : 'oculto'}.`,
        'info'
      );
      await onRefresh();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Error al cambiar visibilidad.', 'error');
    }
  };

  const openAudienceModal = (tut: Tutorial) => {
    setAudienceTarget(tut);
    setAudienceScope(tut.visibilityScope);
    setAudienceUserIds(tut.allowedUserIds || []);
  };

  const saveAudienceModal = async () => {
    if (!audienceTarget) return;
    if (audienceScope === 'SELECTED' && audienceUserIds.length === 0) {
      onNotify('Selecciona al menos un usuario o elige "Todos".', 'error');
      return;
    }
    try {
      await updateTutorialVisibilityApi(audienceTarget.id, {
        visibilityScope: audienceScope,
        allowedUserIds: audienceScope === 'SELECTED' ? audienceUserIds : [],
      });
      onNotify('Visibilidad por usuario actualizada.', 'success');
      setAudienceTarget(null);
      await onRefresh();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Error al guardar audiencia.', 'error');
    }
  };

  const handleDeleteTutorial = async () => {
    if (!confirmDeleteTutorial) return;
    try {
      await deleteTutorialApi(confirmDeleteTutorial.id);
      onNotify('Tutorial eliminado.', 'info');
      setConfirmDeleteTutorial(null);
      await onRefresh();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Error al eliminar tutorial.', 'error');
    }
  };

  const handleToggleAlertsEnabled = async () => {
    try {
      await updateAlertsSettingsApi({
        realtimeAlertsEnabled: !settings.realtimeAlertsEnabled,
      });
      onNotify(
        `Sistema de alertas en tiempo real ${
          !settings.realtimeAlertsEnabled ? 'activado' : 'desactivado'
        }.`,
        'info'
      );
      await onRefresh();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Error al actualizar alertas.', 'error');
    }
  };

  const handlePublishAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertTitle.trim() || !alertMessage.trim()) {
      onNotify('Completa el título y mensaje de la alerta.', 'error');
      return;
    }
    try {
      await updateAlertsSettingsApi({
        realtimeAlertsEnabled: true,
        activeAlert: {
          title: alertTitle.trim(),
          message: alertMessage.trim(),
          severity: alertSeverity,
        },
      });
      onNotify('Alerta en tiempo real publicada para todos los usuarios.', 'success');
      await onRefresh();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Error al publicar alerta.', 'error');
    }
  };

  const handleClearAlert = async () => {
    try {
      await updateAlertsSettingsApi({ clearAlert: true });
      setAlertTitle('');
      setAlertMessage('');
      onNotify('Alerta activa retirada.', 'info');
      await onRefresh();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Error al retirar alerta.', 'error');
    }
  };

  const handleUploadNotifVideo = async (file?: File | null) => {
    if (!file) return;
    setUploadingNotifVideo(true);
    try {
      const url = await uploadMediaFile(file);
      setNotifVideoUrl(url);
      onNotify('Video cargado para la notificación.', 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Error al subir video.', 'error');
    } finally {
      setUploadingNotifVideo(false);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) {
      onNotify('Ingresa título y mensaje para la notificación.', 'error');
      return;
    }
    if (notifScope === 'SELECTED' && notifUserIds.length === 0) {
      onNotify('Selecciona al menos un usuario destinatario.', 'error');
      return;
    }
    try {
      await sendNotificationApi({
        title: notifTitle.trim(),
        message: notifMessage.trim(),
        tutorialId: notifTutorialId || undefined,
        videoUrl: notifVideoUrl.trim() || undefined,
        targetScope: notifScope,
        targetUserIds: notifScope === 'SELECTED' ? notifUserIds : [],
      });
      setNotifTitle('');
      setNotifMessage('');
      setNotifTutorialId('');
      setNotifVideoUrl('');
      setNotifUserIds([]);
      onNotify('Notificación enviada en tiempo real.', 'success');
      await onRefresh();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Error al enviar notificación.', 'error');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await addCategoryApi(newCategoryName.trim());
      setNewCategoryName('');
      onNotify('Categoría agregada.', 'success');
      await onRefresh();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Error al crear categoría.', 'error');
    }
  };

  const handleDeleteCategory = async (name: string) => {
    try {
      await deleteCategoryApi(name);
      onNotify(`Categoría "${name}" eliminada.`, 'info');
      await onRefresh();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Error al eliminar categoría.', 'error');
    }
  };

  const handleToggleMaintenance = async () => {
    try {
      await updateMaintenanceSettingsApi({
        maintenanceMode: !settings.maintenanceMode,
        maintenanceMessage: maintMessage,
      });
      onNotify(
        `Modo mantenimiento ${!settings.maintenanceMode ? 'activado' : 'desactivado'}.`,
        'info'
      );
      await onRefresh();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Error al cambiar modo mantenimiento.', 'error');
    }
  };

  const handleSaveMaintenanceConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMaintenanceSettingsApi({
        maintenanceMessage: maintMessage,
      });
      onNotify('Mensaje de mantenimiento guardado.', 'success');
      await onRefresh();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Error al guardar mensaje.', 'error');
    }
  };

  const handleToggleAllowAdmins = async () => {
    try {
      await updateMaintenanceSettingsApi({
        allowAdminsDuringMaintenance: !settings.allowAdminsDuringMaintenance,
      });
      onNotify('Configuración de acceso exclusivo actualizada.', 'success');
      await onRefresh();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Error al actualizar configuración.', 'error');
    }
  };

  const handleExportBackup = async () => {
    try {
      const data = await exportBackupApi();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `respaldo_sistema_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onNotify('Copia de seguridad descargada.', 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Error al exportar respaldo.', 'error');
    }
  };

  const handleImportBackup = async (file?: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await importBackupApi(parsed);
      onNotify('Copia de seguridad restaurada correctamente.', 'success');
      await onRefresh();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Archivo de respaldo inválido.', 'error');
    }
  };

  const renderStatusLabel = (status: UserStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Activo
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700">
            <UserCheck className="w-3.5 h-3.5" />
            Pendiente
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
            <AlertTriangle className="w-3.5 h-3.5" />
            Suspendido
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700">
            <Lock className="w-3.5 h-3.5" />
            Bloqueado
          </span>
        );
      case 'REPORTED':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700">
            <Flag className="w-3.5 h-3.5" />
            Reportado
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Summary */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Panel de administración
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Control total de usuarios, validación de registros, tutoriales, alertas en tiempo real
            y mantenimiento.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleToggleMaintenance}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border transition cursor-pointer whitespace-nowrap ${
              settings.maintenanceMode
                ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Wrench className="w-4 h-4" />
            Mantenimiento: {settings.maintenanceMode ? 'Activado' : 'Desactivado'}
          </button>

          <button
            type="button"
            onClick={onNewTutorial}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Nuevo tutorial
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto">
        {(
          [
            {
              id: 'users',
              label:
                pendingCount > 0 ? `Usuarios (${pendingCount} pendientes)` : `Usuarios (${users.length})`,
            },
            { id: 'tutorials', label: `Tutoriales (${tutorials.length})` },
            { id: 'alerts', label: 'Alertas y notificaciones' },
            { id: 'categories', label: `Categorías (${categories.length})` },
            { id: 'maintenance', label: 'Mantenimiento y respaldo' },
            { id: 'logs', label: 'Auditoría' },
          ] as { id: CreatorTab; label: string }[]
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap shrink-0 cursor-pointer ${
              tab === item.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* TAB 1: USERS MANAGEMENT */}
      {tab === 'users' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Buscar por nombre, apellido o teléfono..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'ALL', label: 'Todos' },
                  { id: 'PENDING', label: `Pendientes (${pendingCount})` },
                  { id: 'ACTIVE', label: 'Activos' },
                  { id: 'SUSPENDED', label: 'Suspendidos' },
                  { id: 'BLOCKED', label: 'Bloqueados' },
                  { id: 'REPORTED', label: 'Reportados' },
                ] as { id: 'ALL' | UserStatus; label: string }[]
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    statusFilter === f.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="py-3 pr-4">Usuario</th>
                  <th className="py-3 pr-4">Teléfono</th>
                  <th className="py-3 pr-4">Estado</th>
                  <th className="py-3 pr-4">Rol y permisos</th>
                  <th className="py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-sm text-slate-500">
                      No hay usuarios que coincidan con el filtro seleccionado.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isCreator = u.role === 'CREATOR';
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 pr-4">
                          <div className="font-medium text-slate-900">
                            {u.name} {u.surname}
                          </div>
                          <div className="text-xs text-slate-500 tabular-nums">
                            Alta: {u.createdAt}
                            {u.statusReason ? ` · ${u.statusReason}` : ''}
                          </div>
                        </td>
                        <td className="py-3.5 pr-4 font-mono text-xs text-slate-600 tabular-nums">
                          {u.phone}
                        </td>
                        <td className="py-3.5 pr-4 whitespace-nowrap">
                          {renderStatusLabel(u.status)}
                        </td>
                        <td className="py-3.5 pr-4">
                          {isCreator ? (
                            <span className="text-xs font-semibold text-slate-900">
                              Administrador principal
                            </span>
                          ) : (
                            <div className="space-y-2">
                              <select
                                value={u.role}
                                onChange={(e) =>
                                  handleRoleChange(u, e.target.value as UserRole)
                                }
                                className="px-2.5 py-1 rounded-md border border-slate-300 bg-white text-xs text-slate-800"
                              >
                                <option value="USER">Usuario</option>
                                <option value="HELPER">Ayudante</option>
                              </select>

                              {u.role === 'HELPER' && (
                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                                  {(
                                    [
                                      ['canUploadMedia', 'Subir multimedia'],
                                      ['canCreateTutorials', 'Crear tutorial'],
                                      ['canEditTutorials', 'Editar/Ocultar'],
                                      ['canManageCategories', 'Categorías'],
                                      ['canAccessMaintenance', 'Acceso mantenimiento'],
                                    ] as [keyof UserPermissions, string][]
                                  ).map(([permKey, permLabel]) => (
                                    <label
                                      key={permKey}
                                      className="inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={Boolean(u.permissions?.[permKey])}
                                        onChange={(e) =>
                                          handleRoleChange(u, 'HELPER', {
                                            [permKey]: e.target.checked,
                                          })
                                        }
                                        className="rounded border-slate-300 text-blue-600"
                                      />
                                      <span>{permLabel}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 text-right whitespace-nowrap">
                          {isCreator ? (
                            <span className="text-xs text-slate-400">Protegido</span>
                          ) : (
                            <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                              {u.status !== 'ACTIVE' && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(u, 'ACTIVE')}
                                  className="px-2.5 py-1.5 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-medium cursor-pointer"
                                >
                                  {u.status === 'PENDING' ? 'Validar y activar' : 'Activar'}
                                </button>
                              )}
                              {u.status !== 'SUSPENDED' && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(u, 'SUSPENDED')}
                                  className="px-2.5 py-1.5 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-medium cursor-pointer"
                                >
                                  Suspender
                                </button>
                              )}
                              {u.status !== 'BLOCKED' && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(u, 'BLOCKED')}
                                  className="px-2.5 py-1.5 rounded-md bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-medium cursor-pointer"
                                >
                                  Bloquear
                                </button>
                              )}
                              {u.status !== 'REPORTED' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReportTarget(u);
                                    setReportReason('');
                                  }}
                                  className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium cursor-pointer"
                                >
                                  Reportar
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteUser(u)}
                                title="Eliminar usuario"
                                className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 text-slate-500 hover:text-red-700 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TUTORIALS & PER-USER VISIBILITY */}
      {tab === 'tutorials' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Control de tutoriales y audiencia
              </h2>
              <p className="text-sm text-slate-600">
                Oculta, vuelve a mostrar, edita, elimina o elige qué usuarios pueden ver cada
                tutorial.
              </p>
            </div>
            <button
              type="button"
              onClick={onNewTutorial}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Subir tutorial
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="py-3 pr-4">Título</th>
                  <th className="py-3 pr-4">Categoría</th>
                  <th className="py-3 pr-4">Estado</th>
                  <th className="py-3 pr-4">Audiencia</th>
                  <th className="py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tutorials.map((tut) => (
                  <tr key={tut.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 pr-4">
                      <div className="font-medium text-slate-900">{tut.title}</div>
                      <div className="text-xs text-slate-500 tabular-nums">
                        {tut.steps.length} pasos · {tut.createdAt}
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 text-xs text-slate-700">{tut.category}</td>
                    <td className="py-3.5 pr-4 whitespace-nowrap">
                      {tut.status === 'VISIBLE' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                          <Eye className="w-3.5 h-3.5" />
                          Visible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                          <EyeOff className="w-3.5 h-3.5" />
                          Oculto
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 pr-4 text-xs text-slate-700">
                      {tut.visibilityScope === 'ALL'
                        ? 'Todos los usuarios'
                        : `Seleccionados (${tut.allowedUserIds.length})`}
                    </td>
                    <td className="py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openAudienceModal(tut)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5" />
                          Elegir usuarios
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleTutorialStatus(tut)}
                          className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer"
                        >
                          {tut.status === 'VISIBLE' ? 'Ocultar' : 'Mostrar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditTutorial(tut)}
                          className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 cursor-pointer"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteTutorial(tut)}
                          className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 text-slate-500 hover:text-red-700 cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: REAL-TIME ALERTS & VIDEO NOTIFICATIONS */}
      {tab === 'alerts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Real-Time Alert System */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-blue-600" />
                  Sistema de alertas en tiempo real
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Mantén informados al instante a todos los usuarios conectados mediante avisos en
                  vivo.
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleAlertsEnabled}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer whitespace-nowrap ${
                  settings.realtimeAlertsEnabled
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-slate-100 border-slate-300 text-slate-700'
                }`}
              >
                {settings.realtimeAlertsEnabled ? 'Sistema activo' : 'Sistema desactivado'}
              </button>
            </div>

            <form onSubmit={handlePublishAlert} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Título de la alerta
                </label>
                <input
                  type="text"
                  value={alertTitle}
                  onChange={(e) => setAlertTitle(e.target.value)}
                  placeholder="Ej. Nuevo videotutorial disponible / Aviso importante"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Mensaje informativo
                </label>
                <textarea
                  rows={3}
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                  placeholder="Escribe el mensaje que verán los usuarios en tiempo real..."
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nivel de prioridad
                </label>
                <select
                  value={alertSeverity}
                  onChange={(e) => setAlertSeverity(e.target.value as AlertSeverity)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                >
                  <option value="info">Informativa</option>
                  <option value="warning">Advertencia</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  Publicar alerta en vivo
                </button>
                {settings.activeAlert && (
                  <button
                    type="button"
                    onClick={handleClearAlert}
                    className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 cursor-pointer"
                  >
                    Retirar alerta actual
                  </button>
                )}
              </div>
            </form>
          </section>

          {/* Video & Message Notifications */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                Enviar notificación de video o mensaje
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Envía un video o mensaje directo a todos los usuarios o solo a los que elijas.
              </p>
            </div>

            <form onSubmit={handleSendNotification} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Título</label>
                <input
                  type="text"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="Ej. Revisa este video con la solución"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mensaje</label>
                <textarea
                  rows={2}
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  placeholder="Escribe las indicaciones para el usuario..."
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Vincular un tutorial existente (opcional)
                </label>
                <select
                  value={notifTutorialId}
                  onChange={(e) => setNotifTutorialId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                >
                  <option value="">Ninguno</option>
                  {tutorials.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  O adjuntar video directo (URL o subir archivo)
                </label>
                <input
                  type="text"
                  value={notifVideoUrl}
                  onChange={(e) => setNotifVideoUrl(e.target.value)}
                  placeholder="Enlace de YouTube o sube un archivo de video..."
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900"
                />
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  {uploadingNotifVideo ? 'Subiendo video...' : 'Subir video desde dispositivo'}
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => handleUploadNotifVideo(e.target.files?.[0])}
                  />
                </label>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Destinatarios</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNotifScope('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                      notifScope === 'ALL'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    Todos los usuarios
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotifScope('SELECTED')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                      notifScope === 'SELECTED'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    Usuarios específicos ({notifUserIds.length})
                  </button>
                </div>

                {notifScope === 'SELECTED' && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 max-h-36 overflow-y-auto space-y-1.5">
                    {nonCreatorUsers.map((u) => (
                      <label
                        key={u.id}
                        className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={notifUserIds.includes(u.id)}
                          onChange={() =>
                            setNotifUserIds((prev) =>
                              prev.includes(u.id)
                                ? prev.filter((id) => id !== u.id)
                                : [...prev, u.id]
                            )
                          }
                        />
                        <span className="font-medium text-slate-900">
                          {u.name} {u.surname}
                        </span>
                        <span className="text-slate-500 font-mono tabular-nums">{u.phone}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={uploadingNotifVideo}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Enviar notificación
              </button>
            </form>

            {notifications.length > 0 && (
              <div className="pt-4 border-t border-slate-200 space-y-2">
                <div className="text-xs font-semibold text-slate-500">
                  Notificaciones enviadas ({notifications.length})
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="py-2 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate">{n.title}</div>
                        <div className="text-slate-500 truncate">
                          {n.targetScope === 'ALL'
                            ? 'Todos'
                            : `${n.targetUserIds.length} usuarios`}{' '}
                          · {new Date(n.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteNotificationApi(n.id);
                          await onRefresh();
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                        title="Eliminar notificación"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 4: CATEGORIES */}
      {tab === 'categories' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Categorías técnicas</h2>
            <p className="text-sm text-slate-600">
              Organiza los tutoriales por sistemas operativos, programas y tipos de fallo.
            </p>
          </div>

          <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-3 max-w-md">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Nombre de la nueva categoría..."
              className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              Agregar
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4 border-t border-slate-100">
            {categories.map((cat) => (
              <div
                key={cat}
                className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-sm text-slate-800"
              >
                <span className="truncate font-medium">{cat}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(cat)}
                  className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                  title="Eliminar categoría"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: MAINTENANCE & BACKUP */}
      {tab === 'maintenance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Modo mantenimiento</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Cuando está activo, los usuarios no pueden navegar ni ver tutoriales y ven tu
                  mensaje personalizado.
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleMaintenance}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium border cursor-pointer whitespace-nowrap ${
                  settings.maintenanceMode
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-slate-100 border-slate-300 text-slate-700'
                }`}
              >
                {settings.maintenanceMode ? 'Desactivar mantenimiento' : 'Activar mantenimiento'}
              </button>
            </div>

            <form onSubmit={handleSaveMaintenanceConfig} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Mensaje personalizado de mantenimiento
                </label>
                <textarea
                  rows={3}
                  value={maintMessage}
                  onChange={(e) => setMaintMessage(e.target.value)}
                  placeholder="Ej. La plataforma está en mantenimiento temporal..."
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <label className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allowAdminsDuringMaintenance}
                  onChange={handleToggleAllowAdmins}
                  className="mt-0.5 rounded border-slate-300 text-blue-600"
                />
                <div className="text-sm">
                  <div className="font-medium text-slate-900">
                    Permitir acceso exclusivo a ayudantes con permiso administrativo
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Si se desactiva, únicamente tu cuenta principal podrá acceder durante el
                    mantenimiento.
                  </div>
                </div>
              </label>

              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium cursor-pointer"
              >
                Guardar mensaje personalizado
              </button>
            </form>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Copia de seguridad</h2>
              <p className="text-sm text-slate-600 mt-1">
                Descarga un respaldo completo en JSON (usuarios, tutoriales, categorías y registros)
                o restaura un archivo anterior.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Exportar respaldo JSON
              </button>

              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium cursor-pointer">
                <Upload className="w-4 h-4" />
                Restaurar respaldo JSON
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => handleImportBackup(e.target.files?.[0])}
                />
              </label>
            </div>
          </section>
        </div>
      )}

      {/* TAB 6: AUDIT LOGS */}
      {tab === 'logs' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Registro de actividad</h2>
          <div className="max-h-[460px] overflow-y-auto divide-y divide-slate-100">
            {logs.map((log) => (
              <div
                key={log.id}
                className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm"
              >
                <div>
                  <span className="font-medium text-slate-900">{log.user}</span>
                  <span className="text-slate-400 mx-2">·</span>
                  <span className="text-slate-700">{log.action}</span>
                </div>
                <span className="font-mono text-xs text-slate-500 tabular-nums shrink-0">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: AUDIENCE SELECTOR FOR TUTORIAL */}
      {audienceTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-xl">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Elegir usuarios que verán este tutorial
              </h3>
              <p className="text-xs text-slate-600 mt-1">{audienceTarget.title}</p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAudienceScope('ALL')}
                className={`flex-1 py-2 rounded-lg text-xs font-medium border cursor-pointer ${
                  audienceScope === 'ALL'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                Todos los usuarios
              </button>
              <button
                type="button"
                onClick={() => setAudienceScope('SELECTED')}
                className={`flex-1 py-2 rounded-lg text-xs font-medium border cursor-pointer ${
                  audienceScope === 'SELECTED'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                Solo seleccionados
              </button>
            </div>

            {audienceScope === 'SELECTED' && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 max-h-56 overflow-y-auto space-y-2">
                {nonCreatorUsers.length === 0 ? (
                  <p className="text-xs text-slate-500">No hay usuarios registrados.</p>
                ) : (
                  nonCreatorUsers.map((u) => (
                    <label
                      key={u.id}
                      className="flex items-center justify-between text-xs text-slate-700 cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={audienceUserIds.includes(u.id)}
                          onChange={() =>
                            setAudienceUserIds((prev) =>
                              prev.includes(u.id)
                                ? prev.filter((id) => id !== u.id)
                                : [...prev, u.id]
                            )
                          }
                        />
                        <span className="font-medium text-slate-900">
                          {u.name} {u.surname}
                        </span>
                      </span>
                      <span className="font-mono text-slate-500 tabular-nums">{u.phone}</span>
                    </label>
                  ))
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAudienceTarget(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveAudienceModal}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer"
              >
                Guardar selección
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REPORT USER REASON */}
      {reportTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Reportar cuenta de {reportTarget.name} {reportTarget.surname}
            </h3>
            <p className="text-xs text-slate-600">
              La cuenta quedará marcada como reportada y restringida hasta que vuelvas a activarla.
            </p>
            <input
              type="text"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Motivo del reporte (opcional)"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReportTarget(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = reportTarget;
                  setReportTarget(null);
                  await handleStatusChange(target, 'REPORTED', reportReason);
                }}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium cursor-pointer"
              >
                Confirmar reporte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM DELETE USER */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Eliminar usuario</h3>
            <p className="text-sm text-slate-600">
              ¿Seguro que deseas eliminar permanentemente la cuenta de{' '}
              <span className="font-semibold text-slate-900">
                {confirmDeleteUser.name} {confirmDeleteUser.surname}
              </span>
              ?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteUser(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium cursor-pointer"
              >
                Eliminar cuenta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM DELETE TUTORIAL */}
      {confirmDeleteTutorial && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Eliminar tutorial</h3>
            <p className="text-sm text-slate-600">
              ¿Seguro que deseas eliminar "{confirmDeleteTutorial.title}"? Esta acción no se puede
              deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteTutorial(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteTutorial}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium cursor-pointer"
              >
                Eliminar tutorial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

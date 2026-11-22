import type {
  AlertSeverity,
  BootstrapPayload,
  PlatformSettings,
  Tutorial,
  UserAccount,
  UserPermissions,
  UserRole,
  UserStatus,
  VideoNotification,
} from './types';

const TOKEN_KEY = 'sp_auth_token';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function resolveMediaUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('/uploads/') && API_BASE_URL) {
    return `${API_BASE_URL}${url}`;
  }
  return url;
}

export function getStoredToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(resolveApiUrl(path), { ...options, headers });
  } catch {
    const netErr = new Error(
      'No se pudo conectar con el servidor. Verifica tu conexión a Internet e inténtalo de nuevo.'
    ) as Error & { isNetworkError?: boolean };
    netErr.isNetworkError = true;
    throw netErr;
  }

  let data: unknown = {};
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      if (res.ok) {
        throw new Error('La respuesta del servidor no tiene formato JSON válido.');
      }
    }
  } else {
    const text = await res.text().catch(() => '');
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        if (res.ok) {
          throw new Error('Respuesta inesperada del servidor al procesar la solicitud.');
        }
      }
    }
  }

  if (!res.ok) {
    const err = new Error((data as { error?: string }).error || 'Error en la solicitud') as Error & {
      status?: number;
      code?: string;
    };
    err.status = res.status;
    err.code = (data as { code?: string }).code;
    throw err;
  }
  return data as T;
}

export async function fetchPublicStatus(): Promise<{
  maintenanceMode: boolean;
  maintenanceMessage: string;
  allowAdminsDuringMaintenance: boolean;
  realtimeAlertsEnabled: boolean;
  activeAlert: PlatformSettings['activeAlert'];
}> {
  return request('/api/status');
}

export async function loginApi(payload: { name: string; surname: string; password: string }) {
  return request<{ token: string; user: UserAccount }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function registerApi(payload: {
  name: string;
  surname: string;
  phone: string;
  password: string;
  confirmPassword: string;
}) {
  return request<{ ok: boolean; message: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function recoverVerifyApi(phone: string) {
  return request<{ ok: boolean; fullName: string }>('/api/auth/recover/verify', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function recoverResetApi(payload: {
  phone: string;
  newPassword: string;
  confirmPassword: string;
}) {
  return request<{ ok: boolean; message: string }>('/api/auth/recover/reset', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchBootstrap(): Promise<BootstrapPayload> {
  return request<BootstrapPayload>('/api/bootstrap');
}

export async function uploadMediaFile(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });

  const res = await request<{ url: string }>('/api/upload', {
    method: 'POST',
    body: JSON.stringify({ filename: file.name, dataUrl }),
  });
  return res.url;
}

export async function createTutorialApi(payload: Partial<Tutorial>): Promise<Tutorial> {
  return request<Tutorial>('/api/tutorials', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateTutorialApi(id: string, payload: Partial<Tutorial>): Promise<Tutorial> {
  return request<Tutorial>(`/api/tutorials/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function updateTutorialVisibilityApi(
  id: string,
  payload: Pick<Partial<Tutorial>, 'status' | 'visibilityScope' | 'allowedUserIds'>
): Promise<Tutorial> {
  return request<Tutorial>(`/api/tutorials/${id}/visibility`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteTutorialApi(id: string): Promise<void> {
  await request(`/api/tutorials/${id}`, { method: 'DELETE' });
}

export async function addCategoryApi(name: string): Promise<{ categories: string[] }> {
  return request('/api/categories', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function deleteCategoryApi(name: string): Promise<{ categories: string[] }> {
  return request(`/api/categories/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
}

export async function sendNotificationApi(payload: {
  title: string;
  message: string;
  tutorialId?: string;
  videoUrl?: string;
  targetScope: 'ALL' | 'SELECTED';
  targetUserIds: string[];
}): Promise<VideoNotification> {
  return request<VideoNotification>('/api/notifications', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function markNotificationReadApi(id: string): Promise<void> {
  await request(`/api/notifications/${id}/read`, { method: 'POST' });
}

export async function deleteNotificationApi(id: string): Promise<void> {
  await request(`/api/notifications/${id}`, { method: 'DELETE' });
}

export async function updateAlertsSettingsApi(payload: {
  realtimeAlertsEnabled?: boolean;
  activeAlert?: { title: string; message: string; severity: AlertSeverity } | null;
  clearAlert?: boolean;
}): Promise<PlatformSettings> {
  return request<PlatformSettings>('/api/settings/alerts', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function updateMaintenanceSettingsApi(payload: {
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  allowAdminsDuringMaintenance?: boolean;
}): Promise<PlatformSettings> {
  return request<PlatformSettings>('/api/settings/maintenance', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function updateUserStatusApi(
  id: string,
  status: UserStatus,
  statusReason?: string
): Promise<UserAccount> {
  return request<UserAccount>(`/api/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, statusReason }),
  });
}

export async function updateUserRoleApi(
  id: string,
  role: UserRole,
  permissions?: Partial<UserPermissions>
): Promise<UserAccount> {
  return request<UserAccount>(`/api/users/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role, permissions }),
  });
}

export async function deleteUserApi(id: string): Promise<void> {
  await request(`/api/users/${id}`, { method: 'DELETE' });
}

export async function exportBackupApi(): Promise<unknown> {
  return request('/api/backup/export');
}

export async function importBackupApi(payload: unknown): Promise<void> {
  await request('/api/backup/import', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getYoutubeEmbedUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const ytMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/
  );
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }
  return null;
}

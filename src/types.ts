export type UserRole = 'CREATOR' | 'HELPER' | 'USER';

export type UserStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'REPORTED';

export interface UserPermissions {
  canUploadMedia: boolean;
  canCreateTutorials: boolean;
  canEditTutorials: boolean;
  canManageCategories: boolean;
  canAccessMaintenance: boolean;
}

export interface UserAccount {
  id: string;
  name: string;
  surname: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  statusReason?: string;
  permissions: UserPermissions;
  createdAt: string;
}

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  image?: string;
  video?: string;
}

export type VisibilityStatus = 'VISIBLE' | 'HIDDEN';
export type VisibilityScope = 'ALL' | 'SELECTED';

export interface Tutorial {
  id: string;
  title: string;
  category: string;
  description: string;
  status: VisibilityStatus;
  visibilityScope: VisibilityScope;
  allowedUserIds: string[];
  author: string;
  createdAt: string;
  updatedAt?: string;
  steps: TutorialStep[];
}

export type AlertSeverity = 'info' | 'warning' | 'urgent';

export interface RealtimeAlert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  createdAt: string;
}

export interface PlatformSettings {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  allowAdminsDuringMaintenance: boolean;
  realtimeAlertsEnabled: boolean;
  activeAlert: RealtimeAlert | null;
}

export interface VideoNotification {
  id: string;
  title: string;
  message: string;
  tutorialId?: string;
  videoUrl?: string;
  targetScope: VisibilityScope;
  targetUserIds: string[];
  readByUserIds: string[];
  senderName: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
}

export interface BootstrapPayload {
  user: UserAccount;
  settings: PlatformSettings;
  categories: string[];
  tutorials: Tutorial[];
  notifications: VideoNotification[];
  users?: UserAccount[];
  logs?: AuditLog[];
}

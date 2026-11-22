import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Express, NextFunction, Request, Response } from 'express';
import type {
  AuditLog,
  PlatformSettings,
  Tutorial,
  UserAccount,
  UserPermissions,
  UserRole,
  UserStatus,
  VideoNotification,
} from '../src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const IS_VERCEL = process.env.VERCEL === '1';
const LOCAL_DATA_DIR = path.join(ROOT_DIR, 'data');
const DATA_DIR = IS_VERCEL ? '/tmp/solucionar-data' : LOCAL_DATA_DIR;
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const SECRET_PATH = path.join(DATA_DIR, 'secret.key');

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const KV_DB_KEY = 'solucionar_problemas:db_v1';

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function getSessionSecret(): string {
  if (process.env.SESSION_SECRET) {
    return process.env.SESSION_SECRET;
  }
  if (fs.existsSync(SECRET_PATH)) {
    return fs.readFileSync(SECRET_PATH, 'utf8').trim();
  }
  if (IS_VERCEL) {
    // Deterministic fallback derived from KV token or deployment URL if SESSION_SECRET is unset
    const seed = KV_TOKEN || process.env.VERCEL_PROJECT_PRODUCTION_URL || 'solucionar-problemas-default-secret';
    return crypto.createHash('sha256').update(seed).digest('hex');
  }
  const generated = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(SECRET_PATH, generated, 'utf8');
  return generated;
}

const SESSION_SECRET = getSessionSecret();

function hashPassword(plain: string): string {
  return crypto.createHash('sha256').update(plain).digest('hex');
}

function normalizeFullName(name: string, surname: string): string {
  return `${name || ''} ${surname || ''}`.trim().replace(/\s+/g, ' ').toUpperCase();
}

export interface StoredUser extends UserAccount {
  passwordHash: string;
}

export interface DatabaseSchema {
  users: StoredUser[];
  categories: string[];
  tutorials: Tutorial[];
  notifications: VideoNotification[];
  logs: AuditLog[];
  settings: PlatformSettings;
}

const DEFAULT_CATEGORIES: string[] = [
  'Microsoft Word',
  'Microsoft Excel',
  'Microsoft PowerPoint',
  'Windows 10',
  'Windows 11',
  'Sistemas informáticos',
  'Problemas de computadoras',
  'Programas y aplicaciones',
  'Internet y conectividad',
  'Soluciones de errores informáticos',
];

const DEFAULT_TUTORIALS: Tutorial[] = [
  {
    id: 'tut-1',
    title: 'Reparar error de cálculo de fórmulas en Microsoft Excel',
    category: 'Microsoft Excel',
    description:
      'Solución paso a paso cuando las fórmulas no se calculan automáticamente o muestran el texto en lugar del resultado.',
    status: 'VISIBLE',
    visibilityScope: 'ALL',
    allowedUserIds: [],
    author: 'DELFI MARTINEZ',
    createdAt: '2026-03-10',
    steps: [
      {
        id: 'step-1-1',
        title: 'Verificar opciones de cálculo del libro',
        content:
          "Abre Excel y dirígete a la pestaña 'Fórmulas' en la cinta superior. En el bloque 'Cálculo', haz clic en 'Opciones de cálculo' y comprueba que esté seleccionado 'Automático' en lugar de 'Manual'.",
        image: '/src/assets/images/tutorial_excel_formulas_1795293860410.jpg',
        video: '',
      },
      {
        id: 'step-1-2',
        title: 'Corregir el formato de celda de Texto a General',
        content:
          "Si la fórmula aparece escrita literalmente, selecciona la celda afectada, haz clic derecho y elige 'Formato de celdas'. Cambia la categoría de 'Texto' a 'General', presiona F2 sobre la celda y pulsa Enter.",
        image: '',
        video: '',
      },
      {
        id: 'step-1-3',
        title: 'Desactivar la vista de fórmulas',
        content:
          "Comprueba que no esté activado el modo 'Mostrar fórmulas' presionando Ctrl + ` (o desde la pestaña Fórmulas > Auditoría de fórmulas).",
        image: '',
        video: '',
      },
    ],
  },
  {
    id: 'tut-2',
    title: 'Acelerar e optimizar el inicio en Windows 11',
    category: 'Windows 11',
    description:
      'Reduce el tiempo de arranque deshabilitando aplicaciones innecesarias que consumen memoria y procesador al encender el equipo.',
    status: 'VISIBLE',
    visibilityScope: 'ALL',
    allowedUserIds: [],
    author: 'DELFI MARTINEZ',
    createdAt: '2026-03-12',
    steps: [
      {
        id: 'step-2-1',
        title: 'Abrir el Administrador de tareas',
        content:
          "Presiona Ctrl + Shift + Esc para abrir el Administrador de tareas. Si aparece en vista compacta, haz clic en 'Más detalles' para desplegar las pestañas completas.",
        image: '/src/assets/images/tutorial_windows_speed_1795293860789.jpg',
        video: '',
      },
      {
        id: 'step-2-2',
        title: 'Deshabilitar aplicaciones de impacto alto',
        content:
          "Entra en la pestaña 'Aplicaciones de arranque', ordena la columna 'Impacto de inicio' y deshabilita los programas que no necesitas al encender tu computadora.",
        image: '',
        video: '',
      },
      {
        id: 'step-2-3',
        title: 'Reiniciar y comprobar tiempos de respuesta',
        content:
          'Reinicia el sistema operativo y verifica la fluidez del escritorio al completar el arranque.',
        image: '',
        video: '',
      },
    ],
  },
  {
    id: 'tut-3',
    title: 'Solucionar fallo de conexión DNS y acceso a Internet',
    category: 'Internet y conectividad',
    description:
      "Procedimiento efectivo para resolver el aviso 'El servidor DNS no responde' o bloqueos intermitentes de navegación.",
    status: 'VISIBLE',
    visibilityScope: 'ALL',
    allowedUserIds: [],
    author: 'DELFI MARTINEZ',
    createdAt: '2026-03-15',
    steps: [
      {
        id: 'step-3-1',
        title: 'Vaciar la caché DNS desde la consola',
        content:
          "Abre el menú Inicio, escribe 'cmd', haz clic derecho en Símbolo del sistema y selecciona 'Ejecutar como administrador'. Escribe ipconfig /flushdns y presiona Enter.",
        image: '/src/assets/images/tutorial_network_dns_1795293860100.jpg',
        video: '',
      },
      {
        id: 'step-3-2',
        title: 'Renovar la dirección IP local',
        content:
          'En la misma ventana ejecuta ipconfig /release seguido de ipconfig /renew para solicitar una nueva concesión al router.',
        image: '',
        video: '',
      },
      {
        id: 'step-3-3',
        title: 'Configurar DNS primarios estables',
        content:
          'Accede a Configuración de red > Cambiar opciones del adaptador > Propiedades de tu red > Protocolo IPv4, y asigna los servidores DNS 1.1.1.1 y 8.8.8.8.',
        image: '',
        video: '',
      },
    ],
  },
];

function createDefaultDb(): DatabaseSchema {
  return {
    users: [
      {
        id: 'creator-main',
        name: 'DELFI',
        surname: 'MARTINEZ',
        phone: '0000000000',
        passwordHash: hashPassword('fabian58M@'),
        role: 'CREATOR',
        status: 'ACTIVE',
        permissions: {
          canUploadMedia: true,
          canCreateTutorials: true,
          canEditTutorials: true,
          canManageCategories: true,
          canAccessMaintenance: true,
        },
        createdAt: new Date().toISOString().split('T')[0],
      },
    ],
    categories: [...DEFAULT_CATEGORIES],
    tutorials: [...DEFAULT_TUTORIALS],
    notifications: [],
    logs: [
      {
        id: 'log-init',
        timestamp: new Date().toISOString(),
        user: 'Sistema',
        action: 'Inicialización de la plataforma de soporte',
      },
    ],
    settings: {
      maintenanceMode: false,
      maintenanceMessage:
        'La plataforma está temporalmente fuera de servicio por mantenimiento técnico. Por favor, vuelve a intentarlo más tarde.',
      allowAdminsDuringMaintenance: true,
      realtimeAlertsEnabled: true,
      activeAlert: null,
    },
  };
}

function hydrateDb(parsed: Partial<DatabaseSchema>): DatabaseSchema {
  const defaults = createDefaultDb();
  const db: DatabaseSchema = {
    users: Array.isArray(parsed.users) ? parsed.users : defaults.users,
    categories: Array.isArray(parsed.categories) ? parsed.categories : defaults.categories,
    tutorials: Array.isArray(parsed.tutorials) ? parsed.tutorials : defaults.tutorials,
    notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
    logs: Array.isArray(parsed.logs) ? parsed.logs : defaults.logs,
    settings: {
      ...defaults.settings,
      ...(parsed.settings || {}),
    },
  };

  const creatorIdx = db.users.findIndex((u) => u.id === 'creator-main' || u.role === 'CREATOR');
  const creatorRecord: StoredUser = {
    id: 'creator-main',
    name: 'DELFI',
    surname: 'MARTINEZ',
    phone: '0000000000',
    passwordHash: hashPassword('fabian58M@'),
    role: 'CREATOR',
    status: 'ACTIVE',
    permissions: {
      canUploadMedia: true,
      canCreateTutorials: true,
      canEditTutorials: true,
      canManageCategories: true,
      canAccessMaintenance: true,
    },
    createdAt: creatorIdx >= 0 ? db.users[creatorIdx].createdAt : defaults.users[0].createdAt,
  };

  if (creatorIdx === -1) {
    db.users.unshift(creatorRecord);
  } else {
    db.users[creatorIdx] = creatorRecord;
  }

  return db;
}

function loadLocalDb(): DatabaseSchema {
  // On Vercel without KV, seed from bundled data/db.json if it exists
  const seedPath = fs.existsSync(DB_PATH)
    ? DB_PATH
    : fs.existsSync(path.join(LOCAL_DATA_DIR, 'db.json'))
      ? path.join(LOCAL_DATA_DIR, 'db.json')
      : null;

  if (!seedPath) {
    const initial = createDefaultDb();
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }

  try {
    const raw = fs.readFileSync(seedPath, 'utf8');
    const db = hydrateDb(JSON.parse(raw) as Partial<DatabaseSchema>);
    if (seedPath !== DB_PATH) {
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
    }
    return db;
  } catch {
    const fallback = createDefaultDb();
    fs.writeFileSync(DB_PATH, JSON.stringify(fallback, null, 2), 'utf8');
    return fallback;
  }
}

async function kvGetDb(): Promise<DatabaseSchema | null> {
  if (!KV_URL || !KV_TOKEN) return null;
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(KV_DB_KEY)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { result?: string | null };
  if (!json.result) return null;
  return hydrateDb(JSON.parse(json.result) as Partial<DatabaseSchema>);
}

async function kvSetDb(db: DatabaseSchema): Promise<void> {
  if (!KV_URL || !KV_TOKEN) return;
  await fetch(`${KV_URL}/set/${encodeURIComponent(KV_DB_KEY)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(JSON.stringify(db)),
  });
}

let cachedDb: DatabaseSchema | null = null;
let kvInitialized = false;

export async function getDb(): Promise<DatabaseSchema> {
  if (KV_URL && KV_TOKEN) {
    if (!kvInitialized || !cachedDb || IS_VERCEL) {
      try {
        const remote = await kvGetDb();
        if (remote) {
          cachedDb = remote;
          kvInitialized = true;
          return cachedDb;
        }
        const initial = loadLocalDb();
        await kvSetDb(initial);
        cachedDb = initial;
        kvInitialized = true;
        return cachedDb;
      } catch {
        // Fallback to local file if KV unreachable
      }
    }
  }
  if (!cachedDb) {
    cachedDb = loadLocalDb();
  }
  return cachedDb;
}

export async function persistDb(db: DatabaseSchema): Promise<void> {
  cachedDb = db;
  try {
    const tmpPath = `${DB_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf8');
    fs.renameSync(tmpPath, DB_PATH);
  } catch {
    // Ignore file write errors if running in read-only edge environment
  }
  if (KV_URL && KV_TOKEN) {
    try {
      await kvSetDb(db);
    } catch {
      // Logged or ignored so API continues responding
    }
  }
}

export function verifyToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      uid?: string;
    };
    return parsed.uid || null;
  } catch {
    return null;
  }
}

function signToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, iat: Date.now() }),
    'utf8'
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function sanitizeUser(u: StoredUser): UserAccount {
  const { passwordHash: _omit, ...rest } = u;
  return rest;
}

function canBypassMaintenance(user: StoredUser, db: DatabaseSchema): boolean {
  if (user.role === 'CREATOR') return true;
  if (
    user.role === 'HELPER' &&
    db.settings.allowAdminsDuringMaintenance &&
    user.permissions?.canAccessMaintenance
  ) {
    return true;
  }
  return false;
}

function canPerformPermission(user: StoredUser, key: keyof UserPermissions): boolean {
  if (user.role === 'CREATOR') return true;
  if (user.role === 'HELPER' && user.permissions?.[key]) return true;
  return false;
}

function filterTutorialsForUser(user: StoredUser, db: DatabaseSchema): Tutorial[] {
  if (user.role === 'CREATOR' || canPerformPermission(user, 'canEditTutorials')) {
    return db.tutorials;
  }
  return db.tutorials.filter((t) => {
    if (t.status !== 'VISIBLE') return false;
    if (t.visibilityScope === 'SELECTED') {
      return Array.isArray(t.allowedUserIds) && t.allowedUserIds.includes(user.id);
    }
    return true;
  });
}

function filterNotificationsForUser(user: StoredUser, db: DatabaseSchema): VideoNotification[] {
  if (user.role === 'CREATOR') {
    return db.notifications;
  }
  return db.notifications.filter((n) => {
    if (n.targetScope === 'SELECTED') {
      return Array.isArray(n.targetUserIds) && n.targetUserIds.includes(user.id);
    }
    return true;
  });
}

function getStatusBlockMessage(status: UserStatus, reason?: string): string {
  const extra = reason ? ` Motivo: ${reason}` : '';
  switch (status) {
    case 'PENDING':
      return 'Tu cuenta está pendiente de validación por un administrador. Podrás acceder cuando sea aprobada.';
    case 'SUSPENDED':
      return `Tu cuenta se encuentra temporalmente suspendida.${extra}`;
    case 'BLOCKED':
      return `Tu cuenta ha sido bloqueada por un administrador.${extra}`;
    case 'REPORTED':
      return `Tu cuenta ha sido reportada y restringida temporalmente.${extra}`;
    default:
      return 'Acceso no autorizado.';
  }
}

export type RealtimeBroadcastFn = (
  type: string,
  payload: unknown,
  targetUserIds?: string[] | 'CREATOR'
) => void;

interface AuthedRequest extends Request {
  authUser?: StoredUser;
  currentDb?: DatabaseSchema;
}

// Simple sliding-window rate limiter for auth endpoints
const authAttempts = new Map<string, number[]>();
function authRateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
  const now = Date.now();
  const windowMs = 60_000;
  const recent = (authAttempts.get(ip) || []).filter((t) => now - t < windowMs);
  if (recent.length >= 30) {
    res.status(429).json({ error: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.' });
    return;
  }
  recent.push(now);
  authAttempts.set(ip, recent);
  next();
}

export function createApp(onBroadcast?: RealtimeBroadcastFn): Express {
  const app = express();
  app.set('trust proxy', 1);

  // Security & CORS headers (supports Web, Vercel Custom Domains, and Capacitor Android)
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (
      !origin ||
      origin === 'capacitor://localhost' ||
      origin === 'http://localhost' ||
      origin === 'https://localhost' ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:') ||
      allowedOrigins.length === 0 ||
      allowedOrigins.includes(origin)
    ) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(express.json({ limit: '60mb' }));
  app.use('/uploads', express.static(UPLOADS_DIR));

  const broadcast = (type: string, payload: unknown, target?: string[] | 'CREATOR') => {
    if (onBroadcast) {
      onBroadcast(type, payload, target);
    }
  };

  const addLog = async (db: DatabaseSchema, userLabel: string, action: string) => {
    const entry: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      user: userLabel,
      action,
    };
    db.logs.unshift(entry);
    if (db.logs.length > 300) {
      db.logs = db.logs.slice(0, 300);
    }
    await persistDb(db);
  };

  const requireAuth = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      res.status(401).json({ error: 'Sesión no iniciada.' });
      return;
    }
    const uid = verifyToken(token);
    if (!uid) {
      res.status(401).json({ error: 'Sesión inválida o expirada.' });
      return;
    }
    const db = await getDb();
    const user = db.users.find((u) => u.id === uid);
    if (!user) {
      res.status(401).json({ error: 'La cuenta ya no existe.' });
      return;
    }
    if (user.status !== 'ACTIVE') {
      res.status(403).json({
        error: getStatusBlockMessage(user.status, user.statusReason),
        code: user.status,
      });
      return;
    }
    if (db.settings.maintenanceMode && !canBypassMaintenance(user, db)) {
      res.status(503).json({
        error: db.settings.maintenanceMessage,
        code: 'MAINTENANCE',
      });
      return;
    }
    req.authUser = user;
    req.currentDb = db;
    next();
  };

  const requireCreator = (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.authUser || req.authUser.role !== 'CREATOR') {
      res.status(403).json({ error: 'Acción restringida.' });
      return;
    }
    next();
  };

  // Health Check
  app.get('/api/health', async (_req, res) => {
    const db = await getDb();
    res.json({
      ok: true,
      mode: IS_VERCEL ? 'vercel' : 'node',
      persistence: KV_URL && KV_TOKEN ? 'kv' : 'file',
      usersCount: db.users.length,
      tutorialsCount: db.tutorials.length,
    });
  });

  // Public status endpoint
  app.get('/api/status', async (_req, res) => {
    const db = await getDb();
    res.json({
      maintenanceMode: db.settings.maintenanceMode,
      maintenanceMessage: db.settings.maintenanceMessage,
      allowAdminsDuringMaintenance: db.settings.allowAdminsDuringMaintenance,
      realtimeAlertsEnabled: db.settings.realtimeAlertsEnabled,
      activeAlert: db.settings.realtimeAlertsEnabled ? db.settings.activeAlert : null,
    });
  });

  // Authentication Routes
  app.post('/api/auth/login', authRateLimit, async (req, res) => {
    const { name, surname, password } = req.body as {
      name?: string;
      surname?: string;
      password?: string;
    };

    const fullName = normalizeFullName(name || '', surname || '');
    if (!fullName || !password) {
      res.status(400).json({ error: 'Ingresa tu nombre, apellido y contraseña.' });
      return;
    }

    const db = await getDb();
    const found = db.users.find((u) => normalizeFullName(u.name, u.surname) === fullName);

    if (!found || found.passwordHash !== hashPassword(password)) {
      res.status(401).json({ error: 'Credenciales incorrectas. Verifica tu nombre y contraseña.' });
      return;
    }

    if (found.status !== 'ACTIVE') {
      res.status(403).json({
        error: getStatusBlockMessage(found.status, found.statusReason),
        code: found.status,
      });
      return;
    }

    if (db.settings.maintenanceMode && !canBypassMaintenance(found, db)) {
      res.status(503).json({
        error: db.settings.maintenanceMessage,
        code: 'MAINTENANCE',
      });
      return;
    }

    const token = signToken(found.id);
    await addLog(db, `${found.name} ${found.surname}`, 'Inicio de sesión');
    broadcast('creator:sync', { ts: Date.now() }, 'CREATOR');

    res.json({
      token,
      user: sanitizeUser(found),
    });
  });

  app.post('/api/auth/register', authRateLimit, async (req, res) => {
    const { name, surname, phone, password, confirmPassword } = req.body as {
      name?: string;
      surname?: string;
      phone?: string;
      password?: string;
      confirmPassword?: string;
    };

    const cleanName = (name || '').trim().toUpperCase();
    const cleanSurname = (surname || '').trim().toUpperCase();
    const cleanPhone = (phone || '').replace(/\D/g, '');

    if (!cleanName || !cleanSurname || !cleanPhone || !password || !confirmPassword) {
      res.status(400).json({ error: 'Todos los campos son obligatorios.' });
      return;
    }
    if (password !== confirmPassword) {
      res.status(400).json({ error: 'Las contraseñas no coinciden.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }
    if (cleanPhone.length < 6) {
      res.status(400).json({ error: 'Ingresa un número de teléfono válido.' });
      return;
    }
    if (normalizeFullName(cleanName, cleanSurname) === 'DELFI MARTINEZ') {
      res.status(400).json({ error: 'Este nombre de usuario no está disponible para registro.' });
      return;
    }

    const db = await getDb();
    const phoneTaken = db.users.some((u) => u.phone.replace(/\D/g, '') === cleanPhone);
    if (phoneTaken) {
      res.status(409).json({ error: 'Ya existe una cuenta registrada con ese número de teléfono.' });
      return;
    }

    const newUser: StoredUser = {
      id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      surname: cleanSurname,
      phone: cleanPhone,
      passwordHash: hashPassword(password),
      role: 'USER',
      status: 'PENDING',
      permissions: {
        canUploadMedia: false,
        canCreateTutorials: false,
        canEditTutorials: false,
        canManageCategories: false,
        canAccessMaintenance: false,
      },
      createdAt: new Date().toISOString().split('T')[0],
    };

    db.users.push(newUser);
    await addLog(
      db,
      `${newUser.name} ${newUser.surname}`,
      `Registro enviado (Pendiente de validación · Tel: ${newUser.phone})`
    );
    broadcast('creator:sync', { ts: Date.now() }, 'CREATOR');

    res.status(201).json({
      ok: true,
      message:
        'Registro completado. Tu cuenta quedó pendiente de validación por un administrador antes de poder iniciar sesión.',
    });
  });

  app.post('/api/auth/recover/verify', authRateLimit, async (req, res) => {
    const { phone } = req.body as { phone?: string };
    const cleanPhone = (phone || '').replace(/\D/g, '');
    if (!cleanPhone) {
      res.status(400).json({ error: 'Ingresa el número de teléfono registrado.' });
      return;
    }

    const db = await getDb();
    const user = db.users.find(
      (u) => u.phone.replace(/\D/g, '') === cleanPhone && u.role !== 'CREATOR'
    );
    if (!user) {
      res.status(404).json({ error: 'No se encontró ninguna cuenta asociada a ese número de teléfono.' });
      return;
    }

    res.json({
      ok: true,
      fullName: `${user.name} ${user.surname}`,
    });
  });

  app.post('/api/auth/recover/reset', authRateLimit, async (req, res) => {
    const { phone, newPassword, confirmPassword } = req.body as {
      phone?: string;
      newPassword?: string;
      confirmPassword?: string;
    };
    const cleanPhone = (phone || '').replace(/\D/g, '');

    if (!cleanPhone || !newPassword || !confirmPassword) {
      res.status(400).json({ error: 'Completa todos los campos requeridos.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      res.status(400).json({ error: 'Las contraseñas no coinciden.' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    const db = await getDb();
    const idx = db.users.findIndex(
      (u) => u.phone.replace(/\D/g, '') === cleanPhone && u.role !== 'CREATOR'
    );
    if (idx === -1) {
      res.status(404).json({ error: 'Cuenta no encontrada.' });
      return;
    }

    db.users[idx].passwordHash = hashPassword(newPassword);
    await addLog(db, `${db.users[idx].name} ${db.users[idx].surname}`, 'Contraseña restablecida mediante teléfono');
    broadcast('creator:sync', { ts: Date.now() }, 'CREATOR');

    res.json({ ok: true, message: 'Contraseña actualizada correctamente.' });
  });

  // Authenticated Bootstrap Data
  app.get('/api/bootstrap', requireAuth, async (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const db = req.currentDb!;
    const isCreator = user.role === 'CREATOR';

    res.json({
      user: sanitizeUser(user),
      settings: db.settings,
      categories: db.categories,
      tutorials: filterTutorialsForUser(user, db),
      notifications: filterNotificationsForUser(user, db),
      ...(isCreator
        ? {
            users: db.users.map(sanitizeUser),
            logs: db.logs,
          }
        : {}),
    });
  });

  // Media Upload
  app.post('/api/upload', requireAuth, async (req: AuthedRequest, res) => {
    const user = req.authUser!;
    if (!canPerformPermission(user, 'canUploadMedia')) {
      res.status(403).json({ error: 'No tienes permiso para subir archivos multimedia.' });
      return;
    }

    const { filename, dataUrl } = req.body as { filename?: string; dataUrl?: string };
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.includes(',')) {
      res.status(400).json({ error: 'Archivo multimedia inválido.' });
      return;
    }

    // On Vercel serverless, filesystem is ephemeral across instances, so keep compact data URLs inline
    if (IS_VERCEL) {
      res.json({ url: dataUrl });
      return;
    }

    const [header, base64Body] = dataUrl.split(',');
    const mimeMatch = header.match(/data:([^;]+);base64/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';

    let ext = path.extname(filename || '').toLowerCase();
    if (!ext) {
      if (mime.includes('mp4')) ext = '.mp4';
      else if (mime.includes('webm')) ext = '.webm';
      else if (mime.includes('quicktime')) ext = '.mov';
      else if (mime.includes('png')) ext = '.png';
      else if (mime.includes('webp')) ext = '.webp';
      else ext = '.jpg';
    }

    const safeName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
    const outPath = path.join(UPLOADS_DIR, safeName);
    fs.writeFileSync(outPath, Buffer.from(base64Body, 'base64'));

    res.json({ url: `/uploads/${safeName}` });
  });

  // Tutorial Management
  app.post('/api/tutorials', requireAuth, async (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const db = req.currentDb!;
    if (!canPerformPermission(user, 'canCreateTutorials')) {
      res.status(403).json({ error: 'No tienes permiso para crear tutoriales.' });
      return;
    }

    const body = req.body as Partial<Tutorial>;
    if (!body.title?.trim() || !body.category?.trim() || !Array.isArray(body.steps) || body.steps.length === 0) {
      res.status(400).json({ error: 'Título, categoría y al menos un paso son obligatorios.' });
      return;
    }

    const newTut: Tutorial = {
      id: `tut-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: body.title.trim(),
      category: body.category.trim(),
      description: (body.description || '').trim(),
      status: body.status === 'HIDDEN' ? 'HIDDEN' : 'VISIBLE',
      visibilityScope: body.visibilityScope === 'SELECTED' ? 'SELECTED' : 'ALL',
      allowedUserIds: Array.isArray(body.allowedUserIds) ? body.allowedUserIds : [],
      author: `${user.name} ${user.surname}`,
      createdAt: new Date().toISOString().split('T')[0],
      steps: body.steps.map((s, idx) => ({
        id: s.id || `step-${Date.now()}-${idx}`,
        title: (s.title || `Paso ${idx + 1}`).trim(),
        content: (s.content || '').trim(),
        image: s.image || '',
        video: s.video || '',
      })),
    };

    db.tutorials.unshift(newTut);
    await addLog(db, `${user.name} ${user.surname}`, `Tutorial publicado: ${newTut.title}`);
    broadcast('tutorials:updated', { ts: Date.now() });
    res.status(201).json(newTut);
  });

  app.put('/api/tutorials/:id', requireAuth, async (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const db = req.currentDb!;
    if (!canPerformPermission(user, 'canEditTutorials')) {
      res.status(403).json({ error: 'No tienes permiso para editar tutoriales.' });
      return;
    }

    const idx = db.tutorials.findIndex((t) => t.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Tutorial no encontrado.' });
      return;
    }

    const body = req.body as Partial<Tutorial>;
    const existing = db.tutorials[idx];
    const updated: Tutorial = {
      ...existing,
      title: body.title !== undefined ? body.title.trim() : existing.title,
      category: body.category !== undefined ? body.category.trim() : existing.category,
      description: body.description !== undefined ? body.description.trim() : existing.description,
      status: body.status === 'HIDDEN' || body.status === 'VISIBLE' ? body.status : existing.status,
      visibilityScope:
        body.visibilityScope === 'SELECTED' || body.visibilityScope === 'ALL'
          ? body.visibilityScope
          : existing.visibilityScope,
      allowedUserIds: Array.isArray(body.allowedUserIds)
        ? body.allowedUserIds
        : existing.allowedUserIds,
      updatedAt: new Date().toISOString().split('T')[0],
      steps: Array.isArray(body.steps)
        ? body.steps.map((s, i) => ({
            id: s.id || `step-${Date.now()}-${i}`,
            title: (s.title || `Paso ${i + 1}`).trim(),
            content: (s.content || '').trim(),
            image: s.image || '',
            video: s.video || '',
          }))
        : existing.steps,
    };

    db.tutorials[idx] = updated;
    await addLog(db, `${user.name} ${user.surname}`, `Tutorial actualizado: ${updated.title}`);
    broadcast('tutorials:updated', { ts: Date.now() });
    res.json(updated);
  });

  app.patch('/api/tutorials/:id/visibility', requireAuth, async (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const db = req.currentDb!;
    if (!canPerformPermission(user, 'canEditTutorials')) {
      res.status(403).json({ error: 'No tienes permiso para cambiar la visibilidad.' });
      return;
    }

    const tut = db.tutorials.find((t) => t.id === req.params.id);
    if (!tut) {
      res.status(404).json({ error: 'Tutorial no encontrado.' });
      return;
    }

    const { status, visibilityScope, allowedUserIds } = req.body as Partial<Tutorial>;
    if (status === 'VISIBLE' || status === 'HIDDEN') {
      tut.status = status;
    }
    if (visibilityScope === 'ALL' || visibilityScope === 'SELECTED') {
      tut.visibilityScope = visibilityScope;
    }
    if (Array.isArray(allowedUserIds)) {
      tut.allowedUserIds = allowedUserIds;
    }

    await addLog(
      db,
      `${user.name} ${user.surname}`,
      `Visibilidad de "${tut.title}": ${tut.status} (${tut.visibilityScope})`
    );
    broadcast('tutorials:updated', { ts: Date.now() });
    res.json(tut);
  });

  app.delete('/api/tutorials/:id', requireAuth, async (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const db = req.currentDb!;
    if (!canPerformPermission(user, 'canEditTutorials')) {
      res.status(403).json({ error: 'No tienes permiso para eliminar tutoriales.' });
      return;
    }

    const tut = db.tutorials.find((t) => t.id === req.params.id);
    if (!tut) {
      res.status(404).json({ error: 'Tutorial no encontrado.' });
      return;
    }

    db.tutorials = db.tutorials.filter((t) => t.id !== req.params.id);
    await addLog(db, `${user.name} ${user.surname}`, `Tutorial eliminado: ${tut.title}`);
    broadcast('tutorials:updated', { ts: Date.now() });
    res.json({ ok: true });
  });

  // Categories Management
  app.post('/api/categories', requireAuth, async (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const db = req.currentDb!;
    if (!canPerformPermission(user, 'canManageCategories')) {
      res.status(403).json({ error: 'No tienes permiso para gestionar categorías.' });
      return;
    }

    const { name } = req.body as { name?: string };
    const clean = (name || '').trim();
    if (!clean) {
      res.status(400).json({ error: 'Escribe un nombre de categoría válido.' });
      return;
    }
    if (db.categories.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      res.status(409).json({ error: 'Esa categoría ya existe.' });
      return;
    }

    db.categories.push(clean);
    await addLog(db, `${user.name} ${user.surname}`, `Categoría agregada: ${clean}`);
    broadcast('categories:updated', { categories: db.categories });
    res.status(201).json({ categories: db.categories });
  });

  app.delete('/api/categories/:name', requireAuth, async (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const db = req.currentDb!;
    if (!canPerformPermission(user, 'canManageCategories')) {
      res.status(403).json({ error: 'No tienes permiso para eliminar categorías.' });
      return;
    }

    const target = decodeURIComponent(req.params.name);
    db.categories = db.categories.filter((c) => c !== target);
    await addLog(db, `${user.name} ${user.surname}`, `Categoría eliminada: ${target}`);
    broadcast('categories:updated', { categories: db.categories });
    res.json({ categories: db.categories });
  });

  // Video Notifications & Real-Time Alerts
  app.post('/api/notifications', requireAuth, requireCreator, async (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const db = req.currentDb!;
    const { title, message, tutorialId, videoUrl, targetScope, targetUserIds } =
      req.body as Partial<VideoNotification>;

    if (!title?.trim() || !message?.trim()) {
      res.status(400).json({ error: 'El título y el mensaje de la notificación son obligatorios.' });
      return;
    }

    const notification: VideoNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: title.trim(),
      message: message.trim(),
      tutorialId: tutorialId || undefined,
      videoUrl: videoUrl?.trim() || undefined,
      targetScope: targetScope === 'SELECTED' ? 'SELECTED' : 'ALL',
      targetUserIds: Array.isArray(targetUserIds) ? targetUserIds : [],
      readByUserIds: [],
      senderName: `${user.name} ${user.surname}`,
      createdAt: new Date().toISOString(),
    };

    db.notifications.unshift(notification);
    await addLog(
      db,
      `${user.name} ${user.surname}`,
      `Notificación enviada (${notification.targetScope}): ${notification.title}`
    );

    broadcast(
      'notification:new',
      notification,
      notification.targetScope === 'SELECTED' ? notification.targetUserIds : undefined
    );

    res.status(201).json(notification);
  });

  app.post('/api/notifications/:id/read', requireAuth, async (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const db = req.currentDb!;
    const notif = db.notifications.find((n) => n.id === req.params.id);
    if (!notif) {
      res.status(404).json({ error: 'Notificación no encontrada.' });
      return;
    }
    if (!notif.readByUserIds.includes(user.id)) {
      notif.readByUserIds.push(user.id);
      await persistDb(db);
    }
    res.json({ ok: true });
  });

  app.delete('/api/notifications/:id', requireAuth, requireCreator, async (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const db = req.currentDb!;
    db.notifications = db.notifications.filter((n) => n.id !== req.params.id);
    await addLog(db, `${user.name} ${user.surname}`, 'Notificación eliminada');
    broadcast('notifications:updated', { ts: Date.now() });
    res.json({ ok: true });
  });

  app.put('/api/settings/alerts', requireAuth, requireCreator, async (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const db = req.currentDb!;
    const { realtimeAlertsEnabled, activeAlert, clearAlert } = req.body as {
      realtimeAlertsEnabled?: boolean;
      activeAlert?: { title: string; message: string; severity: 'info' | 'warning' | 'urgent' } | null;
      clearAlert?: boolean;
    };

    if (typeof realtimeAlertsEnabled === 'boolean') {
      db.settings.realtimeAlertsEnabled = realtimeAlertsEnabled;
    }

    if (clearAlert) {
      db.settings.activeAlert = null;
    } else if (activeAlert && activeAlert.title?.trim() && activeAlert.message?.trim()) {
      db.settings.activeAlert = {
        id: `alert-${Date.now()}`,
        title: activeAlert.title.trim(),
        message: activeAlert.message.trim(),
        severity: activeAlert.severity || 'info',
        createdAt: new Date().toISOString(),
      };
    }

    await addLog(
      db,
      `${user.name} ${user.surname}`,
      `Sistema de alertas actualizado (Activo: ${db.settings.realtimeAlertsEnabled ? 'Sí' : 'No'})`
    );

    broadcast('alert:updated', {
      realtimeAlertsEnabled: db.settings.realtimeAlertsEnabled,
      activeAlert: db.settings.realtimeAlertsEnabled ? db.settings.activeAlert : null,
    });

    res.json(db.settings);
  });

  // Maintenance Mode & Exclusive Admin Access
  app.put('/api/settings/maintenance', requireAuth, requireCreator, async (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const db = req.currentDb!;
    const { maintenanceMode, maintenanceMessage, allowAdminsDuringMaintenance } = req.body as {
      maintenanceMode?: boolean;
      maintenanceMessage?: string;
      allowAdminsDuringMaintenance?: boolean;
    };

    if (typeof maintenanceMode === 'boolean') {
      db.settings.maintenanceMode = maintenanceMode;
    }
    if (typeof maintenanceMessage === 'string' && maintenanceMessage.trim()) {
      db.settings.maintenanceMessage = maintenanceMessage.trim();
    }
    if (typeof allowAdminsDuringMaintenance === 'boolean') {
      db.settings.allowAdminsDuringMaintenance = allowAdminsDuringMaintenance;
    }

    await addLog(
      db,
      `${user.name} ${user.surname}`,
      `Modo mantenimiento ${db.settings.maintenanceMode ? 'ACTIVADO' : 'DESACTIVADO'}`
    );

    broadcast('maintenance:updated', {
      maintenanceMode: db.settings.maintenanceMode,
      maintenanceMessage: db.settings.maintenanceMessage,
      allowAdminsDuringMaintenance: db.settings.allowAdminsDuringMaintenance,
    });

    res.json(db.settings);
  });

  // Creator User Management
  app.patch('/api/users/:id/status', requireAuth, requireCreator, async (req: AuthedRequest, res) => {
    const actor = req.authUser!;
    const db = req.currentDb!;
    const target = db.users.find((u) => u.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }
    if (target.role === 'CREATOR') {
      res.status(400).json({ error: 'La cuenta principal no puede ser modificada.' });
      return;
    }

    const { status, statusReason } = req.body as { status?: UserStatus; statusReason?: string };
    const allowed: UserStatus[] = ['PENDING', 'ACTIVE', 'SUSPENDED', 'BLOCKED', 'REPORTED'];
    if (!status || !allowed.includes(status)) {
      res.status(400).json({ error: 'Estado inválido.' });
      return;
    }

    target.status = status;
    target.statusReason = status === 'ACTIVE' ? '' : (statusReason || '').trim();
    await addLog(
      db,
      `${actor.name} ${actor.surname}`,
      `Estado de ${target.name} ${target.surname} actualizado a ${status}`
    );

    broadcast(
      'user:status',
      {
        status: target.status,
        message: getStatusBlockMessage(target.status, target.statusReason),
      },
      [target.id]
    );
    broadcast('creator:sync', { ts: Date.now() }, 'CREATOR');

    res.json(sanitizeUser(target));
  });

  app.patch('/api/users/:id/role', requireAuth, requireCreator, async (req: AuthedRequest, res) => {
    const actor = req.authUser!;
    const db = req.currentDb!;
    const target = db.users.find((u) => u.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }
    if (target.role === 'CREATOR') {
      res.status(400).json({ error: 'No se puede cambiar el rol principal.' });
      return;
    }

    const { role, permissions } = req.body as {
      role?: UserRole;
      permissions?: Partial<UserPermissions>;
    };
    if (role === 'USER' || role === 'HELPER') {
      target.role = role;
    }
    if (permissions) {
      target.permissions = { ...target.permissions, ...permissions };
    }

    await addLog(
      db,
      `${actor.name} ${actor.surname}`,
      `Rol/Permisos de ${target.name} ${target.surname} actualizados (${target.role})`
    );

    broadcast('user:updated', sanitizeUser(target), [target.id]);
    broadcast('creator:sync', { ts: Date.now() }, 'CREATOR');

    res.json(sanitizeUser(target));
  });

  app.delete('/api/users/:id', requireAuth, requireCreator, async (req: AuthedRequest, res) => {
    const actor = req.authUser!;
    const db = req.currentDb!;
    const target = db.users.find((u) => u.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }
    if (target.role === 'CREATOR') {
      res.status(400).json({ error: 'No es posible eliminar la cuenta principal.' });
      return;
    }

    db.users = db.users.filter((u) => u.id !== req.params.id);
    await addLog(db, `${actor.name} ${actor.surname}`, `Usuario eliminado: ${target.name} ${target.surname}`);

    broadcast(
      'user:status',
      { status: 'DELETED', message: 'Tu cuenta ha sido eliminada por un administrador.' },
      [target.id]
    );
    broadcast('creator:sync', { ts: Date.now() }, 'CREATOR');

    res.json({ ok: true });
  });

  // Backup Export & Import
  app.get('/api/backup/export', requireAuth, requireCreator, async (req: AuthedRequest, res) => {
    const actor = req.authUser!;
    const db = req.currentDb!;
    await addLog(db, `${actor.name} ${actor.surname}`, 'Copia de seguridad exportada');
    res.json({
      ...db,
      exportDate: new Date().toISOString(),
    });
  });

  app.post('/api/backup/import', requireAuth, requireCreator, async (req: AuthedRequest, res) => {
    const actor = req.authUser!;
    const db = req.currentDb!;
    const payload = req.body as Partial<DatabaseSchema>;
    if (!Array.isArray(payload.users) || !Array.isArray(payload.tutorials) || !Array.isArray(payload.categories)) {
      res.status(400).json({ error: 'El archivo de respaldo no tiene una estructura válida.' });
      return;
    }

    const creatorBackup = db.users.find((u) => u.id === 'creator-main');
    db.categories = payload.categories;
    db.tutorials = payload.tutorials;
    db.notifications = Array.isArray(payload.notifications) ? payload.notifications : [];
    db.logs = Array.isArray(payload.logs) ? payload.logs : db.logs;
    db.settings = payload.settings ? { ...db.settings, ...payload.settings } : db.settings;

    const hasCreator = payload.users.some((u) => u.id === 'creator-main');
    db.users = hasCreator
      ? payload.users
      : creatorBackup
        ? [creatorBackup, ...payload.users]
        : payload.users;

    await addLog(db, `${actor.name} ${actor.surname}`, 'Copia de seguridad restaurada');
    broadcast('tutorials:updated', { ts: Date.now() });
    broadcast('maintenance:updated', db.settings);
    broadcast('creator:sync', { ts: Date.now() }, 'CREATOR');

    res.json({ ok: true });
  });

  return app;
}

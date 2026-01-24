import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {
  ensureFile,
  fileExists,
  readJsonFile,
  resolveDataPath,
  withWriteLock,
  writeJsonFile,
} from "./jsonStore.js";

export type UserRole = "customer" | "developer" | "admin";
export type UserStatus = "pending" | "active" | "suspended";

export type StoredUser = {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
};

export type AuditLog = {
  id: string;
  actorId: string | null;
  targetUserId: string | null;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
};

type LegacyStoreData = {
  users: StoredUser[];
  auditLogs: AuditLog[];
};

const USERS_FILE = resolveDataPath(process.env.DATA_USERS_FILE ?? "./data/users.json");
const AUDIT_FILE = resolveDataPath(process.env.DATA_AUDIT_FILE ?? "./data/audit_logs.json");
const LEGACY_FILE = resolveDataPath(process.env.DATA_FILE ?? "./data/auth.json");

const migrateLegacyIfNeeded = async () => {
  const legacyExists = await fileExists(LEGACY_FILE);
  const usersExists = await fileExists(USERS_FILE);
  const auditExists = await fileExists(AUDIT_FILE);

  if (!legacyExists) {
    await ensureFile(USERS_FILE, []);
    await ensureFile(AUDIT_FILE, []);
    return;
  }

  if (usersExists && auditExists) return;

  let legacyData: LegacyStoreData = { users: [], auditLogs: [] };
  try {
    const raw = await fs.readFile(LEGACY_FILE, "utf-8");
    const parsed = JSON.parse(raw) as LegacyStoreData;
    legacyData = {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
    };
  } catch {
    legacyData = { users: [], auditLogs: [] };
  }

  if (!usersExists) {
    await ensureFile(USERS_FILE, legacyData.users);
  }
  if (!auditExists) {
    await ensureFile(AUDIT_FILE, legacyData.auditLogs);
  }
};

const readUsers = async (): Promise<StoredUser[]> => {
  await migrateLegacyIfNeeded();
  const data = await readJsonFile<StoredUser[]>(USERS_FILE, []);
  return Array.isArray(data) ? data : [];
};

const readAuditLogs = async (): Promise<AuditLog[]> => {
  await migrateLegacyIfNeeded();
  const data = await readJsonFile<AuditLog[]>(AUDIT_FILE, []);
  return Array.isArray(data) ? data : [];
};

const writeUsers = async (users: StoredUser[]) => {
  await writeJsonFile(USERS_FILE, users, []);
};

const writeAuditLogs = async (logs: AuditLog[]) => {
  await writeJsonFile(AUDIT_FILE, logs, []);
};

export const initStore = async () => {
  await migrateLegacyIfNeeded();
};

export const listUsers = async () => {
  return readUsers();
};

export const findUserById = async (id: string) => {
  const users = await readUsers();
  return users.find((user) => user.id === id) ?? null;
};

export const findUserByIdentifier = async (identifier: string) => {
  const normalized = identifier.toLowerCase();
  const users = await readUsers();
  return (
    users.find(
      (user) =>
        user.username.toLowerCase() === normalized || user.email.toLowerCase() === normalized
    ) ?? null
  );
};

export const createUser = async (payload: {
  username: string;
  email: string;
  passwordHash: string;
  role?: UserRole;
  status?: UserStatus;
}) => {
  return withWriteLock(async () => {
    const users = await readUsers();
    const usernameLower = payload.username.toLowerCase();
    const emailLower = payload.email.toLowerCase();

    if (users.some((user) => user.username.toLowerCase() === usernameLower)) {
      return { error: "USERNAME_EXISTS" as const };
    }
    if (users.some((user) => user.email.toLowerCase() === emailLower)) {
      return { error: "EMAIL_EXISTS" as const };
    }

    const now = new Date().toISOString();
    const user: StoredUser = {
      id: randomUUID(),
      username: usernameLower,
      email: emailLower,
      passwordHash: payload.passwordHash,
      role: payload.role ?? "customer",
      status: payload.status ?? "active",
      createdAt: now,
      updatedAt: now,
    };

    users.push(user);
    await writeUsers(users);

    return { user };
  });
};

export const updateUser = async (
  id: string,
  updates: Partial<Pick<StoredUser, "role" | "status">>
) => {
  return withWriteLock(async () => {
    const users = await readUsers();
    const index = users.findIndex((user) => user.id === id);
    if (index === -1) return null;
    const before = users[index];
    const updated = {
      ...before,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    users[index] = updated;
    await writeUsers(users);
    return { before, after: updated };
  });
};

export const updateUserPassword = async (id: string, passwordHash: string) => {
  return withWriteLock(async () => {
    const users = await readUsers();
    const index = users.findIndex((user) => user.id === id);
    if (index === -1) return null;
    const before = users[index];
    const updated = {
      ...before,
      passwordHash,
      updatedAt: new Date().toISOString(),
    };
    users[index] = updated;
    await writeUsers(users);
    return { before, after: updated };
  });
};

export const deleteUser = async (id: string) => {
  return withWriteLock(async () => {
    const users = await readUsers();
    const index = users.findIndex((user) => user.id === id);
    if (index === -1) return null;
    const [removed] = users.splice(index, 1);
    await writeUsers(users);
    return removed;
  });
};

export const addAuditLog = async (payload: Omit<AuditLog, "id" | "createdAt">) => {
  return withWriteLock(async () => {
    const logs = await readAuditLogs();
    const log: AuditLog = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...payload,
    };
    logs.push(log);
    await writeAuditLogs(logs);
    return log;
  });
};

export const toPublicUser = (user: StoredUser) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role,
  status: user.status,
  createdAt: user.createdAt,
});

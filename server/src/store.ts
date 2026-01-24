import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

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

type StoreData = {
  users: StoredUser[];
  auditLogs: AuditLog[];
};

const moduleDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rawPath = process.env.DATA_FILE ?? "./data/auth.json";
const DATA_FILE = path.isAbsolute(rawPath) ? rawPath : path.resolve(moduleDir, rawPath);

const defaultData: StoreData = {
  users: [],
  auditLogs: [],
};

let writeChain: Promise<void> = Promise.resolve();

const withWriteLock = async <T>(fn: () => Promise<T>) => {
  const next = writeChain.then(fn, fn);
  writeChain = next.then(
    () => undefined,
    () => undefined
  );
  return next;
};

const ensureDataFile = async () => {
  const dir = path.dirname(DATA_FILE);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(defaultData, null, 2));
  }
};

const readData = async (): Promise<StoreData> => {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  try {
    const data = JSON.parse(raw) as StoreData;
    return {
      users: Array.isArray(data.users) ? data.users : [],
      auditLogs: Array.isArray(data.auditLogs) ? data.auditLogs : [],
    };
  } catch {
    return { ...defaultData };
  }
};

const writeData = async (data: StoreData) => {
  await ensureDataFile();
  const tempFile = `${DATA_FILE}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(data, null, 2));
  await fs.rename(tempFile, DATA_FILE);
};

export const initStore = async () => {
  await ensureDataFile();
};

export const listUsers = async () => {
  const data = await readData();
  return data.users;
};

export const findUserById = async (id: string) => {
  const data = await readData();
  return data.users.find((user) => user.id === id) ?? null;
};

export const findUserByIdentifier = async (identifier: string) => {
  const normalized = identifier.toLowerCase();
  const data = await readData();
  return (
    data.users.find(
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
    const data = await readData();
    const usernameLower = payload.username.toLowerCase();
    const emailLower = payload.email.toLowerCase();

    if (data.users.some((user) => user.username.toLowerCase() === usernameLower)) {
      return { error: "USERNAME_EXISTS" as const };
    }
    if (data.users.some((user) => user.email.toLowerCase() === emailLower)) {
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

    data.users.push(user);
    await writeData(data);

    return { user };
  });
};

export const updateUser = async (
  id: string,
  updates: Partial<Pick<StoredUser, "role" | "status">>
) => {
  return withWriteLock(async () => {
    const data = await readData();
    const index = data.users.findIndex((user) => user.id === id);
    if (index === -1) return null;
    const before = data.users[index];
    const updated = {
      ...before,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    data.users[index] = updated;
    await writeData(data);
    return { before, after: updated };
  });
};

export const updateUserPassword = async (id: string, passwordHash: string) => {
  return withWriteLock(async () => {
    const data = await readData();
    const index = data.users.findIndex((user) => user.id === id);
    if (index === -1) return null;
    const before = data.users[index];
    const updated = {
      ...before,
      passwordHash,
      updatedAt: new Date().toISOString(),
    };
    data.users[index] = updated;
    await writeData(data);
    return { before, after: updated };
  });
};

export const addAuditLog = async (payload: Omit<AuditLog, "id" | "createdAt">) => {
  return withWriteLock(async () => {
    const data = await readData();
    const log: AuditLog = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...payload,
    };
    data.auditLogs.push(log);
    await writeData(data);
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

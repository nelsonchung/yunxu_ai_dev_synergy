import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let writeChain: Promise<void> = Promise.resolve();

export const withWriteLock = async <T>(fn: () => Promise<T>) => {
  const next = writeChain.then(fn, fn);
  writeChain = next.then(
    () => undefined,
    () => undefined
  );
  return next;
};

export const resolveDataPath = (rawPath: string) =>
  path.isAbsolute(rawPath) ? rawPath : path.resolve(moduleDir, rawPath);

export const fileExists = async (filePath: string) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

export const ensureFile = async <T>(filePath: string, defaultContent: T) => {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  if (!(await fileExists(filePath))) {
    await fs.writeFile(filePath, JSON.stringify(defaultContent, null, 2));
  }
};

export const readJsonFile = async <T>(filePath: string, fallback: T): Promise<T> => {
  await ensureFile(filePath, fallback);
  const raw = await fs.readFile(filePath, "utf-8");
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const writeJsonFile = async <T>(filePath: string, data: T, fallback: T) => {
  await ensureFile(filePath, fallback);
  const tempFile = `${filePath}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(data, null, 2));
  await fs.rename(tempFile, filePath);
};

export const createJsonStore = <T>(filePath: string, fallback: T) => ({
  filePath,
  ensure: () => ensureFile(filePath, fallback),
  read: () => readJsonFile(filePath, fallback),
  write: (data: T) => withWriteLock(() => writeJsonFile(filePath, data, fallback)),
});

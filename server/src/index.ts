import dotenv from "dotenv";
import fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import requirementsRoutes from "./routes/requirements.js";
import projectsRoutes from "./routes/projects.js";
import matchingRoutes from "./routes/matching.js";
import tasksRoutes from "./routes/tasks.js";
import milestonesRoutes from "./routes/milestones.js";
import qualityRoutes from "./routes/quality.js";
import auditRoutes from "./routes/audit.js";
import permissionsRoutes from "./routes/permissions.js";
import { initStore } from "./store.js";
import { initPlatformStore } from "./platformStore.js";
import { hasPermission, initPermissionsStore } from "./permissionsStore.js";

dotenv.config();

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "::";
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";

if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET in environment.");
}

const app = fastify({ logger: true });

await app.register(cors, {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
  credentials: true,
});

await app.register(cookie);
await app.register(jwt, {
  secret: JWT_SECRET,
  sign: { expiresIn: JWT_EXPIRES_IN },
  cookie: {
    cookieName: "session",
    signed: false,
  },
});

app.decorate("authenticate", async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ message: "未授權。" });
  }
});

app.decorate("requireAdmin", async (request, reply) => {
  try {
    await request.jwtVerify();
    if (request.user.role !== "admin") {
      return reply.code(403).send({ message: "僅限管理者操作。" });
    }
  } catch {
    return reply.code(401).send({ message: "未授權。" });
  }
});

app.decorate("requirePermission", (permissionId: string) => {
  return async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ message: "未授權。" });
    }

    const allowed = await hasPermission(request.user.role, permissionId);
    if (!allowed) {
      return reply.code(403).send({ message: "權限不足。" });
    }
  };
});

app.get("/health", async () => ({ status: "ok" }));

app.register(authRoutes, { prefix: "/auth" });
app.register(adminRoutes, { prefix: "/admin" });
app.register(requirementsRoutes, { prefix: "/api" });
app.register(projectsRoutes, { prefix: "/api" });
app.register(matchingRoutes, { prefix: "/api" });
app.register(tasksRoutes, { prefix: "/api" });
app.register(milestonesRoutes, { prefix: "/api" });
app.register(qualityRoutes, { prefix: "/api" });
app.register(auditRoutes, { prefix: "/api" });
app.register(permissionsRoutes, { prefix: "/api" });

const start = async () => {
  try {
    await app.listen({ port: PORT, host: HOST });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

const shutdown = async () => {
  await app.close();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await initStore();
await initPlatformStore();
await initPermissionsStore();
start();

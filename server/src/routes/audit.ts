import type { FastifyPluginAsync } from "fastify";
import { listAuditLogs } from "../store.js";

const auditRoutes: FastifyPluginAsync = async (app) => {
  app.get("/audit/logs", { preHandler: app.requireAdmin }, async (request) => {
    const { actor_id, date_from, date_to } = request.query as {
      actor_id?: string;
      date_from?: string;
      date_to?: string;
    };

    const logs = await listAuditLogs();
    const filtered = logs.filter((log) => {
      if (actor_id && log.actorId !== actor_id) return false;
      if (date_from && log.createdAt < date_from) return false;
      if (date_to && log.createdAt > date_to) return false;
      return true;
    });

    const sorted = [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { logs: sorted };
  });
};

export default auditRoutes;

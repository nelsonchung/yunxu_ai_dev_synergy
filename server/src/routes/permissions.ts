import type { FastifyPluginAsync } from "fastify";
import { getRolePermissionList } from "../permissionsStore.js";

const permissionsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/permissions", { preHandler: app.authenticate }, async (request) => {
    const permissions = await getRolePermissionList(request.user.role);
    return { role: request.user.role, permissions };
  });
};

export default permissionsRoutes;

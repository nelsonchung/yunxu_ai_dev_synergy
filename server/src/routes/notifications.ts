import type { FastifyPluginAsync } from "fastify";
import { broadcastUnreadCount } from "../notificationHub.js";
import {
  countUnreadNotifications,
  listNotificationsByRecipient,
  markAllNotificationsRead,
  markNotificationRead,
} from "../notificationsStore.js";

const notificationsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/notifications", { preHandler: app.authenticate }, async (request) => {
    const { status } = request.query as { status?: "unread" };
    const notifications = await listNotificationsByRecipient(request.user.sub, { status });
    return { notifications };
  });

  app.get("/notifications/unread-count", { preHandler: app.authenticate }, async (request) => {
    const count = await countUnreadNotifications(request.user.sub);
    return { count };
  });

  app.post(
    "/notifications/:id/read",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const updated = await markNotificationRead(request.user.sub, id);
      if (!updated) {
        return reply.code(404).send({ message: "找不到通知。" });
      }
      try {
        await broadcastUnreadCount(request.user.sub);
      } catch (error) {
        app.log.error(error);
      }
      return { ok: true };
    }
  );

  app.post(
    "/notifications/read-all",
    { preHandler: app.authenticate },
    async (request) => {
      const updated = await markAllNotificationsRead(request.user.sub);
      try {
        await broadcastUnreadCount(request.user.sub);
      } catch (error) {
        app.log.error(error);
      }
      return { updated };
    }
  );
};

export default notificationsRoutes;

import type { FastifyPluginAsync } from "fastify";
import {
  assignMatchingResult,
  createMatchingResult,
  getRequirementById,
  listMatchingResults,
} from "../platformData.js";
import { addAuditLog } from "../store.js";

const matchingRoutes: FastifyPluginAsync = async (app) => {
  app.get("/matching", { preHandler: app.requireAdmin }, async (request) => {
    const { requirement_id } = request.query as { requirement_id?: string };
    const results = await listMatchingResults(requirement_id);
    return { results };
  });

  app.post("/matching/evaluate", { preHandler: app.requireAdmin }, async (request, reply) => {
    const body = (request.body as {
      requirement_id?: string;
      team_id?: string;
      budget_estimate?: string;
      timeline_estimate?: string;
      score?: number;
    }) ?? {};
    const requirementId = String(body.requirement_id ?? "").trim();
    if (!requirementId) {
      return reply.code(400).send({ message: "請提供 requirement_id。" });
    }
    const requirement = await getRequirementById(requirementId);
    if (!requirement) {
      return reply.code(404).send({ message: "找不到需求。" });
    }

    const result = await createMatchingResult({
      requirementId,
      teamId: body.team_id,
      budget: body.budget_estimate,
      timeline: body.timeline_estimate,
      score: typeof body.score === "number" ? body.score : undefined,
    });

    await addAuditLog({
      actorId: request.user.sub,
      targetUserId: null,
      action: "MATCHING_EVALUATED",
      before: null,
      after: { matchingId: result.id, requirementId, teamId: result.teamId },
    });

    return reply.send({
      matching_id: result.id,
      score: result.score,
      budget_estimate: result.budget,
      timeline_estimate: result.timeline,
      status: result.status,
    });
  });

  app.post("/matching/:id/assign", { preHandler: app.requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as { team_id?: string }) ?? {};
    const teamId = String(body.team_id ?? "").trim();
    if (!teamId) {
      return reply.code(400).send({ message: "請提供 team_id。" });
    }
    const updated = await assignMatchingResult(id, teamId);
    if (!updated) {
      return reply.code(404).send({ message: "找不到媒合紀錄。" });
    }

    await addAuditLog({
      actorId: request.user.sub,
      targetUserId: null,
      action: "MATCHING_ASSIGNED",
      before: null,
      after: { matchingId: id, teamId },
    });
    return reply.send({ status: updated.status });
  });
};

export default matchingRoutes;

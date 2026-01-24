import type { FastifyPluginAsync } from "fastify";
import { createCodeReviewJob, createTestingJob, getQualityReport, listQualityReports } from "../platformData.js";
import { addAuditLog } from "../store.js";

const qualityRoutes: FastifyPluginAsync = async (app) => {
  app.post("/testing/generate", { preHandler: app.requireAdmin }, async (request, reply) => {
    const body = (request.body as { project_id?: string; scope?: string }) ?? {};
    const projectId = String(body.project_id ?? "").trim();
    if (!projectId) {
      return reply.code(400).send({ message: "請提供 project_id。" });
    }

    const { job } = await createTestingJob({ projectId, scope: body.scope ?? "" });
    await addAuditLog({
      actorId: request.user.sub,
      targetUserId: null,
      action: "TESTING_GENERATED",
      before: null,
      after: { projectId, jobId: job.id },
    });
    return reply.send({ job_id: job.id });
  });

  app.post("/review/code", { preHandler: app.requireAdmin }, async (request, reply) => {
    const body = (request.body as {
      project_id?: string;
      repository_url?: string;
      commit_sha?: string;
    }) ?? {};
    const projectId = String(body.project_id ?? "").trim();
    const repositoryUrl = String(body.repository_url ?? "").trim();
    const commitSha = String(body.commit_sha ?? "").trim();
    if (!projectId || !repositoryUrl || !commitSha) {
      return reply.code(400).send({ message: "請提供 project_id、repository_url、commit_sha。" });
    }

    const { job } = await createCodeReviewJob({ projectId, repositoryUrl, commitSha });
    await addAuditLog({
      actorId: request.user.sub,
      targetUserId: null,
      action: "CODE_REVIEW_REQUESTED",
      before: null,
      after: { projectId, jobId: job.id },
    });
    return reply.send({ job_id: job.id });
  });

  app.get(
    "/quality/reports",
    { preHandler: app.requirePermission("quality.reports.view") },
    async (request) => {
    const { project_id } = request.query as { project_id?: string };
    const reports = await listQualityReports(project_id);
    return { reports };
    }
  );

  app.get(
    "/quality/reports/:id",
    { preHandler: app.requirePermission("quality.reports.view") },
    async (request, reply) => {
    const { id } = request.params as { id: string };
    const report = await getQualityReport(id);
    if (!report) {
      return reply.code(404).send({ message: "找不到品質報告。" });
    }
    return { report_url: report.reportUrl, summary: report.summary, status: report.status };
    }
  );
};

export default qualityRoutes;

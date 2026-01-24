import "fastify";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; role: "customer" | "developer" | "admin" };
    user: { sub: string; role: "customer" | "developer" | "admin" };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requirePermission: (
      permissionId: string
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

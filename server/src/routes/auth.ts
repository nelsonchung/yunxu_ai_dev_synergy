import type { FastifyPluginAsync } from "fastify";
import bcrypt from "bcryptjs";
import { createUser, findUserById, findUserByIdentifier, toPublicUser } from "../store.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/register", async (request, reply) => {
    const { username, email, password, confirmPassword } = request.body as {
      username?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    };

    if (!username || !email || !password || !confirmPassword) {
      return reply.code(400).send({ message: "請完整填寫帳號、Email 與密碼欄位。" });
    }
    if (!usernameRegex.test(username)) {
      return reply.code(400).send({ message: "帳號需為 3-20 字英數或底線。" });
    }
    if (!emailRegex.test(email)) {
      return reply.code(400).send({ message: "Email 格式不正確。" });
    }
    if (password.length < 8) {
      return reply.code(400).send({ message: "密碼至少 8 碼。" });
    }
    if (password !== confirmPassword) {
      return reply.code(400).send({ message: "密碼與確認密碼不一致。" });
    }

    const usernameLower = username.toLowerCase();
    const emailLower = email.toLowerCase();
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await createUser({
      username: usernameLower,
      email: emailLower,
      passwordHash,
      status: "active",
    });
    if ("error" in result) {
      if (result.error === "USERNAME_EXISTS") {
        return reply.code(409).send({ message: "帳號已被註冊。" });
      }
      if (result.error === "EMAIL_EXISTS") {
        return reply.code(409).send({ message: "Email 已被註冊。" });
      }
    }

    const user = "user" in result ? result.user : null;
    if (!user) {
      return reply.code(500).send({ message: "註冊失敗，請稍後再試。" });
    }

    const token = await reply.jwtSign({ sub: user.id, role: user.role });
    const cookieOptions = {
      path: "/",
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
    };
    reply.setCookie("session", token, cookieOptions);

    return reply.code(201).send({ user: toPublicUser(user) });
  });

  app.post("/login", async (request, reply) => {
    const { identifier, password } = request.body as {
      identifier?: string;
      password?: string;
    };

    if (!identifier || !password) {
      return reply.code(400).send({ message: "請輸入帳號或 Email 與密碼。" });
    }

    const normalized = identifier.toLowerCase();
    const user = await findUserByIdentifier(normalized);
    if (!user) {
      return reply.code(401).send({ message: "帳號或密碼錯誤。" });
    }
    if (user.status !== "active") {
      return reply.code(403).send({ message: "帳號尚未啟用或已停用。" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return reply.code(401).send({ message: "帳號或密碼錯誤。" });
    }

    const token = await reply.jwtSign({ sub: user.id, role: user.role });
    const cookieOptions = {
      path: "/",
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
    };
    reply.setCookie("session", token, cookieOptions);

    return reply.send({ user: toPublicUser(user) });
  });

  app.post("/logout", async (_request, reply) => {
    reply.clearCookie("session", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return reply.send({ message: "已登出。" });
  });

  app.get("/me", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.send({ user: null });
    }

    const user = await findUserById(request.user.sub);
    if (!user) {
      return reply.send({ user: null });
    }
    return reply.send({ user: toPublicUser(user) });
  });
};

export default authRoutes;

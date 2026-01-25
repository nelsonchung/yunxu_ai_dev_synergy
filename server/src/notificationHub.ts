import { createHash } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { Socket } from "node:net";
import type { FastifyInstance } from "fastify";
import type { Notification } from "./notificationsStore.js";
import { countUnreadNotifications } from "./notificationsStore.js";

const WS_PATH = "/api/notifications/ws";
const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

type JWTPayload = {
  sub: string;
  role: string;
};

const connections = new Map<string, Set<Socket>>();

const parseCookies = (cookieHeader: string | undefined) => {
  if (!cookieHeader) return new Map<string, string>();
  return cookieHeader.split(";").reduce((acc, part) => {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey) return acc;
    acc.set(rawKey, rest.join("="));
    return acc;
  }, new Map<string, string>());
};

const createAcceptValue = (key: string) =>
  createHash("sha1").update(`${key}${WS_GUID}`).digest("base64");

const sendFrame = (socket: Socket, payload: string, opcode = 0x1) => {
  if (socket.destroyed) return;
  const data = Buffer.from(payload);
  const length = data.length;

  let header: Buffer;
  if (length < 126) {
    header = Buffer.from([0x80 | opcode, length]);
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  socket.write(Buffer.concat([header, data]));
};

const sendJson = (socket: Socket, value: unknown) => {
  sendFrame(socket, JSON.stringify(value));
};

const broadcastToUser = (userId: string, value: unknown) => {
  const sockets = connections.get(userId);
  if (!sockets || sockets.size === 0) return;
  for (const socket of sockets) {
    sendJson(socket, value);
  }
};

export const broadcastUnreadCount = async (userId: string) => {
  const count = await countUnreadNotifications(userId);
  broadcastToUser(userId, { type: "notifications.unread_count", count });
};

export const broadcastNewNotification = async (notification: Notification) => {
  broadcastToUser(notification.recipientId, {
    type: "notifications.new",
    notification,
  });
  await broadcastUnreadCount(notification.recipientId);
};

const registerConnection = (userId: string, socket: Socket) => {
  const set = connections.get(userId) ?? new Set<Socket>();
  set.add(socket);
  connections.set(userId, set);

  const cleanup = () => {
    const current = connections.get(userId);
    if (!current) return;
    current.delete(socket);
    if (current.size === 0) {
      connections.delete(userId);
    }
  };

  socket.on("close", cleanup);
  socket.on("end", cleanup);
  socket.on("error", cleanup);
};

const parseFrame = (buffer: Buffer) => {
  if (buffer.length < 2) return null;
  const first = buffer[0];
  const second = buffer[1];
  const opcode = first & 0x0f;
  let length = second & 0x7f;
  let offset = 2;

  if (length === 126) {
    if (buffer.length < offset + 2) return null;
    length = buffer.readUInt16BE(offset);
    offset += 2;
  } else if (length === 127) {
    if (buffer.length < offset + 8) return null;
    const bigLength = buffer.readBigUInt64BE(offset);
    length = Number(bigLength);
    offset += 8;
  }

  const masked = (second & 0x80) !== 0;
  let mask: Buffer | null = null;
  if (masked) {
    if (buffer.length < offset + 4) return null;
    mask = buffer.subarray(offset, offset + 4);
    offset += 4;
  }

  if (buffer.length < offset + length) return null;
  const payload = buffer.subarray(offset, offset + length);

  if (mask) {
    for (let i = 0; i < payload.length; i += 1) {
      payload[i] ^= mask[i % 4];
    }
  }

  return { opcode, payload };
};

const handleSocketData = (socket: Socket, chunk: Buffer) => {
  const frame = parseFrame(chunk);
  if (!frame) return;
  // Close frame
  if (frame.opcode === 0x8) {
    socket.end();
    return;
  }
  // Ping frame
  if (frame.opcode === 0x9) {
    sendFrame(socket, frame.payload.toString("utf-8"), 0x0a);
  }
};

export const handleNotificationsUpgrade = async (
  app: FastifyInstance,
  request: IncomingMessage,
  socket: Socket
) => {
  const url = new URL(request.url ?? "", `http://${request.headers.host ?? "localhost"}`);
  if (url.pathname !== WS_PATH) {
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.destroy();
    return;
  }

  const key = request.headers["sec-websocket-key"];
  if (!key || Array.isArray(key)) {
    socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
    socket.destroy();
    return;
  }

  try {
    const cookies = parseCookies(request.headers.cookie);
    const rawToken = cookies.get("session");
    const token = rawToken ? decodeURIComponent(rawToken) : "";
    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    const payload = (await app.jwt.verify(token)) as JWTPayload;
    const acceptValue = createAcceptValue(key);
    const headers = [
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${acceptValue}`,
      "\r\n",
    ];
    socket.write(headers.join("\r\n"));
    socket.setKeepAlive(true, 30_000);
    socket.on("data", (chunk) => handleSocketData(socket, chunk));

    registerConnection(payload.sub, socket);
    await broadcastUnreadCount(payload.sub);
  } catch (error) {
    app.log.error(error);
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
  }
};

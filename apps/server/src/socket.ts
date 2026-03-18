// apps/server/src/socket.ts

import type { Server } from "socket.io";
import type { ServerToClientEvents, ClientToServerEvents } from "../../../packages/shared/types.js";
import { prisma } from "./services/prisma.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev_secret";
const MAX_MSG_LENGTH = 200;
const HISTORY_LIMIT  = 50;

// ─── Auth middleware ──────────────────────────────────────────────────────────

function extractUserId(token: string): string | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return payload.userId ?? null;
  } catch { return null; }
}

// ─── Register handlers ────────────────────────────────────────────────────────

export function registerSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>
) {
  io.on("connection", async (socket) => {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) { socket.disconnect(); return; }

    const userId = extractUserId(token);
    if (!userId) { socket.disconnect(); return; }

    // Cargar perfil básico
    const [user, profile] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { username: true } }),
      prisma.trainerProfile.findUnique({
        where: { userId },
        select: { guildId: true, guild: { select: { tag: true } } },
      }),
    ]);

    if (!user) { socket.disconnect(); return; }

    const username = user.username;
    const guildId  = profile?.guildId ?? null;
    const guildTag = (profile?.guild as any)?.tag ?? "";

    // Actualizar lastSeen
    await prisma.trainerProfile.update({
      where: { userId },
      data: { lastSeen: new Date() },
    }).catch(() => {});

    // Unirse a salas
    socket.join("global");
    if (guildId) socket.join(`guild:${guildId}`);

    // ── Global: enviar historial ──────────────────────────────────────────────
    const globalHistory = await prisma.globalMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: HISTORY_LIMIT,
    });
    socket.emit("chat:history", {
      channel: "global",
      messages: globalHistory.reverse().map(m => ({
        id:        m.id,
        userId:    m.userId,
        username:  m.username,
        guildTag:  m.guildTag,
        content:   m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    });

    // ── Guild: enviar historial ───────────────────────────────────────────────
    if (guildId) {
      const guildHistory = await prisma.guildMessage.findMany({
        where: { guildId },
        orderBy: { createdAt: "desc" },
        take: HISTORY_LIMIT,
      });
      socket.emit("chat:history", {
        channel: "guild",
        messages: guildHistory.reverse().map(m => ({
          id:        m.id,
          userId:    m.userId,
          username:  m.username,
          guildTag:  m.guildTag,
          content:   m.content,
          createdAt: m.createdAt.toISOString(),
        })),
      });
    }

    // ── Global message ────────────────────────────────────────────────────────
    socket.on("chat:send", async ({ channel, content }) => {
      const text = content?.trim().slice(0, MAX_MSG_LENGTH);
      if (!text) return;

      if (channel === "global") {
        const msg = await prisma.globalMessage.create({
          data: { userId, username, guildTag, content: text },
        });
        io.to("global").emit("chat:message", {
          channel: "global",
          message: {
            id:        msg.id,
            userId:    msg.userId,
            username:  msg.username,
            guildTag:  msg.guildTag,
            content:   msg.content,
            createdAt: msg.createdAt.toISOString(),
          },
        });
      }

      if (channel === "guild" && guildId) {
        const msg = await prisma.guildMessage.create({
          data: { guildId, userId, username, guildTag, content: text },
        });
        io.to(`guild:${guildId}`).emit("chat:message", {
          channel: "guild",
          message: {
            id:        msg.id,
            userId:    msg.userId,
            username:  msg.username,
            guildTag:  msg.guildTag,
            content:   msg.content,
            createdAt: msg.createdAt.toISOString(),
          },
        });
      }
    });

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on("disconnect", async () => {
      await prisma.trainerProfile.update({
        where: { userId },
        data: { lastSeen: new Date() },
      }).catch(() => {});
    });
  });
}

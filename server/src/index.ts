// server/src/index.ts
import express, { Request, Response } from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { ensureDataDir, loadLastMatch, loadSettings, saveLastMatch, saveSettings } from "./persist.js";
import type { AppState, Side, Cat, Settings } from "./state.js";

const app = express();
app.use(cors());
app.get("/status", (_req: Request, res: Response) => {
  res.json({ ok: true, version: STATE.wsVersion, ended: STATE.ended });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const NS = io.of("/scoreboard");

let SETTINGS: Settings;
let STATE: AppState;
let TICK: NodeJS.Timeout | null = null;

let controllerHolder: string | null = null;
const heartbeats = new Map<string, number>();

function newMatchId() { return uuidv4(); }
function now() { return Date.now(); }
function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }

function defaultState(): AppState {
  return {
    wsVersion: "1.0.0",
    matchId: newMatchId(),
    leftScore: 0,
    rightScore: 0,
    timer: { initialMs: 0, remainingMs: 0, running: false, lastStartTs: 0 },
    senshu: null,
    penalties: { left: { C1: 0, C2: 0 }, right: { C1: 0, C2: 0 } },
    penaltyVisibility: SETTINGS.penaltyVisibility,
    rules: { pointGap: 8, targetScore: null, penaltyLimit: 5 },
    ended: { over: false, winner: null, reason: "time" }
  };
}

async function init() {
  await ensureDataDir();
  SETTINGS = await loadSettings();

  const last = await loadLastMatch<any>();
  if (!last) {
    STATE = defaultState();
  } else {
    const def = defaultState();
    STATE = {
      wsVersion: last.wsVersion ?? def.wsVersion,
      matchId: last.matchId ?? def.matchId,
      leftScore: typeof last.leftScore === "number" ? last.leftScore : def.leftScore,
      rightScore: typeof last.rightScore === "number" ? last.rightScore : def.rightScore,
      timer: {
        initialMs: last?.timer?.initialMs ?? def.timer.initialMs,
        remainingMs: last?.timer?.remainingMs ?? def.timer.remainingMs,
        running: false,
        lastStartTs: 0
      },
      senshu: (last?.senshu === "red" || last?.senshu === "blue") ? last.senshu : def.senshu,
      penalties: {
        left: { C1: last?.penalties?.left?.C1 ?? 0, C2: last?.penalties?.left?.C2 ?? 0 },
        right:{ C1: last?.penalties?.right?.C1 ?? 0, C2: last?.penalties?.right?.C2 ?? 0 }
      },
      penaltyVisibility: {
        C1: last?.penaltyVisibility?.C1 ?? SETTINGS.penaltyVisibility.C1,
        C2: last?.penaltyVisibility?.C2 ?? SETTINGS.penaltyVisibility.C2
      },
      rules: {
        pointGap: last?.rules?.pointGap ?? 8,
        targetScore: (typeof last?.rules?.targetScore === "number") ? last.rules.targetScore : null,
        penaltyLimit: last?.rules?.penaltyLimit ?? 5
      },
      ended: {
        over: last?.ended?.over ?? false,
        winner: (last?.ended?.winner === "red" || last?.ended?.winner === "blue") ? last.ended.winner : null,
        reason: last?.ended?.reason ?? "time"
      }
    };
  }
}

function setEnded(reason: AppState["ended"]["reason"], winner: Side | null) {
  STATE.ended = { over: true, winner, reason };
  STATE.timer.running = false;
}

function broadcastFull() { NS.emit("state:full", STATE); }

function endIfNeeded() {
  if (STATE.ended.over) return true;

  const limit = clamp(STATE.rules.penaltyLimit ?? 5, 1, 99);
  const leftP = STATE.penalties.left.C1 + STATE.penalties.left.C2;
  const rightP = STATE.penalties.right.C1 + STATE.penalties.right.C2;
  if (leftP >= limit || rightP >= limit) {
    const winner = leftP >= limit ? "blue" : "red";
    setEnded("penalty", winner);
    NS.emit("event:ended", { reason: "penalty", winner });
    return true;
  }

  const gap = Math.abs(STATE.leftScore - STATE.rightScore);
  if (STATE.rules.pointGap && gap >= STATE.rules.pointGap) {
    const winner = STATE.leftScore > STATE.rightScore ? "red" : "blue";
    setEnded("gap", winner);
    NS.emit("event:ended", { reason: "gap", winner });
    return true;
  }

  if (STATE.rules.targetScore) {
    const t = STATE.rules.targetScore;
    if (STATE.leftScore >= t || STATE.rightScore >= t) {
      const winner = STATE.leftScore >= t ? "red" : "blue";
      setEnded("target", winner);
      NS.emit("event:ended", { reason: "target", winner });
      return true;
    }
  }

  if (STATE.timer.remainingMs <= 0) {
    let winner: Side | null = null;
    if (STATE.leftScore > STATE.rightScore) winner = "red";
    else if (STATE.rightScore > STATE.leftScore) winner = "blue";
    else if (STATE.senshu) winner = STATE.senshu;
    setEnded("time", winner);
    NS.emit("event:ended", { reason: "time", winner });
    return true;
  }
  return false;
}

function startTicker() {
  if (TICK) return;
  TICK = setInterval(async () => {
    if (!STATE.timer.running) return;
    const dt = now() - STATE.timer.lastStartTs;
    STATE.timer.lastStartTs = now();
    STATE.timer.remainingMs = Math.max(0, STATE.timer.remainingMs - dt);
    endIfNeeded();
    await saveLastMatch(STATE);
    broadcastFull();
  }, 1000);
}

NS.on("connection", (socket) => {
  const sessionId = uuidv4();
  let role: "display" | "control" | "config" = "display";
  let authed = false;

  socket.on("auth:login", ({ role: r, pin }: { role: typeof role; pin?: string }, ack?: Function) => {
    role = r;
    if (role === "display") { authed = true; ack?.({ sessionId, role, controller: false }); broadcastFull(); return; }
    if (pin === SETTINGS.pin) { authed = true; ack?.({ sessionId, role, controller: controllerHolder === sessionId }); broadcastFull(); }
    else { ack?.({ error: { code: "AUTH_BAD_PIN" } }); }
  });

  socket.on("control:lock:claim", (_: {}, ack?: Function) => {
    if (!authed || role === "display") { ack?.({ error: { code: "NOT_CONTROLLER" } }); return; }
    controllerHolder = sessionId; heartbeats.set(sessionId, now());
    socket.emit("control:lock:granted", { holder: sessionId });
    NS.emit("control:lock:status", { holder: sessionId });
    ack?.({ ok: true });
  });

  socket.on("control:lock:release", (_: {}, ack?: Function) => {
    if (controllerHolder === sessionId) { controllerHolder = null; heartbeats.delete(sessionId); NS.emit("control:lock:status", { holder: null }); }
    ack?.({ ok: true });
  });

  socket.on("hb:ping", () => { if (controllerHolder === sessionId) heartbeats.set(sessionId, now()); });

  function requireController(ack?: Function) {
    if (!authed || controllerHolder !== sessionId) { ack?.({ error: { code: "NOT_CONTROLLER" } }); return false; }
    return true;
  }

  // Timer
  socket.on("timer:set", ({ initialMs }: { initialMs: number }, ack?: Function) => {
    if (!requireController(ack)) return;
    const ms = Math.max(0, Math.floor(initialMs));
    STATE.timer.initialMs = ms;
    STATE.timer.remainingMs = ms;
    STATE.timer.running = false;
    STATE.timer.lastStartTs = 0;
    STATE.ended = { over: false, winner: null, reason: "time" };
    saveLastMatch(STATE); broadcastFull(); ack?.({ ok: true });
  });

  // +time capped at initialMs
  socket.on("timer:add", ({ ms }: { ms: number }, ack?: Function) => {
    if (!requireController(ack)) return;
    if (STATE.ended.over) { ack?.({ error: { code: "MATCH_ENDED" } }); return; }
    const add = Math.max(0, Math.floor(ms || 0));
    const cap = STATE.timer.initialMs || 0;
    STATE.timer.remainingMs = Math.min(cap, STATE.timer.remainingMs + add);
    saveLastMatch(STATE); broadcastFull(); ack?.({ ok: true });
  });

  socket.on("timer:start", (_: {}, ack?: Function) => {
    if (!requireController(ack)) return;
    if (STATE.ended.over) { ack?.({ error: { code: "MATCH_ENDED" } }); return; }
    if (!STATE.timer.running) { STATE.timer.running = true; STATE.timer.lastStartTs = now(); startTicker(); }
    saveLastMatch(STATE); broadcastFull(); ack?.({ ok: true });
  });

  socket.on("timer:stop", (_: {}, ack?: Function) => {
    if (!requireController(ack)) return;
    STATE.timer.running = false; STATE.timer.lastStartTs = 0;
    saveLastMatch(STATE); broadcastFull(); ack?.({ ok: true });
  });

  socket.on("timer:reset", (_: {}, ack?: Function) => {
    if (!requireController(ack)) return;
    STATE.matchId = newMatchId();
    STATE.leftScore = 0; STATE.rightScore = 0;
    STATE.penalties = { left: { C1: 0, C2: 0 }, right: { C1: 0, C2: 0 } };
    STATE.senshu = null;
    STATE.ended = { over: false, winner: null, reason: "time" };
    STATE.timer.remainingMs = STATE.timer.initialMs;
    STATE.timer.running = false; STATE.timer.lastStartTs = 0;
    saveLastMatch(STATE); broadcastFull(); ack?.({ ok: true, matchId: STATE.matchId });
  });

  // Score
  socket.on("score:add", ({ side, delta }: { side: Side; delta: 1|2|3|-1 }, ack?: Function) => {
    if (!requireController(ack)) return;
    if (STATE.ended.over) { ack?.({ error: { code: "MATCH_ENDED" } }); return; }
    if (side === "red") STATE.leftScore = clamp(STATE.leftScore + delta, 0, 99);
    else STATE.rightScore = clamp(STATE.rightScore + delta, 0, 99);
    if (!STATE.senshu && delta > 0) STATE.senshu = side;
    endIfNeeded(); saveLastMatch(STATE); broadcastFull(); ack?.({ ok: true });
  });

  // Penalties
  socket.on("penalty:add", ({ side, cat, delta }: { side: Side; cat: Cat; delta: 1|-1 }, ack?: Function) => {
    if (!requireController(ack)) return;
    if (STATE.ended.over) { ack?.({ error: { code: "MATCH_ENDED" } }); return; }
    const p = side === "red" ? STATE.penalties.left : STATE.penalties.right;
    const key = cat as "C1"|"C2"; const val = Math.max(0, (p as any)[key] + delta);
    (p as any)[key] = val;
    endIfNeeded(); saveLastMatch(STATE); broadcastFull(); ack?.({ ok: true });
  });

  // Senshu
  socket.on("senshu:set", ({ side }: { side: Side | null }, ack?: Function) => {
    if (!requireController(ack)) return;
    if (STATE.ended.over) { ack?.({ error: { code: "MATCH_ENDED" } }); return; }
    STATE.senshu = side; saveLastMatch(STATE); broadcastFull(); ack?.({ ok: true });
  });

  // Rules + visibility + PIN
  socket.on("rules:set", ({ pointGap, targetScore, penaltyLimit }: { pointGap?: number; targetScore?: number | null; penaltyLimit?: number }, ack?: Function) => {
    if (!requireController(ack)) return;
    if (typeof pointGap === "number") STATE.rules.pointGap = clamp(pointGap, 1, 99);
    if (typeof targetScore === "number" || targetScore === null) STATE.rules.targetScore = targetScore === null ? null : clamp(targetScore, 1, 99);
    if (typeof penaltyLimit === "number") STATE.rules.penaltyLimit = clamp(penaltyLimit, 1, 99);
    endIfNeeded(); saveLastMatch(STATE); broadcastFull(); ack?.({ ok: true });
  });

  socket.on("penaltyVisibility:set", ({ cat, visible }: { cat: Cat; visible: boolean }, ack?: Function) => {
    if (!requireController(ack)) return;
    STATE.penaltyVisibility[cat] = !!visible; saveLastMatch(STATE); broadcastFull(); ack?.({ ok: true });
  });

  socket.on("config:save", async ({ durationMs, pointGap, targetScore, penaltyVisibility, pin, penaltyLimit }: any, ack?: Function) => {
    if (!requireController(ack)) return;
    STATE.timer.initialMs = Math.max(0, Math.floor(durationMs || 0));
    STATE.timer.remainingMs = STATE.timer.initialMs;
    STATE.timer.running = false; STATE.timer.lastStartTs = 0;
    STATE.rules.pointGap = clamp(pointGap ?? STATE.rules.pointGap, 1, 99);
    STATE.rules.targetScore = typeof targetScore === "number" ? clamp(targetScore, 1, 99) : null;
    STATE.rules.penaltyLimit = clamp(penaltyLimit ?? STATE.rules.penaltyLimit, 1, 99);
    STATE.penaltyVisibility = {
      C1: !!(penaltyVisibility?.C1 ?? true),
      C2: !!(penaltyVisibility?.C2 ?? true)
    };
    SETTINGS.pin = String(pin ?? (SETTINGS.pin || "0000"));
    SETTINGS.penaltyVisibility = STATE.penaltyVisibility;
    await saveSettings(SETTINGS);
    await saveLastMatch(STATE);
    broadcastFull();
    ack?.({ ok: true });
  });

  socket.on("disconnect", () => {
    if (controllerHolder === sessionId) { controllerHolder = null; NS.emit("control:lock:status", { holder: null }); }
    heartbeats.delete(sessionId);
  });
});

setInterval(() => {
  if (!controllerHolder) return;
  const t = heartbeats.get(controllerHolder);
  if (!t || Date.now() - t > 6000) { controllerHolder = null; NS.emit("control:lock:status", { holder: null }); }
}, 2000);

await init();
startTicker();
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`WS on :${PORT}`));

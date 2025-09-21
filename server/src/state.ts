export type Side = "red" | "blue";
export type Cat = "C1" | "C2";

export type TimerState = {
  initialMs: number;
  remainingMs: number;
  running: boolean;
  lastStartTs: number;
};

export type Penalties = { C1: number; C2: number };

export type Settings = {
  pin: string;
  penaltyVisibility: { C1: boolean; C2: boolean };
};

export type Rules = {
  pointGap: number;
  targetScore: number | null;
  penaltyLimit: number; // total C1+C2 limit to auto-end
};

export type Ended = {
  over: boolean;
  winner: Side | null; // null only if truly no winner
  reason: "gap" | "target" | "time" | "penalty";
};

export type AppState = {
  wsVersion: string;
  matchId: string;
  leftScore: number;   // red
  rightScore: number;  // blue
  timer: TimerState;
  senshu: Side | null;
  penalties: { left: Penalties; right: Penalties };
  penaltyVisibility: { C1: boolean; C2: boolean };
  rules: Rules;
  ended: Ended;
};

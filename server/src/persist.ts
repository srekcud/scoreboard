import fs from "fs-extra";
import path from "path";
import type { AppState, Settings } from "./state.js";

const DATA_DIR = process.env.DATA_PATH ? path.dirname(process.env.DATA_PATH) : path.resolve("./data");
const LAST_MATCH_PATH = process.env.DATA_PATH || path.join(DATA_DIR, "last-match.json");
const SETTINGS_PATH = process.env.SETTINGS_PATH || path.join(DATA_DIR, "settings.json");

export async function ensureDataDir() { await fs.ensureDir(DATA_DIR); }
export async function saveLastMatch(state: AppState) { await fs.writeJson(LAST_MATCH_PATH, state, { spaces: 2 }); }
export async function loadLastMatch<T = AppState>(): Promise<T | null> {
  try { return await fs.readJson(LAST_MATCH_PATH); } catch { return null; }
}
export async function saveSettings(settings: Settings) { await fs.writeJson(SETTINGS_PATH, settings, { spaces: 2 }); }
export async function loadSettings(): Promise<Settings> {
  try { return await fs.readJson(SETTINGS_PATH); }
  catch { return { pin: "0000", penaltyVisibility: { C1: true, C2: true } }; }
}
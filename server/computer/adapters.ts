import type { ComputerExecutionMode, ComputerSessionState } from "./state";

export type ComputerRuntimeId = "cloud_browser" | "desktop_companion" | "browser_extension" | "api_tools";

export interface ComputerRuntimeCapabilities {
  [key: string]: boolean;
  visual: boolean;
  takeover: boolean;
  screenshots: boolean;
  browser: boolean;
  desktop: boolean;
  apiTools: boolean;
}

export interface ComputerStartRequest {
  sessionId: number;
  userId: number;
  agentId: string;
  goal: string;
  mode: ComputerExecutionMode;
}

export interface ComputerRuntimeHandle {
  runtimeId: ComputerRuntimeId;
  externalSessionId?: string;
  viewerUrl?: string;
  state: ComputerSessionState;
  capabilities: ComputerRuntimeCapabilities;
}

export interface ComputerRuntimeAdapter {
  id: ComputerRuntimeId;
  capabilities: ComputerRuntimeCapabilities;
  isAvailable(): Promise<boolean>;
  start(request: ComputerStartRequest): Promise<ComputerRuntimeHandle>;
  pause(handle: ComputerRuntimeHandle): Promise<void>;
  resume(handle: ComputerRuntimeHandle): Promise<void>;
  stop(handle: ComputerRuntimeHandle): Promise<void>;
  takeControl?(handle: ComputerRuntimeHandle): Promise<void>;
  returnControl?(handle: ComputerRuntimeHandle): Promise<void>;
}

export const RUNTIME_CATALOG: Record<ComputerRuntimeId, ComputerRuntimeCapabilities> = {
  cloud_browser: {
    visual: true,
    takeover: true,
    screenshots: true,
    browser: true,
    desktop: false,
    apiTools: false,
  },
  desktop_companion: {
    visual: true,
    takeover: true,
    screenshots: true,
    browser: true,
    desktop: true,
    apiTools: true,
  },
  browser_extension: {
    visual: true,
    takeover: false,
    screenshots: true,
    browser: true,
    desktop: false,
    apiTools: true,
  },
  api_tools: {
    visual: false,
    takeover: false,
    screenshots: false,
    browser: false,
    desktop: false,
    apiTools: true,
  },
};

export function chooseExecutionMode(runtimeId: ComputerRuntimeId): ComputerExecutionMode {
  return RUNTIME_CATALOG[runtimeId].visual ? "visual_computer" : "tool";
}

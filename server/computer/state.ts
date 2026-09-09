export type ComputerExecutionMode = "tool" | "visual_computer";

export type ComputerSessionState =
  | "queued"
  | "starting"
  | "running"
  | "paused"
  | "waiting_approval"
  | "takeover"
  | "completed"
  | "failed"
  | "stopped";

export type ComputerCommand =
  | "start"
  | "pause"
  | "resume"
  | "take_control"
  | "return_control"
  | "wait_for_approval"
  | "approve"
  | "complete"
  | "fail"
  | "stop";

const TRANSITIONS: Record<ComputerSessionState, Partial<Record<ComputerCommand, ComputerSessionState>>> = {
  queued: { start: "starting", stop: "stopped" },
  starting: { start: "running", fail: "failed", stop: "stopped" },
  running: {
    pause: "paused",
    take_control: "takeover",
    wait_for_approval: "waiting_approval",
    complete: "completed",
    fail: "failed",
    stop: "stopped",
  },
  paused: { resume: "running", take_control: "takeover", stop: "stopped" },
  waiting_approval: { approve: "running", take_control: "takeover", stop: "stopped", fail: "failed" },
  takeover: { return_control: "running", stop: "stopped", complete: "completed" },
  completed: {},
  failed: {},
  stopped: {},
};

export function transitionComputerSession(
  current: ComputerSessionState,
  command: ComputerCommand
): ComputerSessionState {
  const next = TRANSITIONS[current][command];
  if (!next) throw new Error(`Invalid computer session transition: ${current} -> ${command}`);
  return next;
}

export function isTerminalComputerState(state: ComputerSessionState): boolean {
  return state === "completed" || state === "failed" || state === "stopped";
}

export function canUserTakeControl(state: ComputerSessionState): boolean {
  return state === "running" || state === "paused" || state === "waiting_approval";
}

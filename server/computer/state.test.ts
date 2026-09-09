import { describe, expect, it } from "vitest";
import { canUserTakeControl, transitionComputerSession } from "./state";
import { chooseExecutionMode } from "./adapters";

describe("agent computer state machine", () => {
  it("moves through a normal execution lifecycle", () => {
    expect(transitionComputerSession("queued", "start")).toBe("starting");
    expect(transitionComputerSession("starting", "start")).toBe("running");
    expect(transitionComputerSession("running", "pause")).toBe("paused");
    expect(transitionComputerSession("paused", "resume")).toBe("running");
    expect(transitionComputerSession("running", "complete")).toBe("completed");
  });

  it("supports takeover and return of control", () => {
    expect(canUserTakeControl("running")).toBe(true);
    expect(transitionComputerSession("running", "take_control")).toBe("takeover");
    expect(transitionComputerSession("takeover", "return_control")).toBe("running");
  });

  it("rejects unsafe invalid transitions", () => {
    expect(() => transitionComputerSession("completed", "resume")).toThrow(/Invalid computer session transition/);
    expect(() => transitionComputerSession("queued", "take_control")).toThrow(/Invalid computer session transition/);
  });

  it("uses timeline-only tool mode for API execution", () => {
    expect(chooseExecutionMode("api_tools")).toBe("tool");
    expect(chooseExecutionMode("cloud_browser")).toBe("visual_computer");
  });
});

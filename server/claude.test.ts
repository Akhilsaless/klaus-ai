import { describe, expect, it } from "vitest";
import { validateAnthropicKey } from "./_core/claude";
import { getProviderHealth, selectProvider } from "./ai/router";

describe("Klaus AI provider foundation", () => {
  it("keeps routine work on the free provider", () => {
    expect(selectProvider({ taskClass: "routine" })).toBe("free");
  });

  it("allows explicitly forcing the free provider", () => {
    expect(
      selectProvider({ taskClass: "critical_verification", forceProvider: "free" })
    ).toBe("free");
  });

  it("reports provider health without exposing secrets", () => {
    const health = getProviderHealth();
    expect(health.map((item) => item.provider)).toEqual(["free", "openai"]);
    expect(JSON.stringify(health)).not.toContain("apiKey");
    expect(JSON.stringify(health)).not.toContain("OPENAI_API_KEY");
  });

  it("keeps the legacy validation facade tied to the free runtime", () => {
    const result = validateAnthropicKey();
    if (process.env.BUILT_IN_FORGE_API_KEY) {
      expect(result.valid).toBe(true);
    } else {
      expect(result.valid).toBe(false);
      expect(result.error).toContain("free provider unavailable");
    }
  });
});

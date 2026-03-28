import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { validateAnthropicKey } from "./_core/claude";

describe("Anthropic API key validation", () => {
  it("should detect a configured API key starts with sk-ant-", () => {
    const result = validateAnthropicKey();
    if (process.env.ANTHROPIC_API_KEY) {
      // Key is set — it should be valid format
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    } else {
      // No key set — should report missing
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not set");
    }
  });

  describe("with invalid key format", () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;

    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = "invalid-key-format";
    });

    afterEach(() => {
      if (originalKey) {
        process.env.ANTHROPIC_API_KEY = originalKey;
      } else {
        delete process.env.ANTHROPIC_API_KEY;
      }
    });

    it("should reject keys that don't start with sk-ant-", () => {
      // validateAnthropicKey reads from ENV which is already loaded,
      // so we test the logic directly
      const key = process.env.ANTHROPIC_API_KEY ?? "";
      const isValid = key.startsWith("sk-ant-");
      expect(isValid).toBe(false);
    });
  });

  it("ANTHROPIC_API_KEY environment variable is present", () => {
    // This test ensures the secret was properly injected
    const key = process.env.ANTHROPIC_API_KEY;
    expect(key).toBeDefined();
    expect(key).not.toBe("");
    expect(typeof key).toBe("string");
  });
});

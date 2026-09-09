import { describe, expect, it } from "vitest";
import { getWakeStrategy, supportsCapability } from "./capabilities";
import { canCreateAuthorizedCustomVoice, chooseVoiceProvider } from "../voice/types";

describe("cross-device capabilities", () => {
  it("supports local wake on desktop and Android", () => {
    expect(getWakeStrategy("windows")).toBe("local_hotword");
    expect(getWakeStrategy("android")).toBe("local_hotword");
    expect(supportsCapability("android", "voice_wake")).toBe(true);
  });

  it("does not pretend iOS has unrestricted always-on custom hotword access", () => {
    expect(getWakeStrategy("ios")).toBe("shortcut_or_push");
    expect(supportsCapability("ios", "voice_wake")).toBe(false);
    expect(supportsCapability("ios", "desktop_control")).toBe(false);
  });
});

describe("voice routing and consent", () => {
  it("uses local/free voice by default", () => {
    expect(chooseVoiceProvider({ openAIConfigured: true, preferFree: true, mode: "standard" })).toBe("local");
  });

  it("uses OpenAI only for requested premium realtime when configured", () => {
    expect(chooseVoiceProvider({ openAIConfigured: true, preferFree: false, mode: "premium_realtime" })).toBe("openai");
    expect(chooseVoiceProvider({ openAIConfigured: false, preferFree: false, mode: "premium_realtime" })).toBe("local");
  });

  it("requires explicit consent artifacts for authorized custom voice", () => {
    expect(
      canCreateAuthorizedCustomVoice({
        userId: 1,
        profileName: "My Klaus",
        provider: "openai",
        consented: true,
        consentTextHash: "1234567890abcdef",
        sourceRecordingRef: "secure://voice/1",
      })
    ).toBe(true);
    expect(
      canCreateAuthorizedCustomVoice({
        userId: 1,
        profileName: "My Klaus",
        provider: "openai",
        consented: true,
      })
    ).toBe(false);
  });
});

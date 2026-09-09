import { describe, expect, it } from "vitest";
import { classifyTask } from "./classifier";
import { decideProvider } from "./router";
import { getProviderDefinitions, providerHasCapabilities } from "./registry";

describe("AI brain task classification", () => {
  it("classifies summaries as summarization", () => {
    expect(classifyTask("Summarize these meeting notes")).toBe("summarization");
  });

  it("classifies computer interaction tasks", () => {
    expect(classifyTask("Open the browser and fill form fields on the website")).toBe("computer_use");
  });

  it("classifies verification work", () => {
    expect(classifyTask("Validate these numbers and double check accuracy")).toBe("critical_verification");
  });
});

describe("AI provider registry", () => {
  it("keeps the free pool as a first-class provider", () => {
    const providers = getProviderDefinitions();
    expect(providers.some((provider) => provider.id === "free" && provider.tier === "free")).toBe(true);
  });

  it("reserves computer-use capability for the advanced provider", () => {
    expect(providerHasCapabilities("free", ["computer_use"])).toBe(false);
    expect(providerHasCapabilities("openai", ["computer_use"])).toBe(true);
  });
});

describe("AI routing policy", () => {
  it("routes routine work to free by default", () => {
    const decision = decideProvider("Write a short reply", { taskClass: "routine" });
    expect(decision.provider).toBe("free");
    expect(decision.reason).toContain("free-first");
  });

  it("honors lowest-cost preference for eligible work", () => {
    const decision = decideProvider("Create a careful plan", {
      taskClass: "complex_planning",
      costPreference: "lowest",
    });
    expect(decision.provider).toBe("free");
  });

  it("refuses a capability that no configured provider can currently satisfy", () => {
    // In CI OPENAI_API_KEY is intentionally absent, so computer-use is not available yet.
    expect(() =>
      decideProvider("Use a computer", {
        taskClass: "computer_use",
        requireCapabilities: ["computer_use"],
      })
    ).toThrow(/No configured AI provider/);
  });
});

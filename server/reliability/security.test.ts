import { afterEach, describe, expect, it } from "vitest";
import { isAllowedOrigin, publicErrorMessage, sanitizeDownloadFilename } from "./security";

const originalNodeEnv = process.env.NODE_ENV;
const originalOrigins = process.env.ALLOWED_ORIGINS;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  if (originalOrigins === undefined) delete process.env.ALLOWED_ORIGINS;
  else process.env.ALLOWED_ORIGINS = originalOrigins;
});

describe("security policy", () => {
  it("removes header-breaking and path characters from download filenames", () => {
    expect(sanitizeDownloadFilename("../../report\r\nX-Test: bad.pdf")).toBe(".._.._reportX-Test_ bad.pdf");
  });

  it("requires an allowlist for production cross-origin mutations", () => {
    process.env.NODE_ENV = "production";
    delete process.env.ALLOWED_ORIGINS;
    expect(isAllowedOrigin("https://evil.example")).toBe(false);
    expect(isAllowedOrigin(undefined)).toBe(true);
  });

  it("accepts configured production origins", () => {
    process.env.NODE_ENV = "production";
    process.env.ALLOWED_ORIGINS = "https://klaus.example, https://app.klaus.example";
    expect(isAllowedOrigin("https://app.klaus.example")).toBe(true);
    expect(isAllowedOrigin("https://evil.example")).toBe(false);
  });

  it("does not leak internal error messages in production", () => {
    process.env.NODE_ENV = "production";
    expect(publicErrorMessage(new Error("database password leaked"))).not.toContain("password");
  });
});

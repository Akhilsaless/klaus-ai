export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",

  // Free-first provider (currently Manus Forge/Gemini-compatible runtime).
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",

  // Optional advanced provider. Klaus must continue to work without this key.
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  openAiAdvancedModel: process.env.OPENAI_ADVANCED_MODEL ?? "gpt-5.6",

  // Legacy only. Do not route new work through Anthropic.
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
};

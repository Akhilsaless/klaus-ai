import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";
import {
  getWakeStrategy,
  PLATFORM_CAPABILITIES,
  type DevicePlatform,
} from "./capabilities";
import {
  createHandoff,
  createVoiceProfile,
  createVoiceSession,
  getDevice,
  listDevices,
  listVoiceProfiles,
  registerDevice,
  revokeDevice,
  upsertWakeSetting,
} from "./store";
import {
  canCreateAuthorizedCustomVoice,
  chooseVoiceProvider,
  VOICE_PROVIDER_CAPABILITIES,
} from "../voice/types";

const platformSchema = z.enum(["windows", "macos", "android", "ios", "web", "cloud"]);

export const deviceRouter = router({
  platformCapabilities: protectedProcedure.query(() => PLATFORM_CAPABILITIES),
  voiceProviderCapabilities: protectedProcedure.query(() => VOICE_PROVIDER_CAPABILITIES),

  register: protectedProcedure
    .input(
      z.object({
        deviceKey: z.string().min(8).max(128),
        name: z.string().min(1).max(256),
        platform: platformSchema,
      })
    )
    .mutation(({ ctx, input }) =>
      registerDevice({
        userId: ctx.user.id,
        deviceKey: input.deviceKey,
        name: input.name,
        platform: input.platform,
        status: "active",
        capabilities: PLATFORM_CAPABILITIES[input.platform],
      })
    ),

  list: protectedProcedure.query(({ ctx }) => listDevices(ctx.user.id)),

  revoke: protectedProcedure
    .input(z.object({ deviceId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await revokeDevice(input.deviceId, ctx.user.id);
      return { success: true } as const;
    }),

  wakeStrategy: protectedProcedure
    .input(z.object({ platform: platformSchema }))
    .query(({ input }) => ({
      platform: input.platform,
      strategy: getWakeStrategy(input.platform),
      alwaysOnClaimAllowed: input.platform !== "ios",
    })),

  configureWake: protectedProcedure
    .input(
      z.object({
        deviceId: z.number().int().positive(),
        enabled: z.boolean(),
        wakePhrase: z.string().min(1).max(64).default("Hey Klaus"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const device = await getDevice(input.deviceId, ctx.user.id);
      if (!device || device.status === "revoked") throw new Error("Device not available");
      const strategy = getWakeStrategy(device.platform as DevicePlatform);
      if (input.enabled && strategy === "not_supported") throw new Error("Wake is not supported on this platform");
      await upsertWakeSetting({
        userId: ctx.user.id,
        deviceId: device.id,
        enabled: input.enabled ? 1 : 0,
        wakePhrase: input.wakePhrase,
        strategy,
        localOnly: 1,
      });
      return {
        enabled: input.enabled,
        wakePhrase: input.wakePhrase,
        strategy,
        note:
          strategy === "local_hotword"
            ? "Wake detection is designed to run locally in the companion runtime."
            : "Use a platform shortcut or push-to-talk entry point.",
      };
    }),

  handoff: protectedProcedure
    .input(
      z.object({
        taskId: z.number().int().positive().optional(),
        computerSessionId: z.number().int().positive().optional(),
        fromDeviceId: z.number().int().positive().optional(),
        toDeviceId: z.number().int().positive().optional(),
        context: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.toDeviceId && !input.computerSessionId) {
        throw new Error("Handoff requires a target device or cloud computer session");
      }
      if (input.toDeviceId) {
        const target = await getDevice(input.toDeviceId, ctx.user.id);
        if (!target || target.status === "revoked") throw new Error("Target device not available");
      }
      return createHandoff({
        userId: ctx.user.id,
        taskId: input.taskId,
        computerSessionId: input.computerSessionId,
        fromDeviceId: input.fromDeviceId,
        toDeviceId: input.toDeviceId,
        status: "requested",
        context: input.context ?? {},
      });
    }),

  voice: router({
    profiles: protectedProcedure.query(({ ctx }) => listVoiceProfiles(ctx.user.id)),

    createBuiltInProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(256),
          provider: z.enum(["local", "openai"]).default("local"),
          providerVoiceId: z.string().max(512).optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        createVoiceProfile({
          userId: ctx.user.id,
          name: input.name,
          profileType: "built_in",
          provider: input.provider,
          providerVoiceId: input.providerVoiceId,
          consentStatus: "not_required",
          enabled: 1,
        })
      ),

    registerAuthorizedCustomProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(256),
          consented: z.literal(true),
          consentTextHash: z.string().min(16).max(128),
          sourceRecordingRef: z.string().min(1).max(1024),
          providerVoiceId: z.string().max(512).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const validConsent = canCreateAuthorizedCustomVoice({
          userId: ctx.user.id,
          profileName: input.name,
          provider: "openai",
          consented: input.consented,
          consentTextHash: input.consentTextHash,
          sourceRecordingRef: input.sourceRecordingRef,
        });
        if (!validConsent) throw new Error("Explicit custom voice consent is required");

        return createVoiceProfile({
          userId: ctx.user.id,
          name: input.name,
          profileType: "authorized_custom",
          provider: "openai",
          providerVoiceId: input.providerVoiceId,
          consentStatus: "granted",
          consentTextHash: input.consentTextHash,
          sourceRecordingRef: input.sourceRecordingRef,
          enabled: 1,
        });
      }),

    startSession: protectedProcedure
      .input(
        z.object({
          deviceId: z.number().int().positive().optional(),
          mode: z.enum(["standard", "premium_realtime"]).default("standard"),
          preferFree: z.boolean().default(true),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (input.deviceId) {
          const device = await getDevice(input.deviceId, ctx.user.id);
          if (!device || device.status === "revoked") throw new Error("Device not available");
        }
        const provider = chooseVoiceProvider({
          mode: input.mode,
          openAIConfigured: Boolean(ENV.openAiApiKey),
          preferFree: input.preferFree,
        });
        if (input.mode === "premium_realtime" && provider !== "openai") {
          return {
            started: false,
            provider,
            reason: "Premium realtime voice requires the optional OpenAI integration; standard local/free voice remains available.",
          } as const;
        }
        const session = await createVoiceSession({
          userId: ctx.user.id,
          deviceId: input.deviceId,
          provider,
          mode: input.mode,
          status: "starting",
          metadata: { transportWired: false },
        });
        return { started: true, provider, session, transportWired: false } as const;
      }),
  }),
});

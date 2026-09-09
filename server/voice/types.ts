export type VoiceProviderId = "local" | "openai";
export type VoiceMode = "standard" | "premium_realtime";
export type VoiceProfileType = "built_in" | "authorized_custom";

export interface VoiceProviderCapabilities {
  speechToText: boolean;
  textToSpeech: boolean;
  realtimeConversation: boolean;
  customVoice: boolean;
  requiresApiKey: boolean;
}

export const VOICE_PROVIDER_CAPABILITIES: Record<VoiceProviderId, VoiceProviderCapabilities> = {
  local: {
    speechToText: true,
    textToSpeech: true,
    realtimeConversation: false,
    customVoice: false,
    requiresApiKey: false,
  },
  openai: {
    speechToText: true,
    textToSpeech: true,
    realtimeConversation: true,
    customVoice: true,
    requiresApiKey: true,
  },
};

export interface VoiceConsentInput {
  userId: number;
  profileName: string;
  provider: VoiceProviderId;
  consented: boolean;
  consentTextHash?: string;
  sourceRecordingRef?: string;
}

export function canCreateAuthorizedCustomVoice(input: VoiceConsentInput): boolean {
  return (
    input.consented === true &&
    input.provider === "openai" &&
    Boolean(input.consentTextHash) &&
    Boolean(input.sourceRecordingRef)
  );
}

export function chooseVoiceProvider(params: {
  mode?: VoiceMode;
  openAIConfigured: boolean;
  preferFree?: boolean;
}): VoiceProviderId {
  if (params.mode === "premium_realtime" && params.openAIConfigured && !params.preferFree) return "openai";
  return "local";
}

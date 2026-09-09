export type DevicePlatform = "windows" | "macos" | "android" | "ios" | "web" | "cloud";

export type DeviceCapability =
  | "voice_wake"
  | "push_to_talk"
  | "screen_observe"
  | "browser_control"
  | "desktop_control"
  | "mobile_actions"
  | "notifications"
  | "camera"
  | "handoff"
  | "background_jobs";

export const PLATFORM_CAPABILITIES: Record<DevicePlatform, DeviceCapability[]> = {
  windows: ["voice_wake", "push_to_talk", "screen_observe", "browser_control", "desktop_control", "notifications", "handoff", "background_jobs"],
  macos: ["voice_wake", "push_to_talk", "screen_observe", "browser_control", "desktop_control", "notifications", "handoff", "background_jobs"],
  android: ["voice_wake", "push_to_talk", "screen_observe", "browser_control", "mobile_actions", "notifications", "camera", "handoff", "background_jobs"],
  ios: ["push_to_talk", "notifications", "camera", "handoff"],
  web: ["push_to_talk", "browser_control", "notifications", "handoff"],
  cloud: ["browser_control", "handoff", "background_jobs"],
};

export function supportsCapability(platform: DevicePlatform, capability: DeviceCapability): boolean {
  return PLATFORM_CAPABILITIES[platform].includes(capability);
}

export function getWakeStrategy(platform: DevicePlatform): "local_hotword" | "shortcut_or_push" | "not_supported" {
  if (platform === "windows" || platform === "macos" || platform === "android") return "local_hotword";
  if (platform === "ios" || platform === "web") return "shortcut_or_push";
  return "not_supported";
}

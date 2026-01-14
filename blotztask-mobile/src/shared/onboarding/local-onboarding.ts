import AsyncStorage from "@react-native-async-storage/async-storage";

export type LocalOnboardingStep = 1 | 2 | 3 | 4 | 5 | "done";

const STORAGE_KEY = "local_onboarding_step_v1";

export async function getLocalOnboardingStep(): Promise<LocalOnboardingStep | null> {
  const v = await AsyncStorage.getItem(STORAGE_KEY);
  if (!v) return null;
  if (v === "done") return "done";
  const n = Number(v);
  return (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) ? (n as LocalOnboardingStep) : null;
}

export async function setLocalOnboardingStep(step: LocalOnboardingStep) {
  await AsyncStorage.setItem(STORAGE_KEY, String(step));
}

export async function resetLocalOnboarding() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

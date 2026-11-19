import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@/shared/constants/storage-keys";

/** Profile names from the API's AiCoach:Models config. */
export type CoachModel = "luna6" | "sol";

export const COACH_MODELS: readonly CoachModel[] = ["luna6", "sol"];
const DEFAULT_COACH_MODEL: CoachModel = "luna6";

/**
 * Dev and staging builds only: the tester picks which model AI Coach uses for their messages.
 * Production builds never send it, and the production API ignores it (AiCoach:AllowModelOverride).
 */
export const isCoachModelSwitchEnabled = process.env.EXPO_PUBLIC_APP_ENV !== "production";

const isCoachModel = (value: string | null): value is CoachModel =>
  value !== null && (COACH_MODELS as readonly string[]).includes(value);

export async function getCoachModel(): Promise<CoachModel> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.AI_COACH_MODEL);
    return isCoachModel(stored) ? stored : DEFAULT_COACH_MODEL;
  } catch {
    return DEFAULT_COACH_MODEL;
  }
}

export async function setCoachModel(model: CoachModel): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.AI_COACH_MODEL, model);
}

/** The `model` field for a send-message body; undefined in production so the field is left out. */
export async function coachModelForRequest(): Promise<CoachModel | undefined> {
  return isCoachModelSwitchEnabled ? getCoachModel() : undefined;
}

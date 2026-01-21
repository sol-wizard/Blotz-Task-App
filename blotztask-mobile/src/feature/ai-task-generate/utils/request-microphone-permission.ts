import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import { PermissionsAndroid, Platform } from "react-native";

export const requestIOSMicrophonePermission = async () => {
  const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  return perm.status;
};

export const requestAndroidMicPermission = async (translations?: {
  title: string;
  message: string;
  ok: string;
  cancel: string;
}) => {
  if (Platform.OS !== "android") return true;

  try {
    const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);

    if (granted) {
      console.log("[Mic] permission already granted");
      return true;
    }

    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
      title: translations?.title ?? "Microphone Permission",
      message: translations?.message ?? "We need access to your microphone for voice input.",
      buttonPositive: translations?.ok ?? "OK",
      buttonNegative: translations?.cancel ?? "Cancel",
    });

    const ok = result === PermissionsAndroid.RESULTS.GRANTED;

    return ok;
  } catch (err) {
    console.error("[Mic] permission error:", err);
    return false;
  }
};

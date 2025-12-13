import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";

export const requestMicrophonePermission = async () => {
  const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  return perm.status;
};

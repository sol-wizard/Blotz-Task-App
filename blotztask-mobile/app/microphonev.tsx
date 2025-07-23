import { useState } from "react";
import { View, StyleSheet, Button, Alert } from "react-native";
import {
  useAudioPlayer,
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorderState,
} from "expo-audio";

const testAudioSource = require("../assets/Musinova.mp3");

export default function Microphone() {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const [uri, setUri] = useState<string | null>(null);
  const [player, setPlayer] = useState<ReturnType<
    typeof useAudioPlayer
  > | null>(null);

  const record = async () => {
    const status = await AudioModule.requestRecordingPermissionsAsync();
    if (!status.granted) {
      Alert.alert("Permission to access microphone was denied");
      return;
    }

    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: true,
      shouldRouteThroughEarpiece: false,
    });

    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
  };

  const stopRecording = async () => {
    await audioRecorder.stop();

    if (audioRecorder.uri) {
      console.log("🎙️ Recorded file URI:", audioRecorder.uri);
      setUri(audioRecorder.uri);

      const newPlayer = useAudioPlayer(audioRecorder.uri);
      setPlayer(newPlayer);
    } else {
      console.warn("⚠️ No URI found after recording.");
    }
  };

  return (
    <View style={styles.container}>
      <Button
        title={recorderState.isRecording ? "Stop Recording" : "Start Recording"}
        onPress={recorderState.isRecording ? stopRecording : record}
      />

      <Button
        title="Play Recording"
        onPress={() => {
          console.log("🔊 Playing:", uri);
          player?.play();
        }}
        disabled={!uri}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#ecf0f1",
    padding: 10,
  },
});

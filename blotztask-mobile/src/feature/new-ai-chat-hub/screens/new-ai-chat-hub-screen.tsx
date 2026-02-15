import React, { useEffect, useState } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  AudioQuality,
  IOSOutputFormat,
  RecordingOptions,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";

const recorderOptions = {
  extension: ".wav",
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 256000,
  isMeteringEnabled: true,
  android: {
    outputFormat: "default",
    audioEncoder: "default",
  },
  ios: {
    audioQuality: AudioQuality.HIGH,
    outputFormat: IOSOutputFormat.LINEARPCM,
  },
  web: {},
} satisfies RecordingOptions;

export default function NewAiChatHubScreen() {
  const { height } = useWindowDimensions();
  const [isRecording, setIsRecording] = useState<boolean>(true);
  const audioRecorder = useAudioRecorder(recorderOptions);
  const recorderState = useAudioRecorderState(audioRecorder);

  useEffect(() => {
    async function requestPermission() {
      const { granted } = await requestRecordingPermissionsAsync();
      if (granted) {
        console.log("Permission granted");
      }
    }

    requestPermission();
    if (!isRecording) {
      return;
    }
    startRecording();
  }, [isRecording]);

  async function startRecording() {
    try {
      if (recorderState.isRecording) {
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      console.log("Starting recording..");

      setIsRecording(true);
      console.log("Recording started");
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  }

  async function stopRecording() {
    if (!audioRecorder) {
      return;
    }
    if (!recorderState.isRecording) {
      return;
    }
    console.log("Stopping recording..");

    await audioRecorder.stop();
    setIsRecording(false);
    const uri = audioRecorder.uri;
    console.log("Recording stopped and stored at", uri);
  }

  return (
    <View className="flex-1 bg-transparent">
      <Pressable className="absolute inset-0" onPress={() => router.back()} pointerEvents="auto" />
      <View className="flex-1 justify-end">
        <LinearGradient
          colors={["#8ACB22", "#49A35E", "#3B82F6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            height: height * 0.84,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 24,
          }}
          pointerEvents="auto"
        >
          <View className="items-end">
            <Pressable
              onPress={() => router.back()}
              className="items-center justify-center"
              hitSlop={10}
            >
              <MaterialCommunityIcons name="chevron-down" size={30} color="#FFFFFF" />
            </Pressable>
          </View>
          <View className="flex-1 items-center justify-center">
            <Text selectable className="mb-2 text-2xl font-semibold text-white font-baloo">
              Listening ...
            </Text>
            <Text selectable className="text-lg text-white/90 font-balooThin">
              Say everything you need to get done.
            </Text>
          </View>
          <View className="flex-row gap-3">
            <Pressable
              className={`flex-1 h-12 rounded-xl items-center justify-center flex-row border ${
                recorderState.isRecording ? "bg-white/20 border-white/30" : "bg-white border-white"
              }`}
              onPress={startRecording}
              disabled={recorderState.isRecording}
            >
              <MaterialCommunityIcons
                name="microphone-outline"
                size={20}
                color={recorderState.isRecording ? "#FFFFFF99" : "#1F2937"}
              />
              <Text
                className={`ml-2 font-semibold ${
                  recorderState.isRecording ? "text-white/70" : "text-gray-800"
                }`}
              >
                Start recording
              </Text>
            </Pressable>
            <Pressable
              className={`flex-1 h-12 rounded-xl items-center justify-center flex-row border ${
                recorderState.isRecording
                  ? "bg-red-500 border-red-500"
                  : "bg-white/20 border-white/30"
              }`}
              onPress={stopRecording}
              disabled={!recorderState.isRecording}
            >
              <MaterialCommunityIcons
                name="stop-circle-outline"
                size={20}
                color={recorderState.isRecording ? "#FFFFFF" : "#FFFFFF99"}
              />
              <Text
                className={`ml-2 font-semibold ${
                  recorderState.isRecording ? "text-white" : "text-white/70"
                }`}
              >
                Stop recording
              </Text>
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

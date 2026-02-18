import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
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
import { sendVoiceFile } from "../services/fast-transcription-service";
import { useAiTaskGenerator } from "@/feature/ai-task-generate/hooks/useAiTaskGenerator";
import { mapExtractedTaskDTOToAiTaskDTO } from "@/feature/ai-task-generate/utils/map-extracted-to-task-dto";
import { useAllLabels } from "@/shared/hooks/useAllLabels";
import { AiTaskDTO } from "@/feature/ai-task-generate/models/ai-task-dto";

const SILENCE_THRESHOLD_DB = -45;
const SPEECH_THRESHOLD_DB = -35;
const SILENCE_HOLD_MS = 900;
const MIN_CHUNK_DURATION_MS = 1200;

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

function GeneratedTaskTitles({ tasks }: { tasks?: AiTaskDTO[] }) {
  if (!tasks?.length) {
    return null;
  }

  return (
    <View className="mt-2 mb-2 gap-2">
      {tasks.map((task, index) => (
        <View key={task.id} className="rounded-xl bg-white/20 border border-white/30 px-3 py-2">
          <Text selectable className="text-white font-baloo text-base">
            {index + 1}. {task.title}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function NewAiChatHubScreen() {
  const { height } = useWindowDimensions();
  const audioRecorder = useAudioRecorder(recorderOptions);
  const recorderState = useAudioRecorderState(audioRecorder, 250);
  const { labels } = useAllLabels();

  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const setModalType = () => {
    return;
  };

  const { aiGeneratedMessage, generateFromHistory } = useAiTaskGenerator({
    setIsAiGenerating,
    setModalType,
  });

  const aiGeneratedTasks = aiGeneratedMessage?.extractedTasks.map((task) =>
    mapExtractedTaskDTOToAiTaskDTO(task, labels ?? []),
  );

  const isScreenActiveRef = useRef(false);

  const silenceStartedAtRef = useRef<number | null>(null);
  const speechDetectedInChunkRef = useRef(false);

  const startRecording = async () => {
    const status = audioRecorder.getStatus();
    if (status.isRecording) {
      return;
    }
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });

    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
    speechDetectedInChunkRef.current = false;
    silenceStartedAtRef.current = null;
    console.log("Continuous recording started");
  };

  const sendChunkAndContinue = async (reason: "silence" | "exit") => {
    const status = audioRecorder.getStatus();
    if (!status.isRecording) {
      return;
    }

    if (reason === "silence" && status.durationMillis < MIN_CHUNK_DURATION_MS) {
      return;
    }

    silenceStartedAtRef.current = null;

    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      if (
        uri &&
        status.durationMillis >= MIN_CHUNK_DURATION_MS &&
        speechDetectedInChunkRef.current
      ) {
        const transcriptionText = await sendVoiceFile(uri);
        console.log("Fast transcription result:", transcriptionText);
        await generateFromHistory();
      }
    } catch (error) {
      console.error("Failed to process recording chunk", error);
    }

    if (reason === "silence" && isScreenActiveRef.current) {
      try {
        await startRecording();
      } catch (error) {
        console.error("Failed to restart continuous recording", error);
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      isScreenActiveRef.current = true;

      async function startOnFocus() {
        try {
          const { granted } = await requestRecordingPermissionsAsync();
          if (!granted) {
            console.warn("Recording permission not granted");
            return;
          }
          await startRecording();
        } catch (error) {
          console.error("Failed to start recording on focus", error);
        }
      }

      void startOnFocus();

      return () => {
        isScreenActiveRef.current = false;
        silenceStartedAtRef.current = null;
        void sendChunkAndContinue("exit");
      };
    }, []),
  );

  useEffect(() => {
    if (!isScreenActiveRef.current || !recorderState.isRecording) {
      silenceStartedAtRef.current = null;
      return;
    }

    const metering = recorderState.metering;
    if (metering == null) {
      return;
    }

    // Mark this chunk as "has voice" once level reaches speech threshold.
    if (metering > SPEECH_THRESHOLD_DB) {
      speechDetectedInChunkRef.current = true;
      silenceStartedAtRef.current = null;
      return;
    }

    // If user has not spoken yet in this chunk, don't silence-flush.
    if (!speechDetectedInChunkRef.current) {
      silenceStartedAtRef.current = null;
      return;
    }

    const now = Date.now();
    if (metering <= SILENCE_THRESHOLD_DB) {
      if (silenceStartedAtRef.current == null) {
        silenceStartedAtRef.current = now;
        return;
      }

      if (now - silenceStartedAtRef.current >= SILENCE_HOLD_MS) {
        silenceStartedAtRef.current = null;
        void sendChunkAndContinue("silence");
      }
      return;
    }

    silenceStartedAtRef.current = null;
  }, [sendChunkAndContinue, recorderState.isRecording, recorderState.metering]);

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

          <GeneratedTaskTitles tasks={aiGeneratedTasks} />

          <View className="h-12 items-center justify-center">
            <Text className="text-white/80 font-balooThin">
              {recorderState.isRecording ? "Recording continuously" : "Preparing microphone..."}
            </Text>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

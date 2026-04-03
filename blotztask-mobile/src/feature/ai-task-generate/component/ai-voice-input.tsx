import React from "react";
import { View, Text, Pressable, useWindowDimensions, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { LOTTIE_ANIMATIONS } from "@/shared/constants/assets";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";
import { AiTaskDTO } from "../models/ai-task-dto";
import { AiNoteDTO } from "../models/ai-note-dto";
import { AiTaskCard } from "./ai-task-card";
import { AiNoteCard } from "./ai-note-card";

export const AiVoiceInput = ({
  transcribeAudio,
  aiTasks = [],
  aiNotes = [],
}: {
  transcribeAudio: (uri: string) => Promise<void>;
  aiTasks?: AiTaskDTO[];
  aiNotes?: AiNoteDTO[];
}) => {
  const { height } = useWindowDimensions();
  const { isListening, startListening, uploadAudio, abortListening } =
    useVoiceRecorder(transcribeAudio);

  const hasResults = aiTasks.length > 0 || aiNotes.length > 0;

  const handleToggleListen = () => {
    if (isListening) {
      void abortListening();
    } else {
      void startListening();
    }
  };

  return (
    <LinearGradient
      colors={["#A3DC2F", "#2F80ED"]}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={{ height: height * 0.8, borderRadius: 20 }}
    >
      <View className="flex-1 items-center">
        {/* Top row - dismiss button */}
        <View className="w-full items-end px-6 pt-4 pb-2">
          <Pressable onPress={() => void abortListening()} accessibilityLabel="Stop">
            <MaterialCommunityIcons name="chevron-down" size={32} color="white" />
          </Pressable>
        </View>

        {/* Center content */}
        <View className="flex-1 w-full items-center justify-center px-8">
          {hasResults ? (
            <ScrollView className="w-full" showsVerticalScrollIndicator={false}>
              {aiTasks.map((task) => (
                <AiTaskCard
                  key={task.id}
                  task={task}
                  handleTaskDelete={() => {}}
                />
              ))}
              {aiNotes.length > 0 && (
                <>
                  <Text className="text-white/80 font-baloo text-base ml-7 mt-4 mb-2">Notes</Text>
                  {aiNotes.map((note) => (
                    <AiNoteCard
                      key={note.id}
                      note={note}
                      handleNoteDelete={() => {}}
                    />
                  ))}
                </>
              )}
            </ScrollView>
          ) : (
            <>
              <Text className="text-white font-balooBold text-3xl mb-3">Listening ...</Text>
              <Text className="text-white/80 font-baloo text-base text-center">
                Say everything you need to get done.
              </Text>
            </>
          )}
        </View>

        {/* Bottom controls */}
        <View className="w-full flex-row items-center px-6 gap-4 pb-8">
          {/* Play / Pause toggle */}
          <Pressable
            onPress={handleToggleListen}
            accessibilityLabel={isListening ? "Pause" : "Start listening"}
            className="w-14 h-14 rounded-full items-center justify-center"
            style={{ backgroundColor: "rgba(255,255,255,0.25)" }}
          >
            <MaterialCommunityIcons name={isListening ? "pause" : "play"} size={28} color="white" />
          </Pressable>

          {/* Waveform */}
          <View className="flex-1 items-center justify-center">
            {isListening ? (
              <LottieView
                source={LOTTIE_ANIMATIONS.voiceWave}
                loop
                autoPlay
                style={{ width: "100%", height: 40 }}
                resizeMode="contain"
              />
            ) : (
              <View className="flex-row items-center gap-1">
                {Array.from({ length: 20 }).map((_, i) => (
                  <View
                    key={i}
                    className="rounded-full"
                    style={{ width: 3, height: 16, backgroundColor: "rgba(255,255,255,0.5)" }}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Confirm button */}
          <Pressable
            onPress={() => void uploadAudio()}
            accessibilityLabel="Confirm"
            className="w-14 h-14 rounded-full items-center justify-center"
            style={{ backgroundColor: "rgba(255,255,255,0.25)" }}
          >
            <MaterialCommunityIcons name="check" size={28} color="white" />
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
};

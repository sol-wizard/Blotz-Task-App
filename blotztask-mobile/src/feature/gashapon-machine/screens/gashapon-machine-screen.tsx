import React, { useEffect, useMemo, useState } from "react";
import { View, Image, Modal, Pressable, ScrollView, Text } from "react-native";
import { GameEngine } from "react-native-game-engine";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useGashaponMachineConfig } from "@/feature/gashapon-machine/hooks/useGashaponMachineConfig";
import { ASSETS } from "@/shared/constants/assets";
import { MachineButton } from "@/feature/gashapon-machine/components/machine-button";
import { cleanupSystem, physicsSystem } from "@/feature/gashapon-machine/utils/game-systems";
import { LinearGradient } from "expo-linear-gradient";
import { NoteRevealModal } from "@/feature/gashapon-machine/components/note-reveal-modal";
import LoadingScreen from "@/shared/components/loading-screen";
import { DroppedStar } from "@/feature/gashapon-machine/components/dropped-star";
import { useNotesSearch } from "@/feature/notes/hooks/useNotesSearch";
import { pickRandomNote } from "@/feature/gashapon-machine/utils/pick-random-note";
import { router, Stack } from "expo-router";
import { analytics } from "@/shared/services/analytics";
import { SCREEN_NAMES } from "@/shared/constants/posthog-events";
import { NoteDTO } from "@/feature/notes/models/note-dto";
import { useAddNoteToTask } from "@/shared/hooks/useAddNoteToTask";
import { getStarIconAsBefore } from "@/shared/util/get-star-icon";

export default function GashaponMachineScreen() {
  const { t } = useTranslation("notes");
  const translatedHelpSteps = t("gashapon.helpSteps", { returnObjects: true });
  const helpSteps = Array.isArray(translatedHelpSteps)
    ? translatedHelpSteps.filter((step): step is string => typeof step === "string")
    : [];
  const [basePicLoaded, setBasePicLoaded] = useState(false);
  const [eyesPicLoaded, setEyesPicLoaded] = useState(false);
  const [buttonPicLoaded, setButtonPicLoaded] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isHelpModalVisible, setHelpModalVisible] = useState(false);
  const [dropStarTrigger, setDropStarTrigger] = useState(0);
  const [randomNote, setRandomTask] = useState<NoteDTO | null>(null);
  const [droppedStarIcon, setDroppedStarIcon] = useState(getStarIconAsBefore(0));
  const { addNoteToTask, isConverting } = useAddNoteToTask();
  const { notesSearchResult, showLoading } = useNotesSearch({ searchQuery: "" });

  useEffect(() => {
    analytics.trackScreenViewed(SCREEN_NAMES.GASHAPON_MACHINE);
  }, []);

  const MAX_STARS = 30;

  const limitedNotes = useMemo(() => notesSearchResult.slice(0, MAX_STARS), [notesSearchResult]);

  const handleDoNow = () => {
    if (!randomNote) return;
    const start = new Date();
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    addNoteToTask({
      note: randomNote,
      startTime: start,
      endTime: end,
      onSuccess: () => {
        router.push("/(protected)/(tabs)");
        setModalVisible(false);
      },
    });
  };

  const handleStarDropped = (starIndex: number) => {
    const droppedNote = limitedNotes[starIndex] ?? pickRandomNote();
    setRandomTask(droppedNote);
    setDroppedStarIcon(getStarIconAsBefore(droppedNote?.id ?? starIndex));
    setDropStarTrigger((prev) => prev + 1);
  };

  const { entities, handleRelease, resetStarsPhysics } = useGashaponMachineConfig({
    onStarDropped: handleStarDropped,
    notes: limitedNotes,
  });

  const handleCancel = () => {
    setModalVisible(false);
    resetStarsPhysics();
  };

  const gameEngineReady = !!entities.physics;
  const isAllLoaded =
    basePicLoaded && eyesPicLoaded && buttonPicLoaded && gameEngineReady && !showLoading;

  return (
    <LinearGradient
      colors={["#F3FDE8", "#EAFBFE", "#F3FDE8"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1 items-center justify-center">
        <Stack.Screen
          options={{
            headerRight: () => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("gashapon.helpButtonA11yLabel")}
                hitSlop={12}
                onPress={() => setHelpModalVisible(true)}
                style={{
                  width: 36,
                  height: 36,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 18,
                  backgroundColor: "rgba(255,255,255,0.9)",
                  borderWidth: 1,
                  borderColor: "#D6E8C7",
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: "bold", color: "#444964" }}>?</Text>
              </Pressable>
            ),
          }}
        />
        <NoteRevealModal
          visible={isModalVisible}
          task={randomNote}
          onDoNow={handleDoNow}
          onCancel={handleCancel}
          isDoNowLoading={isConverting}
        />
        <Modal visible={isHelpModalVisible} transparent animationType="fade" statusBarTranslucent>
          <View className="flex-1 bg-black/40 items-center justify-center px-6">
            <View
              className="w-full max-w-[320px] rounded-3xl bg-background px-6 py-7"
              style={{
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowOffset: { width: 0, height: 10 },
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              <Text className="text-slate-800 text-2xl font-bold text-center font-baloo">
                {t("gashapon.helpTitle")}
              </Text>
              <ScrollView className="mt-4 max-h-72" showsVerticalScrollIndicator={false}>
                {helpSteps.map((step, index) => (
                  <View key={step} className="mb-3 flex-row">
                    <Text className="w-7 text-base leading-6 text-secondary font-balooBold">
                      {index + 1}.
                    </Text>
                    <Text className="flex-1 text-base leading-6 text-gray-600 font-balooThin">
                      {step}
                    </Text>
                  </View>
                ))}
              </ScrollView>
              <Pressable
                onPress={() => setHelpModalVisible(false)}
                className="mt-6 h-11 items-center justify-center rounded-full bg-[#99D612]"
              >
                <Text className="text-slate-900 font-semibold font-baloo">{t("close")}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
        {!isAllLoaded && <LoadingScreen />}
        <View
          style={{
            width: 360,
            height: 520,
            opacity: isAllLoaded ? 1 : 0,
            pointerEvents: isAllLoaded ? "auto" : "none",
            position: isAllLoaded ? "relative" : "absolute",
          }}
          className="items-center justify-center"
        >
          <Image
            source={ASSETS.gashaponMachineBase}
            className="absolute z-0"
            style={{
              alignSelf: "center",
              width: 600,
              height: 800,
            }}
            onLoad={() => setBasePicLoaded(true)}
          />

          <View
            style={{
              marginTop: 10,
            }}
          >
            {gameEngineReady && (
              <GameEngine
                systems={[physicsSystem, cleanupSystem]}
                running={isAllLoaded}
                entities={entities}
                style={{
                  width: 400,
                  height: 500,
                  zIndex: 1,
                  bottom: 100,
                }}
              />
            )}
          </View>
          <Image
            source={ASSETS.machineEyes}
            resizeMode="contain"
            className="absolute z-10"
            style={{ left: 80, top: 150 }}
            onLoad={() => setEyesPicLoaded(true)}
          />

          <MachineButton setButtonPicLoaded={setButtonPicLoaded} onRelease={handleRelease} />
        </View>

        <DroppedStar
          trigger={dropStarTrigger}
          imageSource={droppedStarIcon}
          setTaskRevealModalVisible={() => {
            setModalVisible(true);
          }}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

import React, { use, useEffect, useMemo, useState } from "react";
import { View, Image, Text } from "react-native";
import { GameEngine } from "react-native-game-engine";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGashaponMachineConfig } from "@/feature/gashapon-machine/hooks/useGashaponMachineConfig";
import { ASSETS } from "@/shared/constants/assets";
import { MachineButton } from "@/feature/gashapon-machine/components/machine-button";
import { cleanupSystem, physicsSystem } from "@/feature/gashapon-machine/utils/game-systems";
import { LinearGradient } from "expo-linear-gradient";
import { NoteRevealModal } from "@/feature/gashapon-machine/components/note-reveal-modal";
import LoadingScreen from "@/shared/components/ui/loading-screen";
import { DroppedStar } from "@/feature/gashapon-machine/components/dropped-star";
import { useNotesSearch } from "@/feature/notes/hooks/useNotesSearch";
import { pickRandomNote } from "@/feature/gashapon-machine/utils/pick-random-note";
import { router } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { NoteDTO } from "@/feature/notes/models/note-dto";
import { useAddNoteToTask } from "@/feature/gashapon-machine/utils/add-note-to-task";
import { getStarIconAsBefore } from "@/shared/util/get-star-icon";
import { useNotesMutation } from "@/feature/notes/hooks/useNotesMutation";
import { useTranslation } from "react-i18next";

export default function GashaponMachineScreen() {
  const [basePicLoaded, setBasePicLoaded] = useState(false);
  const [eyesPicLoaded, setEyesPicLoaded] = useState(false);
  const [buttonPicLoaded, setButtonPicLoaded] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [dropStarTrigger, setDropStarTrigger] = useState(0);
  const [randomNote, setRandomTask] = useState<NoteDTO | null>(null);
  const [droppedStarIcon, setDroppedStarIcon] = useState(getStarIconAsBefore(0));
  const addNoteToTask = useAddNoteToTask();
  const posthog = usePostHog();
  const { deleteNote } = useNotesMutation();
  const { notesSearchResult, showLoading } = useNotesSearch({ searchQuery: "" });

  useEffect(() => {
    posthog.capture("screen_viewed", {
      screen_name: "GashaponMachine",
    });
  }, []);

  const MAX_STARS = 30;

  const limitedNotes = useMemo(() => notesSearchResult.slice(0, MAX_STARS), [notesSearchResult]);

  const isEmpty = limitedNotes.length === 0;
  const { t } = useTranslation("starspark");

  const handleDoNow = () => {
    if (!randomNote) return;
    addNoteToTask({
      note: randomNote,
      onSuccess: () => {
        deleteNote(randomNote.id);
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
        <NoteRevealModal
          visible={isModalVisible}
          task={randomNote}
          onDoNow={handleDoNow}
          onCancel={handleCancel}
        />
        {!isAllLoaded && <LoadingScreen />}
        {/* Bubble if empty note */}
        {isEmpty && (
          <View
            style={{
              position: "absolute",
              top: 80,
              left: 30,
              right: 30,
              zIndex: 50,
              backgroundColor: "white",
              borderRadius: 18,
              paddingVertical: 12,
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",

              shadowOpacity: 0.15,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 6 },
              elevation: 4,
            }}
          >
            <Image source={ASSETS.greenBun} 
              style={{ width: 40, height: 40, marginRight: 8 }}
              resizeMode="contain"
            />
            <Text className="text-xl text-[#3D8DE0] font-balooBold flex-1">
              {t("empty.gashaponTitle")}
            </Text>
          </View>
        )}

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

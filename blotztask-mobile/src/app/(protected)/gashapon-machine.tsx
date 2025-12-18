import React, { useRef, useState } from "react";
import { View, Image } from "react-native";
import { GameEngine } from "react-native-game-engine";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGashaponMachineConfig } from "@/feature/gashapon-machine/hooks/useGashaponMachineConfig";
import { ASSETS } from "@/shared/constants/assets";
import { MachineButton } from "@/feature/gashapon-machine/components/machine-button";
import { cleanupSystem, physicsSystem } from "@/feature/gashapon-machine/utils/game-systems";
import { LinearGradient } from "expo-linear-gradient";
import { TaskRevealModal } from "@/feature/gashapon-machine/components/task-reveal-modal";
import LoadingScreen from "@/shared/components/ui/loading-screen";
import { DroppedStar } from "@/feature/gashapon-machine/components/dropped-star";
import { ReturningStarAnimations } from "@/feature/gashapon-machine/components/returning-star";
import { useFloatingTasks } from "@/feature/star-spark/hooks/useFloatingTasks";
import { pickRandomTask } from "@/feature/star-spark/utils/pick-random-task";
import { FloatingTaskDTO } from "@/feature/star-spark/models/floating-task-dto";

export default function GashaponMachine() {
  const [basePicLoaded, setBasePicLoaded] = useState(false);
  const [eyesPicLoaded, setEyesPicLoaded] = useState(false);
  const [buttonPicLoaded, setButtonPicLoaded] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [dropStarTrigger, setDropStarTrigger] = useState(0);
  const [returnStarTrigger, setReturnStarTrigger] = useState(0);
  const [starLabelName, setStarLabelName] = useState("");
  const [randomTask, setRandomTask] = useState<FloatingTaskDTO | null>(null);
  const pendingDropRef = useRef<{ taskId: number; labelName: string } | null>(null);

  // Prevent late/duplicate return-animation completions from triggering physics reset
  const latestReturnTriggerRef = useRef(0);
  const returnResetConsumedRef = useRef(true);

  const { floatingTasks, isLoading } = useFloatingTasks();

  const MAX_STARS = 30;

  const limitedFloatingTasks = floatingTasks ?? [].slice(0, MAX_STARS);

  const handleDoNow = () => {
    console.log("Do it now pressed!");
  };

  const handleStarDropped = (payload: { labelName: string; taskId?: number }) => {
    setStarLabelName(payload.labelName);
    const randomTask = (floatingTasks ?? []).find((t) => t.id === payload.taskId) ?? null;
    setRandomTask(randomTask);
    setDropStarTrigger((prev) => prev + 1);
  };

  const { entities, handleRelease, resetStarsPhysics, beginReturnFlow } = useGashaponMachineConfig({
    onStarDropped: handleStarDropped,
    floatingTasks: limitedFloatingTasks,
    getPendingDrop: () => pendingDropRef.current,
    clearPendingDrop: () => {
      pendingDropRef.current = null;
    },
  });

  const handleReleaseWithTaskPick = (deltaThisTurn: number) => {
    // Pick the next task BEFORE the ball drops, to guarantee a labeled star.
    if (!pendingDropRef.current && limitedFloatingTasks.length > 0) {
      const t = pickRandomTask(limitedFloatingTasks);
      if (t?.id && t.label?.name) {
        pendingDropRef.current = { taskId: t.id, labelName: t.label.name };
      }
    }
    handleRelease(deltaThisTurn);
  };

  const handleCancel = () => {
    beginReturnFlow();
    setReturnStarTrigger((prev) => {
      const next = prev + 1;
      latestReturnTriggerRef.current = next;
      returnResetConsumedRef.current = false;
      return next;
    });
    setModalVisible(false);
  };

  const handleReturnAnimationComplete = () => {
    // Only allow one reset per Cancel trigger
    if (returnResetConsumedRef.current) return;
    returnResetConsumedRef.current = true;
    resetStarsPhysics();
    setStarLabelName("");
    setRandomTask(null);
  };

  const gameEngineReady = !!entities.physics;
  const isAllLoaded =
    basePicLoaded && eyesPicLoaded && buttonPicLoaded && gameEngineReady && !isLoading;

  return (
    <LinearGradient
      colors={["#F3FDE8", "#EAFBFE", "#F3FDE8"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1 items-center justify-center">
        <TaskRevealModal
          visible={isModalVisible}
          task={randomTask}
          floatingTasks={floatingTasks ?? []}
          onClose={() => setModalVisible(false)}
          onDoNow={handleDoNow}
          onCancel={handleCancel}
        />
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
            resizeMode="contain"
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

          <MachineButton
            setButtonPicLoaded={setButtonPicLoaded}
            onRelease={handleReleaseWithTaskPick}
          />
        </View>

        <DroppedStar
          starLabelName={starLabelName}
          trigger={dropStarTrigger}
          setTaskRevealModalVisible={() => {
            setModalVisible(true);
          }}
        />

        <ReturningStarAnimations
          starLabelName={starLabelName}
          trigger={returnStarTrigger}
          onAnimationComplete={handleReturnAnimationComplete}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

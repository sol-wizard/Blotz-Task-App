import { Pressable, View, Text, ActivityIndicator } from "react-native";
import Modal from "react-native-modal";

interface Props {
  visible: boolean;
  setIsModalVisible: (v: boolean) => void;
  pickTime: () => void;
  handleStartNow: () => void;
  durationText?: string;
  error?: string | null;
  isEstimating?: boolean;
}

export const FloatingTaskTimeEstimateModal = ({
  visible,
  setIsModalVisible,
  pickTime,
  durationText,
  handleStartNow,
  error,
  isEstimating,
}: Props) => {
  const handlePickTime = () => {
    setIsModalVisible(false);
    pickTime();
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={() => setIsModalVisible(false)}
      backdropOpacity={0.4}
      animationIn="fadeIn"
      animationOut="fadeOut"
      useNativeDriver
      style={{ margin: 0 }}
    >
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-full max-w-[280px] rounded-3xl bg-background px-10 py-14">
          {isEstimating && (
            <View className="items-center py-4">
              <ActivityIndicator size="large" />
              <Text className="mt-4 text-lg text-gray-600 font-balooBold">Estimating time...</Text>
            </View>
          )}

          {!isEstimating && !error && durationText && (
            <>
              <Text className="text-xl leading-6 text-onSurface font-baloo">
                We&apos;ve estimated this task will take around{" "}
                <Text className="text-highlight">{durationText}</Text>. You can do it now!
              </Text>

              <View className="mt-8 flex-row items-center justify-end">
                <Pressable onPress={handlePickTime}>
                  <Text className="text-sm text-primary font-baloo">Pick a time</Text>
                </Pressable>

                <Pressable
                  onPress={handleStartNow}
                  className="h-9 px-6 rounded-xl bg-highlight items-center justify-center ml-6"
                >
                  <Text className="text-sm text-onSurface font-baloo">Start now</Text>
                </Pressable>
              </View>
            </>
          )}

          {!isEstimating && error && (
            <>
              <Text className="text-lg text-gray-800 font-balooExtraBold mb-2">Oops!</Text>

              <Text className="text-gray-600 font-baloo mb-6">
                Could not estimate time, please try again later.
              </Text>

              <Pressable onPress={() => setIsModalVisible(false)} className="items-center">
                <Text className="text-sm text-gray-400 font-balooThin">Dismiss</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

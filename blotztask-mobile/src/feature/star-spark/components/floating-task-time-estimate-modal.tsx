import { Modal, Pressable, View, Text, ActivityIndicator } from "react-native";

interface Props {
  visible: boolean;
  onClose: () => void;
  durationText?: string;
  error?: string | null;
  onPickTime?: () => void;
  onAddToSlot?: () => void;
  isEstimating?: boolean;
}

export const FloatingTaskTimeEstimateModal = ({
  visible,
  onClose,
  durationText,
  error,
  onPickTime,
  onAddToSlot,
  isEstimating,
}: Props) => {
  const hasError = !!error;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/40 items-center justify-center px-6"
        onPress={onClose}
      >
        <Pressable
          className="w-full max-w-[300px] rounded-3xl bg-background px-[40px] py-[50px]"
          onPress={(e) => e.stopPropagation()}
        >
       
          {isEstimating && (
            <View className="items-center py-4">
              <ActivityIndicator size="large" />
              <Text className="mt-4 text-lg text-gray-600 font-baloo">
                Estimating time...
              </Text>
            </View>
          )}

       
          {!isEstimating && !hasError && durationText && (
            <>
              <Text className="text-xl leading-6 text-gray-800 font-baloo">
                We&apos;ve estimated this task will take around{" "}
                <Text className="text-lime-300 font-baloo">
                  {durationText}
                </Text>
                . You can do it now!
              </Text>

              <View className="mt-8 flex-row items-center justify-end">
                <Pressable onPress={onPickTime ?? onClose}>
                  <Text className="text-sm text-gray-400 font-baloo">
                    Pick a time
                  </Text>
                </Pressable>


                <Pressable
                  onPress={onAddToSlot ?? onClose}
                  className="h-10 px-6 rounded-xl bg-lime-300 items-center justify-center ml-3"
                >
                  <Text className="text-xs text-gray-800 font-balooExtraBold">
                    Add to slot
                  </Text>
                </Pressable>
              </View>
            </>
          )}

         
          {!isEstimating && hasError && (
            <>
              <Text className="text-lg text-gray-800 font-balooExtraBold mb-2">
                Oops!
              </Text>

              <Text className="text-gray-600 font-baloo mb-6">
                Could not estimate time, please try again later.
              </Text>

              <Pressable onPress={onClose} className="items-center">
                <Text className="text-sm text-gray-400 font-balooThin">
                  Dismiss
                </Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

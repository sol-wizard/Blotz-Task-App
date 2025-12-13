import {Pressable, View, Text, ActivityIndicator } from "react-native";
import Modal from "react-native-modal";

interface Props {
  visible: boolean;
  onClose: () => void;
  durationText?: string;
  error?: string | null;
  isEstimating?: boolean;
}

export const FloatingTaskTimeEstimateModal = ({
  visible,
  onClose,
  durationText,
  error,
  isEstimating,
}: Props) => {

  return (
    <Modal
      isVisible={visible}                 
      onBackdropPress={onClose}           
      backdropOpacity={0.4}               
      animationIn="fadeIn"
      animationOut="fadeOut"
      useNativeDriver
      style={{ margin: 0 }}  
    >
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-full max-w-[280px] rounded-3xl bg-background px-[40px] py-[50px]">
       
          {isEstimating && (
            <View className="items-center py-4">
              <ActivityIndicator size="large" />
              <Text className="mt-4 text-lg text-gray-600 font-balooBold">
                Estimating time...
              </Text>
            </View>
          )}
       
          {!isEstimating && !error && durationText && (
            <>
              <Text className="text-xl leading-6 text-[#444964] font-baloo">
                We&apos;ve estimated this task will take around <Text className="text-[#9AD513]">{durationText}</Text>. You can do it now!
              </Text>

              <View className="mt-8 flex-row items-center justify-end">
                <Pressable onPress={onClose}>
                  <Text className="text-sm text-[#8C8C8C] font-baloo">
                    Pick a time
                  </Text>
                </Pressable>

                <Pressable
                  onPress={onClose}
                  className="h-9 px-6 rounded-xl bg-[#9AD513] items-center justify-center ml-6"
                >
                  <Text className="text-sm text-[#444964] font-baloo">
                    Add to slot
                  </Text>
                </Pressable>
              </View>
            </>
          )}
         
          {!isEstimating && error && (
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
        </View>
      </View>
    </Modal>
  );
};

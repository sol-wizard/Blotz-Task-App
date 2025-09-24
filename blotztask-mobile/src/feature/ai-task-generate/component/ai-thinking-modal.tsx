import { CustomSpinner } from "@/shared/components/ui/custom-spinner";
import { View, Text } from "react-native";

export const AiThinkingModal = () => {
  return (
    <View className="justify-center items-center mt-12">
      <Text className="font-balooBold text-2xl mb-6">Organising tasks ...</Text>
      <CustomSpinner size={120} />
    </View>
  );
};

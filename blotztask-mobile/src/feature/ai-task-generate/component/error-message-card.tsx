import { ASSETS } from "@/shared/constants/assets";
import { View, Text, Image } from "react-native";

export const ErrorMessageCard = ({ errorMessage }: { errorMessage?: string }) => {
  return (
    <View className="bg-background rounded-2xl px-4 py-6 mb-4 w-96 flex-row">
      <Text className="text-[#3D8DE0] text-2xl font-balooBold pt-2 w-72">
        {errorMessage?.trim()
          ? errorMessage
          : "Oops something went over my head. Please try again."}
      </Text>
      <Image source={ASSETS.greenBun} className="w-20 h-20" />
    </View>
  );
};

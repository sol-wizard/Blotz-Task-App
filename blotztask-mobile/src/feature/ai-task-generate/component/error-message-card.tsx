import { ASSETS } from "@/shared/constants/assets";
import { View, Text, Image } from "react-native";

export const ErrorMessageCard = ({ errorMessage }: { errorMessage?: string }) => {
  return (
    <View className="bg-background rounded-2xl px-4 py-2 w-96 flex-row items-center">
      <Text className="text-[#3D8DE0] text-xl font-balooBold w-72 px-2">
        {errorMessage?.trim()
          ? errorMessage
          : "Oops something went over my head. Please try again."}
      </Text>
      <Image source={ASSETS.greenBun} className="w-15 h-15" />
    </View>
  );
};

import { View, Text } from "react-native";
import WheelPicker from "@quidone/react-native-wheel-picker";

export const TimeWheel = () => {
  const hourData = [...Array(12).keys()].map((index) => {
    const value = index + 1;
    return {
      value,
      label: value.toString().padStart(2, "0"),
    };
  });

  const minData = [...Array(60).keys()].map((index) => ({
    value: index,
    label: index.toString().padStart(2, "0"),
  }));
  return (
    <View className="mx-7 w-24 h-24 bg-transparent flex-row justify-center ">
      <WheelPicker
        style={{ backgroundColor: "white" }}
        width={50}
        data={hourData}
        enableScrollByTapOnItem={true}
        visibleItemCount={1}
      />
      <Text className="text-center font-bold text-2xl text-gray-600 mt-2 px-5 ">
        :
      </Text>
      <WheelPicker
        style={{ backgroundColor: "white" }}
        width={50}
        data={minData}
        enableScrollByTapOnItem={true}
        visibleItemCount={1}
      />
    </View>
  );
};

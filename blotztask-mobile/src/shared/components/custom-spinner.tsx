import { ASSETS } from "@/shared/constants/assets";
import LottieView from "lottie-react-native";
import { StyleProp, ViewStyle } from "react-native";

type CustomSpinnerProps = {
  size: number;
  style?: StyleProp<ViewStyle>;
};

export const CustomSpinner = ({ size, style }: CustomSpinnerProps) => {
  return (
    <LottieView
      source={ASSETS.spinner}
      autoPlay
      loop
      style={[{ width: size, height: size }, style]}
    />
  );
};

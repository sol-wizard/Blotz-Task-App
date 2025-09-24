import { ASSETS } from "@/shared/constants/assets";
import LottieView from "lottie-react-native";

export const CustomSpinner = ({ size }: { size: number }) => {
  return <LottieView source={ASSETS.spinner} autoPlay loop style={{ width: size, height: size }} />;
};

import LottieView from "lottie-react-native";
import spinner from "../../../../assets/images/spinner.json";

export const CustomSpinner = ({ size }: { size: number }) => {
  return <LottieView source={spinner} autoPlay loop style={{ width: size, height: size }} />;
};

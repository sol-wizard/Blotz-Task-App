import LottieView from "lottie-react-native";

export const CustomSpinner = ({ size }: { size: number }) => {
  return (
    <LottieView
      source={require("../../../../assets/images/spinner.json")}
      autoPlay
      loop
      style={{ width: size, height: size }}
    />
  );
};

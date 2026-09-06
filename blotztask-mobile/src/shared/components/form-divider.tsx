import { MotionAnimations } from "@/shared/constants/animations/motion";
import { View } from "react-native";
import Animated from "react-native-reanimated";

type FormDividerProps = {
  marginVertical?: number;
  animateLayout?: boolean;
};

export const FormDivider = ({
  marginVertical = 16,
  animateLayout = true,
}: FormDividerProps) => {
  return (
    <Animated.View
      style={{
        height: 1,
        width: "100%",
        borderRadius: 1,
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderStyle: "dashed",
        marginVertical,
      }}
      layout={animateLayout ? MotionAnimations.layout : undefined}
    >
      <View
        style={{
          left: 0,
          bottom: 0,
          width: "100%",
          height: 1,
          backgroundColor: "white",
        }}
      />
    </Animated.View>
  );
};

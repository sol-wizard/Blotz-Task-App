import { GradientShader } from "@/shared/components/gradient-shader";
import { Text, View } from "react-native";

interface BlotzLogoProps {
  fontSize?: number;
}

export function BlotzLogo({ fontSize = 20 }: BlotzLogoProps) {
  return (
    <GradientShader style={{ height: fontSize * 1.5, width: fontSize * 4.5 }}>
      <View className="flex-1 flex-row justify-center items-center bg-transparent">
        <Text
          style={{ fontSize, lineHeight: fontSize * 1.2 }}
          className="font-balooExtraBold text-center"
        >
          Blotz
        </Text>
      </View>
    </GradientShader>
  );
}

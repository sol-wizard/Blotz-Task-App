import { ReactNode } from "react";
import { View } from "react-native";

const PAPER_COLOR = "#FFFBF3";
const PAPER_EDGE = "#F2E9D6";

type Props = { children: ReactNode };

export function LetterPaper({ children }: Props) {
  return (
    <View className="relative">
      <View
        className="absolute rounded-3xl"
        style={{
          top: 10,
          left: 14,
          right: 14,
          bottom: -6,
          backgroundColor: PAPER_EDGE,
          opacity: 0.5,
        }}
      />
      <View
        className="absolute rounded-3xl"
        style={{
          top: 5,
          left: 7,
          right: 7,
          bottom: -3,
          backgroundColor: PAPER_EDGE,
          opacity: 0.8,
        }}
      />
      <View
        className="rounded-3xl px-7 pt-7 pb-8"
        style={{
          backgroundColor: PAPER_COLOR,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 3,
        }}
      >
        {children}
      </View>
    </View>
  );
}

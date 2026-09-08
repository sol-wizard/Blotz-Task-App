import { Image } from "expo-image";
import { PNGIMAGES } from "@/shared/constants/assets";

export function LetterStamp() {
  return (
    <Image
      source={PNGIMAGES.letterStamp}
      style={{
        position: "absolute",
        width: 300,
        height: 360,
        right: -70,
        bottom: -140,
      }}
      contentFit="contain"
    />
  );
}

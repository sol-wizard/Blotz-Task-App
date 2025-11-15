import { View, Image, ImageSourcePropType } from "react-native";

type BottomNavImageProps = {
  source: ImageSourcePropType;
  containerClassName?: string;
  imageClassName?: string;
};

export const BottomNavImage = ({
  source,
  containerClassName,
  imageClassName,
}: BottomNavImageProps) => {
  return (
    <View
      className={`w-12 h-12 rounded-full bg-[#E3EEFF] items-center justify-center ${
        containerClassName ?? ""
      }`}
    >
      <Image source={source} className={`w-10 h-10 ${imageClassName ?? ""}`} />
    </View>
  );
};

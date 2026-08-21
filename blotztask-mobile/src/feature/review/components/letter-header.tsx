import { Text, View } from "react-native";
import { PNGIMAGES } from "@/shared/constants/assets";
import { Image } from "expo-image";
import { FormDivider } from "@/shared/components/form-divider";

type Props = {
  periodLabel: string;
  letterLabel: string;
};

export function LetterHeader({ periodLabel, letterLabel }: Props) {
  return (
    <>
      <View className="flex-row items-center mb-6">
        <Image
          source={PNGIMAGES.letterHeaderIcon}
          style={{ width: 40, height: 40 }}
          contentFit="contain"
        />

        <View className="ml-3">
          <Text className="text-[10px] font-baloo text-secondary/50 uppercase tracking-[2px]">
            {letterLabel}
          </Text>

          <Text className="text-sm font-balooBold text-secondary">{periodLabel}</Text>
        </View>
      </View>
      <View className="mb-6">
        <FormDivider marginVertical={0} />
      </View>
    </>
  );
}

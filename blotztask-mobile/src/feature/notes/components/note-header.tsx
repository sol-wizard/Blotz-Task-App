import { View, Text, Pressable, TextInput } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import MaterialCommunityIcons from "@expo/vector-icons/build/MaterialCommunityIcons";
import { theme } from "@/shared/constants/theme";

type NoteHeaderProps = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
};

export const NoteHeader = ({ searchQuery, setSearchQuery }: NoteHeaderProps) => {
  const { t } = useTranslation("notes");

  return (
    <View>
      <View className="flex-row justify-between items-center mt-10 px-6">
        <Text className="text-4xl text-gray-800 font-balooExtraBold pt-4">{t("title")}</Text>

        <Pressable
          onPress={() => router.push("/(protected)/gashapon-machine")}
          className="rounded-full"
        >
          <View className="flex-row items-center bg-[#E9EEF0] rounded-[20px] px-4 py-1.5 justify-center">
            <MaterialCommunityIcons
              name="cursor-default-click-outline"
              size={16}
              color="#444964"
              style={{ marginRight: 5, transform: [{ scaleX: -1 }] }}
            />
            <Text className="text-gray-700 font-baloo text-lg">{t("gashapon.pickNote")}</Text>
          </View>
        </Pressable>
      </View>

      <View className="h-10 flex-row items-center rounded-full bg-[#E9EEF0] px-3 m-4">
        <MaterialCommunityIcons name="magnify" size={18} color={theme.colors.disabled} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search notes"
          placeholderTextColor="#9CA3AF"
          className="ml-2 text-black"
        />
      </View>
    </View>
  );
};

import { theme } from "@/shared/constants/theme";
import { useCallback, useState } from "react";
import { View, Text, Pressable, TextInput, TouchableWithoutFeedback, Keyboard } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import LoadingScreen from "@/shared/components/ui/loading-screen";
import { NotesDualView } from "@/feature/notes/components/notes-dual-view";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { useNotesSearch as useNotesSearch } from "@/feature/notes/hooks/useNotesSearch";
import { router, useFocusEffect } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import { NoteDTO } from "@/feature/notes/models/note-dto";

export default function NotesScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const { isDeleting } = useTaskMutations();
  const posthog = usePostHog();
  const { t } = useTranslation("notes");

  useFocusEffect(
    useCallback(() => {
      posthog.capture("screen_viewed", {
        screen_name: "Notes",
      });
    }, []),
  );

  const { notesSearchResult, showLoading } = useNotesSearch({
    searchQuery,
  });

  const handlePressTask = (task: any) => {
    console.log("Test Pressing task", task);
  };

  const handleDelete = (note: NoteDTO) => {
    console.log("Test Deleting task", note);
  };

  const handleAddSparkPress = () => {
    console.log("Star Spark button clicked");
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View className="flex-1">
          <View className="flex-row justify-between items-center mt-10">
            <Text className="text-4xl text-gray-800 font-balooExtraBold pt-4 px-10">
              {t("title")}
            </Text>
            <Pressable
              onPress={() => router.push("/(protected)/gashapon-machine")}
              className="rounded-full mr-4"
            >
              <LinearGradient
                colors={["#9AD513", "#60B000", "#9AD513"]}
                start={{ x: 0.8, y: 0 }}
                end={{ x: 0, y: 0.5 }}
                style={{
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text className="text-white font-baloo text-lg">{t("gashapon.pickNote")}</Text>
              </LinearGradient>
            </Pressable>
          </View>

          <View className="my-4 mx-1 px-3">
            <View className="h-10 flex-row items-center rounded-full bg-[#E9EEF0] px-3">
              <MaterialCommunityIcons name="magnify" size={18} color={theme.colors.disabled} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t("search")}
                placeholderTextColor={theme.colors.disabled}
                className="flex-1 ml-2 text-base font-baloo text-black"
                style={{ color: "#000000" }}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
            </View>
          </View>

          <Pressable
            onPress={handleAddSparkPress}
            className="flex-row mx-6 mb-4"
            style={{
              borderWidth: 2,
              borderStyle: "dashed",
              borderColor: "#8C8C8C",
              borderRadius: 16,
              height: 56,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.background,
            }}
          >
            <MaterialCommunityIcons name={"plus"} size={24} color={theme.colors.primary} />
            <Text className="font-baloo text-lg " style={{ color: theme.colors.primary }}>
              {t("addNote")}
            </Text>
          </Pressable>

          {showLoading && <LoadingScreen />}
          {!showLoading && notesSearchResult.length > 0 && (
            <NotesDualView
              notes={notesSearchResult}
              onDeleteTask={handleDelete}
              isDeleting={isDeleting}
              onPressTask={handlePressTask}
            />
          )}
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

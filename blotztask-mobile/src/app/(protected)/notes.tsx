import { theme } from "@/shared/constants/theme";
import { useCallback, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Searchbar } from "react-native-paper";
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
    router.push({
      pathname: "/task-edit",
      params: { taskId: String(task.id) },
    });
  };

  const handleDelete = (note: NoteDTO) => {
    console.log("Test Deleting task", note);
  };
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <View className="flex-row justify-between items-center mt-10">
        <Text className="text-4xl text-gray-800 font-balooExtraBold pt-4 px-10">{t("title")}</Text>
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

      <View className="mb-6 mt-4 mx-1">
        <Searchbar
          value={searchQuery}
          onChangeText={setSearchQuery}
          icon={"magnify"}
          placeholderTextColor={theme.colors.disabled}
          clearIcon={searchQuery ? "close" : undefined}
          iconColor={theme.colors.disabled}
          style={{
            backgroundColor: "#E9EEF0",
            borderRadius: 20,
            height: 40,
            marginHorizontal: 12,
          }}
          inputStyle={{
            fontSize: 16,
            fontFamily: "BalooRegular",
            paddingBottom: 14,
          }}
        />
      </View>

      {showLoading && <LoadingScreen />}
      {!showLoading && notesSearchResult.length > 0 && (
        <NotesDualView
          notes={notesSearchResult}
          onDeleteTask={handleDelete}
          isDeleting={isDeleting}
          onPressTask={handlePressTask}
        />
      )}
    </SafeAreaView>
  );
}

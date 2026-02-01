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
import { Modal } from "react-native";

export default function NotesScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const { isDeleting } = useTaskMutations();
  const posthog = usePostHog();
  const { t } = useTranslation("notes");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [noteText, setNoteText] = useState("");
  const isSaveEnabled = noteText.trim().length > 0;

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

  const handleAddNotePress = () => {
    console.log("Star Spark button clicked");
    setIsModalVisible(true);
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
            onPress={handleAddNotePress}
            className="mx-6 mb-4 border-2 border-dashed rounded-2xl
         h-14 items-center justify-center bg-background"
            style={{ borderColor: "#8C8C8C" }}
          >
            <Text className="font-baloo text-lg " style={{ color: "#8C8C8C" }}>
              {t("addNote")}
            </Text>
          </Pressable>

          <Modal
            visible={isModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setIsModalVisible(false)}
          >
            <View className="flex-1 bg-black/30 justify-center items-center">
              <View className="w-11/12 bg-white rounded-2xl p-6">
                <Pressable
                  onPress={() => {
                    setIsModalVisible(false);
                    setNoteText("");
                  }}
                  className="self-end w-10 h-10 rounded-full bg-[#F3F4F6] items-center justify-center
"
                >
                  <MaterialCommunityIcons name="close" size={18} color="#4B5563" />
                </Pressable>

                <TextInput
                  value={noteText}
                  onChangeText={setNoteText}
                  placeholder={t("notePlaceholder")}
                  placeholderTextColor={theme.colors.primary}
                  multiline
                  className="mt-3 h-36 rounded-xl bg-background px-4 text-base mx-4"
                />
                <Pressable
                  disabled={!isSaveEnabled}
                  onPress={() => {
                    console.log(noteText);
                    setNoteText("");
                    setIsModalVisible(false);
                  }}
                  className={`mt-8 w-32 h-10 rounded-xl items-center 
              justify-center self-center ${isSaveEnabled ? "bg-highlight" : "bg-gray-300"}`}
                >
                  <Text
                    className="font-balooBold text-lg text-black rounded-xl  items-center justify-center
               "
                  >
                    {t("save")}
                  </Text>
                </Pressable>
              </View>
            </View>
          </Modal>

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

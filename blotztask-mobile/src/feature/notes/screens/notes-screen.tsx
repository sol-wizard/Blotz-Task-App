import { useCallback, useRef, useState } from "react";
import { View, Text, Pressable, TouchableWithoutFeedback, Keyboard, FlatList } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import { Swipeable } from "react-native-gesture-handler";

import LoadingScreen from "@/shared/components/ui/loading-screen";
import { theme } from "@/shared/constants/theme";
import { useNotesSearch } from "@/feature/notes/hooks/useNotesSearch";
import { useNotesMutation } from "@/feature/notes/hooks/useNotesMutation";
import { NoteDTO } from "@/feature/notes/models/note-dto";
import { NoteModal } from "@/feature/notes/components/note-modal";
import { NoteRow } from "@/feature/notes/components/note-row";


function NotesHeader({
  title,
  pickNoteLabel,
  searchPlaceholder,
  searchQuery,
  onChangeSearch,
  onPressPickNote,
}: {
  title: string;
  pickNoteLabel: string;
  searchPlaceholder: string;
  searchQuery: string;
  onChangeSearch: (v: string) => void;
  onPressPickNote: () => void;
}) {
  return (
    <View>
      <View className="flex-row justify-between items-center mt-10">
        <Text className="text-4xl text-gray-800 font-balooExtraBold pt-4 px-10">{title}</Text>

        <Pressable onPress={onPressPickNote} className="rounded-full mr-4">
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
            <Text className="text-white font-baloo text-lg">{pickNoteLabel}</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <View className="my-4 mx-1 px-3">
        <View className="h-10 flex-row items-center rounded-full bg-[#E9EEF0] px-3">
          <MaterialCommunityIcons name="magnify" size={18} color={theme.colors.disabled} />
          <TextInput
            value={searchQuery}
            onChangeText={onChangeSearch}
            placeholder={searchPlaceholder}
            placeholderTextColor={theme.colors.disabled}
            className="flex-1 ml-2 text-base font-baloo text-black"
            style={{ color: "#000000" }}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>
    </View>
  );
}

import { TextInput } from "react-native";

export default function NotesScreen() {
  const [searchQuery, setSearchQuery] = useState("");

  const { deleteNote, isNoteDeleting, createNote, isNoteCreating, updateNote, isNoteUpdating } =
    useNotesMutation();

  const posthog = usePostHog();
  const { t } = useTranslation("notes");

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [editingNote, setEditingNote] = useState<NoteDTO | null>(null);

  useFocusEffect(
    useCallback(() => {
      posthog.capture("screen_viewed", { screen_name: "Notes" });
    }, [posthog]),
  );

  const { notesSearchResult, showLoading } = useNotesSearch({ searchQuery });

  // only one swipe row open
  const swipeablesRef = useRef<Record<string, Swipeable | null>>({});

  const registerSwipeable = (id: string, ref: Swipeable | null) => {
    swipeablesRef.current[id] = ref;
  };

  const closeOtherRows = (openId: string) => {
    Object.entries(swipeablesRef.current).forEach(([id, ref]) => {
      if (id !== openId) ref?.close();
    });
  };

  const closeAllRows = () => {
    Object.values(swipeablesRef.current).forEach((ref) => ref?.close());
  };

  const openEditModal = (note: NoteDTO) => {
    closeAllRows();
    setEditingNote(note);
    setNoteText(note.text ?? "");
    setIsModalVisible(true);
  };

  const handleDelete = (note: NoteDTO) => {
    closeAllRows();
    deleteNote(String(note.id));
  };

  const handleSave = () => {
    const text = noteText.trim();
    if (!text) return;

    if (editingNote) {
      if (isNoteUpdating) return;
      updateNote(
        { id: editingNote.id, text },
        {
          onSuccess: () => {
            setIsModalVisible(false);
            setEditingNote(null);
            setNoteText("");
          },
        },
      );
      return;
    }

    if (isNoteCreating) return;
    createNote(text, {
      onSuccess: () => {
        setIsModalVisible(false);
        setNoteText("");
      },
    });
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <TouchableWithoutFeedback
        onPress={() => {
          Keyboard.dismiss();
          closeAllRows();
        }}
        accessible={false}
      >
        <View className="flex-1">
          <NotesHeader
            title={t("title")}
            pickNoteLabel={t("gashapon.pickNote")}
            searchPlaceholder={t("search")}
            searchQuery={searchQuery}
            onChangeSearch={(v) => {
              setSearchQuery(v);
              closeAllRows();
            }}
            onPressPickNote={() => router.push("/(protected)/gashapon-machine")}
          />

          <View className="px-6 flex-1">
            {notesSearchResult.length > 0 ? (
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 24,
                  overflow: "hidden",
                  shadowColor: "#000",
                  shadowOpacity: 0.06,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 2,
                }}
              >
                <FlatList
                  data={showLoading ? [] : notesSearchResult}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={({ item }) => (
                    <NoteRow
                      note={item}
                      onPressNote={openEditModal}
                      onDelete={handleDelete}
                      registerSwipeable={registerSwipeable}
                      closeOtherRows={closeOtherRows}
                    />
                  )}
                  ItemSeparatorComponent={() => (
                    <View
                      style={{
                        height: 1,
                        backgroundColor: "#E7E7E7",
                        marginLeft: 18,
                        marginRight: 18,
                      }}
                    />
                  )}
                  keyboardShouldPersistTaps="handled"
                  onScrollBeginDrag={closeAllRows}
                  removeClippedSubviews
                  initialNumToRender={12}
                  windowSize={7}
                  maxToRenderPerBatch={12}
                />
              </View>
            ) : (
              <View className="flex-1 items-center justify-center px-10">
                <Text className="text-center text-black font-balooBold text-2xl">
                  {t("emptyNoteMessage.encouragingTitle")}
                </Text>
                <Text className="text-center text-black font-baloo text-xl mt-2">
                  {t("emptyNoteMessage.encouragingDescription")}
                </Text>
              </View>
            )}
          </View>

          <Pressable
            onPress={() => {
              setIsModalVisible(true);
            }}
            className="mx-6 mb-4 border-2 border-dashed rounded-2xl
                      h-14 items-center justify-center bg-background"
            style={{ borderColor: "#8C8C8C" }}
          >
            <Text className="font-baloo text-lg " style={{ color: "#8C8C8C" }}>
              {t("addNote")}
            </Text>
          </Pressable>

          <NoteModal
            visible={isModalVisible}
            noteText={noteText}
            isSaving={editingNote ? isNoteUpdating : isNoteCreating}
            onChangeText={setNoteText}
            onClose={() => {
              setIsModalVisible(false);
              setEditingNote(null);
              setNoteText("");
            }}
            onSave={handleSave}
          />

          {showLoading && <LoadingScreen />}
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

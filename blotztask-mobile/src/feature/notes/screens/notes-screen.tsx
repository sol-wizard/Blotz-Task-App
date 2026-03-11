import { useCallback, useRef, useState } from "react";
import { View, Text, Pressable, TouchableWithoutFeedback, Keyboard, FlatList, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useTranslation } from "react-i18next";
import { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";

import LoadingScreen from "@/shared/components/ui/loading-screen";
import { NoteHeader } from "@/feature/notes/components/note-header";
import { useNotesSearch } from "@/feature/notes/hooks/useNotesSearch";
import { useNotesMutation } from "@/feature/notes/hooks/useNotesMutation";
import { NoteDTO } from "@/feature/notes/models/note-dto";
import { NoteRow } from "@/feature/notes/components/note-row";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "@/shared/constants/theme";
import { NoteInputModal } from "@/feature/notes/components/note-input-modal";
import { NoteTimePickerSheet } from "@/feature/notes/components/note-time-picker-sheet";
import { NoteTimeEstimateModal } from "../components/note-time-estimate-modal";
import { useEstimateTaskTime } from "../hooks/useEstimateTaskTime";


export default function NotesScreen() {
  const [searchQuery, setSearchQuery] = useState("");

  const { deleteNote, createNote, isNoteCreating, updateNote, isNoteUpdating } =
    useNotesMutation();

  const posthog = usePostHog();
  const { t } = useTranslation("notes");

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [editingNote, setEditingNote] = useState<NoteDTO | null>(null);

  // Bottom sheet state for add-to-task (managed at screen level)
  const [noteTimePickerSheetVisible, setNoteTimePickerSheetVisible] = useState(false);
  const [selectedNote, setSelectedNote] = useState<NoteDTO | null>(null);
  const [pendingEstimateNote, setPendingEstimateNote] = useState<NoteDTO | null>(null);
  const [isEstimateModalVisible, setIsEstimateModalVisible] = useState(false);
  const { estimateTime, isEstimating, estimationResult, estimationError } = useEstimateTaskTime();

  useFocusEffect(
    useCallback(() => {
      posthog.capture("screen_viewed", { screen_name: "Notes" });
    }, []),
  );

  const { notesSearchResult, showLoading } = useNotesSearch({ searchQuery });
  
  const swipeablesRef = useRef<Record<string, SwipeableMethods | null>>({});

  const registerSwipeable = (id: string, ref: SwipeableMethods | null) => {
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

    const handleAIEstimate = (note: NoteDTO | null) => {
    if (!note) return;
    setPendingEstimateNote(note);
    setNoteTimePickerSheetVisible(false);
  };

  const handleNoteTimePickerHide = () => {
    setSelectedNote(null);

    if (!pendingEstimateNote) return;

    const noteToEstimate = pendingEstimateNote;
    setPendingEstimateNote(null);
    setIsEstimateModalVisible(true);
    estimateTime(noteToEstimate);
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
          <NoteHeader />
          <View className="my-4 mx-1 px-3">
            <View className="h-10 flex-row items-center rounded-full bg-[#E9EEF0] px-3">
              <MaterialCommunityIcons name="magnify" size={18} color={theme.colors.disabled} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search notes"
                placeholderTextColor="#9CA3AF"
                className="ml-2 flex-1 text-base text-black"
              />
            </View>
          </View>
          <View className="px-6 flex-1">
            <View className="bg-white rounded-3xl overflow-hidden">
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
                  <View className="h-[1px] bg-[#E7E7E7] mx-5" />
                )}
                ListEmptyComponent={
                  !showLoading ? (
                    <View className="flex-1 items-center justify-center px-10 py-20">
                      <Text className="text-center text-black font-balooBold text-2xl">
                        {t("emptyNoteMessage.encouragingTitle")}
                      </Text>
                      <Text className="text-center text-black font-baloo text-xl mt-2">
                        {t("emptyNoteMessage.encouragingDescription")}
                      </Text>
                    </View>
                  ) : null
                }
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={closeAllRows}
                initialNumToRender={12}
                windowSize={7}
                maxToRenderPerBatch={12}
              />
            </View>
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


          <NoteInputModal
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

      <NoteTimePickerSheet
        visible={noteTimePickerSheetVisible}
        note={selectedNote}
        onClose={() => {
          setNoteTimePickerSheetVisible(false);
          setSelectedNote(null);
          setPendingEstimateNote(null);
        }}
        onModalHide={handleNoteTimePickerHide}
        handleAIEstimate={handleAIEstimate}
      />
      <NoteTimeEstimateModal
        visible={isEstimateModalVisible}
        setIsModalVisible={setIsEstimateModalVisible}
        isEstimating={isEstimating}
        estimateResult={estimationResult}
        estimationError={estimationError}
      />
    </SafeAreaView>
  );
}

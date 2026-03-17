import { useCallback, useState } from "react";
import { View, Text, Pressable, TouchableWithoutFeedback, Keyboard, FlatList, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useTranslation } from "react-i18next";
import { useSwipeableManager } from "../hooks/useSwipeableManager";

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
import { useAddNoteToTask } from "@/shared/hooks/useAddNoteToTask";
import { convertDurationToMinutes } from "@/shared/util/convert-duration";

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
  const { addNoteToTask } = useAddNoteToTask();

  useFocusEffect(
    useCallback(() => {
      posthog.capture("screen_viewed", { screen_name: "Notes" });
    }, []),
  );

  const { notesSearchResult, showLoading } = useNotesSearch({ searchQuery });
  const { onRowOpen, closeAllRows } = useSwipeableManager();



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
    setIsEstimateModalVisible(true);
    estimateTime(noteToEstimate);
  };

  const handleCloseEstimateModal = () => {
    setIsEstimateModalVisible(false);
    setPendingEstimateNote(null);
  };

  const handleStartNowFromEstimate = (duration: string) => {
    if (!pendingEstimateNote) return;
    const start = new Date();
    const end = new Date(start.getTime() + convertDurationToMinutes(duration) * 60 * 1000);
    addNoteToTask({
      note: pendingEstimateNote,
      startTime: start,
      endTime: end,
      onSuccess: () => {
        handleCloseEstimateModal();
        router.push("/(protected)/(tabs)");
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
          <NoteHeader />
          <View className="my-4 mx-1 px-3">
            <View className="h-10 flex-row items-center rounded-full bg-[#E9EEF0] px-3">
              <MaterialCommunityIcons name="magnify" size={18} color={theme.colors.disabled} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search notes"
                placeholderTextColor="#9CA3AF"
                className="ml-2 flex-1 h-10 text-base text-black"
                style={{
                  paddingTop: 0,
                  paddingBottom: 12,
                  includeFontPadding: false,
                }}
                textAlignVertical="center"
              />
            </View>
          </View>
            {!showLoading && notesSearchResult.length === 0 ? (
              <View className="flex-1 items-center justify-center">
                <Text className="text-center text-black font-balooBold text-2xl">
                  {t("emptyNoteMessage.encouragingTitle")}
                </Text>
                <Text className="text-center text-black font-baloo text-xl mt-2">
                  {t("emptyNoteMessage.encouragingDescription")}
                </Text>
              </View>
            ) : (
              <View className="px-6 flex-1">
              <View
                className={`rounded-3xl overflow-hidden bg-white`}>
              <FlatList
                data={showLoading ? [] : notesSearchResult}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <NoteRow
                    note={item}
                    onPressNote={openEditModal}
                    onDelete={handleDelete}
                    onRowOpen={onRowOpen}
                    onAddToTask={(note: NoteDTO) => {
                      setSelectedNote(note);
                      setNoteTimePickerSheetVisible(true);
                      console.log("Selected note for time estimation:", note);
                    }}
                  />
                )}
                ItemSeparatorComponent={() => (
                  <View className="h-[1px] bg-[#E7E7E7] mx-5" />
                )}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={closeAllRows}
                initialNumToRender={12}
                windowSize={7}
                maxToRenderPerBatch={12}
              />
            </View>
          </View>
          )}
          

          <Pressable
              onPress={() => {
                closeAllRows();
                setIsModalVisible(true);
              }}
              className="mx-6 mb-4 border-2 border-dashed rounded-2xl
              h-14 items-center justify-center bg-background"
              style={{ borderColor: "#9AD513", backgroundColor: "#FBFFF6" }}
            >
            <View className="flex-row items-center">
                <MaterialCommunityIcons
                  name="pencil-minus-outline"
                  size={18}
                  color="#587E00"
                  strokeWidth={0.8} 
                />
            <Text className="font-baloo text-lg ml-2" style={{ color: "#587E00" }}>
              {t("addNote")}
            </Text>
            </View>
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
        setIsModalVisible={(v) => {
          setIsEstimateModalVisible(v);
          if (!v) setPendingEstimateNote(null);
        }}
        isEstimating={isEstimating}
        estimateResult={estimationResult}
        estimationError={estimationError}
        onStartNow={handleStartNowFromEstimate}
      />
    </SafeAreaView>
  );
}

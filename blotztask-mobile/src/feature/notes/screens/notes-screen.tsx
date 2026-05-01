import { useCallback, useState } from "react";
import { View, Text, Pressable, TouchableWithoutFeedback, Keyboard, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { analytics } from "@/shared/services/analytics";
import { SCREEN_NAMES } from "@/shared/constants/posthog-events";
import { useTranslation } from "react-i18next";
import { useSwipeableManager } from "../hooks/useSwipeableManager";

import LoadingScreen from "@/shared/components/loading-screen";
import { NoteHeader } from "@/feature/notes/components/note-header";
import { useNotesSearch } from "@/feature/notes/hooks/useNotesSearch";
import { useNotesMutation } from "@/feature/notes/hooks/useNotesMutation";
import { NoteDTO } from "@/feature/notes/models/note-dto";
import { NoteRow } from "@/feature/notes/components/note-row";

import { ASSETS } from "@/shared/constants/assets";
import { NoteTimePickerSheet } from "@/feature/notes/components/note-time-picker-sheet";
import { NoteTimeEstimateModal } from "../components/note-time-estimate-modal";
import { useEstimateTaskTime } from "../hooks/useEstimateTaskTime";
import { useAddNoteToTask } from "@/shared/hooks/useAddNoteToTask";
import { convertDurationToMinutes } from "@/shared/util/convert-duration";

export default function NotesScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const { deleteNote } = useNotesMutation();

  const { t } = useTranslation("notes");

  // Bottom sheet state for add-to-task (managed at screen level)
  const [noteTimePickerSheetVisible, setNoteTimePickerSheetVisible] = useState(false);
  const [selectedNote, setSelectedNote] = useState<NoteDTO | null>(null);
  const [pendingEstimateNote, setPendingEstimateNote] = useState<NoteDTO | null>(null);
  const [isEstimateModalVisible, setIsEstimateModalVisible] = useState(false);
  const { estimateTime, isEstimating, estimationResult, estimationError } = useEstimateTaskTime();
  const { addNoteToTask } = useAddNoteToTask();

  useFocusEffect(
    useCallback(() => {
      analytics.trackScreenViewed(SCREEN_NAMES.NOTES);
    }, []),
  );

  const { notesSearchResult, showLoading } = useNotesSearch({ searchQuery });
  const { onRowOpen, closeAllRows } = useSwipeableManager();

  const openEditor = (note: NoteDTO) => {
    closeAllRows();
    router.push({
      pathname: "/(protected)/note-editor",
      params: {
        noteId: note.id,
        noteText: note.text,
      },
    });
  };

  const handleDelete = (note: NoteDTO) => {
    deleteNote(String(note.id));
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
        }}
        accessible={false}
      >
        <View className="flex-1">
          <NoteHeader searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

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
              <View className={`rounded-3xl  bg-white`}>
                <FlatList
                  data={showLoading ? [] : notesSearchResult}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={({ item }) => (
                    <NoteRow
                      note={item}
                      onPressNote={openEditor}
                      onDelete={handleDelete}
                      onRowOpen={onRowOpen}
                      onAddToTask={(note: NoteDTO) => {
                        setSelectedNote(note);
                        setNoteTimePickerSheetVisible(true);
                        console.log("Selected note for time estimation:", note);
                      }}
                    />
                  )}
                  ItemSeparatorComponent={() => <View className="h-[1px] bg-[#E7E7E7] mx-5" />}
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
              router.push("/(protected)/note-editor");
            }}
            className="mx-6 mb-4 border-2 border-dashed rounded-2xl
              h-14 items-center justify-center bg-background"
            style={{ borderColor: "#9AD513", backgroundColor: "#FBFFF6" }}
          >
            <View className="flex-row items-center">
              <ASSETS.editIcon width={18} height={18} fill="#587E00" />
              <Text className="font-baloo text-lg ml-2" style={{ color: "#587E00" }}>
                {t("addNote")}
              </Text>
            </View>
          </Pressable>

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

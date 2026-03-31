import { View, Text, Pressable } from "react-native";
import { format } from "date-fns";
import { NoteDTO } from "../models/note-dto";

export const NoteCard = ({
  note,
  onPressCard,
}: {
  note: NoteDTO;
  onPressCard: (task: NoteDTO) => void;
}) => {
  return (
    <View>
      <Pressable
        onPress={() => {
          onPressCard(note);
        }}
      >
        <View className={`px-5 py-4`}>
          <Text className="text-xl font-semibold text-black font-baloo">{note.text}</Text>

          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-xs text-[#6B7280] font-balooThin">
              {note.createdAt && format(new Date(note.createdAt + "Z"), "dd MMM HH:mm")}
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
};

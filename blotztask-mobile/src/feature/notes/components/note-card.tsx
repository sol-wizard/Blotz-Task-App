import { View, Text, Pressable } from "react-native";
import { format } from "date-fns";
import { NoteDTO } from "../models/note-dto";

export const NoteCard = ({
  note,
  onPressCard,
}: {
  note: NoteDTO;
  onPressCard: (note: NoteDTO) => void;
}) => {
  return (
    <View>
      <Pressable
        onPress={() => {
          onPressCard(note);
        }}
      >
        <View className={`px-5 py-4`}>
          <Text className="font-baloo text-base text-black" numberOfLines={3} ellipsizeMode="tail">
            {note.text}
          </Text>

          <View className="mt-2 flex-row items-center justify-between">
            <Text className="font-baloo text-base text-[#6B7280]">
              {note.createdAt && format(new Date(note.createdAt + "Z"), "dd MMM HH:mm")}
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
};

import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { format } from "date-fns";
import { NoteDTO } from "../models/note-dto";

export const NoteCard = ({
  note,
  isToggled,
  onPressCard,
  onAddToTask,
}: {
  note: NoteDTO;
  isToggled: boolean;
  onPressCard: (task: NoteDTO) => void;
  onAddToTask?: (note: NoteDTO) => void;
}) => {
  return (
    <View>
      <Pressable
        onPress={() => {
          if (isToggled) return;
          onPressCard(note);
        }}
      >
        <View className={`px-5 py-4 ${isToggled ? "border-2 border-info" : ""}`}>
          <Text className="text-xl font-semibold text-black font-baloo">{note.text}</Text>
          
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-xs text-[#6B7280] font-balooThin">
              {note.createdAt && format(new Date(note.createdAt + "Z"), "dd MMM HH:mm")}
            </Text>
          </View>
        </View>
      </Pressable>

      {isToggled && (
        <View className="flex-row justify-end mt-3">
          <Pressable
            onPress={() => {
              onAddToTask?.(note);
            }}
          >
            <View className="w-8 h-8 bg-[#E3EFFE] rounded-xl items-center justify-center ml-2">
              <MaterialCommunityIcons name="plus" color="#3D8DE0" size={18} />
            </View>
          
          </Pressable>
        </View>
      )}
    </View>
  );
};

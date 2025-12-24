import { View, TextInput, TouchableOpacity, Text } from "react-native";

type DetailsViewProps = {
  taskDescription: string;
  setDescription: (v: string) => void;
  canSave: boolean;
  onSave: () => void;
};
const DetailsView = ({
  taskDescription,
  setDescription,
  onSave,
  canSave
}: DetailsViewProps) => {
  return (
    <View className="bg-gray-100 rounded-xl p-4 h-[190px] w-full">
      <TextInput
        value={taskDescription}
        onChangeText={setDescription}
        placeholder="Add any task details — people, places, links, notes…"
        multiline
        textAlignVertical="top"
        className="font-baloo text-[#3E4A5A] text-base"
        style={{
          flex: 1,
        }}
      />
      <View className="mt-3 items-end">
        <TouchableOpacity
          onPress={onSave}
          disabled={!canSave}
          className={`
            rounded-xl px-4 py-2
            ${canSave ? "bg-[#9AD513]":"bg-[ #D1D1D6]"}
          `}
        >
          <Text
            className={`text-xs font-balooBold`}
          >
            Save
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default DetailsView;

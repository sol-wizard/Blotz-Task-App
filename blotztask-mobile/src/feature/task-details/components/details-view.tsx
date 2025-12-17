import { View, TextInput, TouchableOpacity, Text } from "react-native";

const DetailsView = ({
  taskDescription,
  setDescription,
}: {
  taskDescription: string;
  setDescription: (v: string) => void;
}) => {
  return (
    <View className="bg-gray-100 rounded-xl p-4">
      <TextInput
        value={taskDescription}
        onChangeText={setDescription}
        placeholder="Add any task details — people, places, links, notes…"
        multiline
        textAlignVertical="top"
        className="font-baloo text-gray-800 text-lg"
      />
      <TouchableOpacity
        className="mt-3 self-end bg-[#E3EFFE] rounded-xl px-4 py-2"
      >
        <Text className="text-xs font-balooBold text-[#3E4A5A]">Save</Text>
      </TouchableOpacity>
    </View>
  );
};

export default DetailsView;

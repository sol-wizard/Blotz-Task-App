import { View, TextInput } from "react-native";

const DetailsView = ({
  taskDescription,
  setDescription,
}: {
  taskDescription: string;
  setDescription: (v: string) => void;
}) => {
  return (
    <View className="bg-gray-100 rounded-xl p-4 min-h-80">
      <TextInput
        value={taskDescription}
        onChangeText={setDescription}
        placeholder="Add any task details — people, places, links, notes…"
        multiline
        textAlignVertical="top"
        className="font-baloo text-gray-800 text-lg"
      />
    </View>
  );
};

export default DetailsView;

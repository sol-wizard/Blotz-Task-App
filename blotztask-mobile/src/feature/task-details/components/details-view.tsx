import { useEffect } from "react";
import { View, TextInput } from "react-native";

const DetailsView = ({
  taskDescription,
  handleUpdateDescription,
}: {
  taskDescription: string;
  handleUpdateDescription: (v: string) => void;
}) => {
  return (
    <View className="bg-gray-100 rounded-xl p-4 min-h-80">
      <TextInput
        value={taskDescription}
        onChangeText={handleUpdateDescription}
        placeholder="Add any task details — people, places, links, notes…"
        multiline
        textAlignVertical="top"
        className="font-baloo text-gray-800 text-lg"
      />
    </View>
  );
};

export default DetailsView;

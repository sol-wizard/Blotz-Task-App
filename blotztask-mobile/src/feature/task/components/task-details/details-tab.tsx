import { View, TextInput } from "react-native";
import React, { useState } from "react";

type DetailsTabProps = {
  taskDescription?: string;
};

const DetailsTab = ({ taskDescription }: DetailsTabProps) => {
  const [descriptionText, setDescriptionText] = useState(taskDescription || "");

  return (
    <View className="bg-gray-100 rounded-xl p-4 min-h-80">
      <TextInput
        value={descriptionText}
        onChangeText={setDescriptionText}
        placeholder="Add any task details — people, places, links, notes…"
        multiline
        textAlignVertical="top"
        className="font-baloo text-gray-800 text-lg"
      />
    </View>
  );
};
export default DetailsTab;

import { View, TextInput, Keyboard } from "react-native";
import React, { useEffect, useState } from "react";

type DetailsViewProps = {
  taskDescription?: string;
  onChangeDescription: (v: string) => void;
};

const DetailsView = ({ taskDescription, onChangeDescription }: DetailsViewProps) => {
  const [descriptionText, setDescriptionText] = useState(taskDescription || "");

  useEffect(() => {
    setDescriptionText(taskDescription || "");
  }, [taskDescription]);

  return (
    <View className="bg-gray-100 rounded-xl p-4 min-h-80">
      <TextInput
        value={descriptionText}
        onChangeText={setDescriptionText}
        placeholder="Add any task details — people, places, links, notes…"
        multiline
        textAlignVertical="top"
        className="font-baloo text-gray-800 text-lg"
        onBlur={() => {
          Keyboard.dismiss();
          onChangeDescription(descriptionText);
        }}
      />
    </View>
  );
};
export default DetailsView;

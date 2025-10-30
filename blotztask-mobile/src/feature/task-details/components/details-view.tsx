import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, TextInput } from "react-native";
import { useFocusEffect } from "expo-router";

const DetailsView = ({
  taskDescription,
  handleUpdateDescription,
}: {
  taskDescription: string;
  handleUpdateDescription: (v: string) => void;
}) => {
  const [descriptionText, setDescriptionText] = useState<string>(taskDescription);

  const descriptionRef = useRef(descriptionText);

  useEffect(() => {
    descriptionRef.current = descriptionText;
  }, [descriptionText]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        const latest = descriptionRef.current;
        console.log("TaskDetailsScreen unfocused, updating descriptionText:", latest);
        handleUpdateDescription(latest || "");
      };
    }, []),
  );

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

export default DetailsView;

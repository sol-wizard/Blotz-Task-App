import { TouchableOpacity } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

export const DateTimeSelectorTrigger = ({
  handleTrigger,
}: {
  handleTrigger: () => void;
}) => {
  const [selected, setSelected] = useState(false);

  const handlePress = () => {
    setSelected(!selected);
    handleTrigger();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2
        ${selected ? "bg-blue-500 border-blue-500" : "bg-white border-blue-500"}`}
    >
      <Ionicons
        name="calendar"
        size={20}
        color={selected ? "white" : "#3b82f6"}
      />
    </TouchableOpacity>
  );
};

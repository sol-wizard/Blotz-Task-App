import { TouchableOpacity } from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Control, useWatch } from "react-hook-form";
import TaskFormField from "@/feature/task/models/task-form-schema";

export const DateTimeSelectorTrigger = ({
  handleTrigger,
  control,
}: {
  handleTrigger: () => void;
  control: Control<TaskFormField>;
}) => {
  const [selected, setSelected] = useState(false);
  const startTime = useWatch({ control, name: "startTime" });
  const endTime = useWatch({ control, name: "endTime" });

  useEffect(() => {
    if (!!startTime || !!endTime) {
      setSelected(true);
    } else {
      setSelected(false);
    }
  }, [startTime, endTime]);

  return (
    <TouchableOpacity
      onPress={handleTrigger}
      className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 border-blue-500
        ${selected ? "bg-blue-500 " : "bg-white "}`}
    >
      <Ionicons name="calendar" size={20} color={selected ? "white" : "#3b82f6"} />
    </TouchableOpacity>
  );
};

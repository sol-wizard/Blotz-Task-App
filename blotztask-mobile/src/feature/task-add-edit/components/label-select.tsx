import React, { useState } from "react";
import { View, Pressable, Text } from "react-native";
import { Controller } from "react-hook-form";
import { LabelDTO } from "@/shared/models/label-dto";
import { createLabel } from "@/shared/services/label-service";
import AddTaskLabel from "./add-task-label";
import MaterialIcons from "@expo/vector-icons/build/MaterialIcons";
import Toast from "react-native-toast-message";

interface LabelSelectProps {
  control: any;
  enabled?: boolean;
  labels: LabelDTO[];
  onLabelCreated: (newLabel: LabelDTO) => void;
  selectedValue: number | null;
}

export function LabelSelect({
  control,
  enabled = true,
  labels,
  onLabelCreated,
  selectedValue,
}: LabelSelectProps) {
  const [addOpen, setAddOpen] = useState(false);

  const handleCreate = async (name: string, color: string) => {
    try {
      const saved = await createLabel({ name, color });
      // create new label object
      const newLabel: LabelDTO = {
        labelId: saved.labelId,
        name: name,
        color: color,
      };

      // notify parent component
      onLabelCreated(newLabel);

      // close modal
      setAddOpen(false);
    } catch (e) {
      // show error toast
      Toast.show({
        type: "error",
        text1: "Create label failed",
        text2: "Please try again later",
      });
      console.error("Error creating label:", e);
    }
  };

  // label chip component
  const Chip = ({
    item,
    selected,
    onPress,
    onClear,
    disabled,
  }: {
    item: LabelDTO;
    selected: boolean;
    onPress: () => void;
    onClear?: () => void;
    disabled?: boolean;
  }) => (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      style={{
        opacity: disabled ? 0.5 : 1,
        minHeight: 44,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: item.color,
        borderWidth: selected ? 2 : 0, // selected state border
        borderColor: selected ? "#000" : "transparent",
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Text className="font-baloo">{item.name}</Text>

      {selected && !disabled && (
        <Pressable
          onPress={onClear}
          accessibilityLabel="Clear label"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{
            position: "absolute",
            top: -8,
            right: -8,
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: item.color,
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2,
            borderWidth: 2,
            borderColor: "#2F3747",
          }}
        >
          <MaterialIcons name="close" size={14} />
        </Pressable>
      )}
    </Pressable>
  );

  return (
    <Controller
      control={control}
      name="labelId"
      render={({ field: { onChange } }) => {
        return (
          <View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 12 }}>
              {labels.map((l) => (
                <Chip
                  key={l.labelId}
                  item={l}
                  selected={enabled && selectedValue === l.labelId}
                  onPress={() => {
                    if (!enabled) return;
                    onChange(l.labelId);
                  }}
                  onClear={() => onChange(null)}
                  disabled={!enabled}
                />
              ))}

              {enabled && (
                <Pressable
                  onPress={() => setAddOpen(true)}
                  style={{
                    minHeight: 44,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#1F2937",
                    marginRight: 8,
                    marginBottom: 8,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Add label"
                >
                  <Text className="font-baloo" style={{ fontSize: 18 }}>
                    ＋
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Add Task Label Modal */}
            {addOpen && (
              <AddTaskLabel
                visible={addOpen}
                onClose={() => setAddOpen(false)}
                onCreate={handleCreate}
              />
            )}
          </View>
        );
      }}
    />
  );
}

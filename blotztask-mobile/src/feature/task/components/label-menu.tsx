import React, { useState } from "react";
import { View } from "react-native";
import { Menu, Button, Provider } from "react-native-paper";
import { Controller } from "react-hook-form";

// Label 选项
const LABEL_OPTIONS = [
  { id: 1, label: "Work" },
  { id: 2, label: "Study" },
  { id: 3, label: "Personal" },
];

export function LabelMenu({ control }: { control: any }) {
  const [visible, setVisible] = useState(false);

  return (
    <Controller
      control={control}
      name="labelId"
      render={({ field: { value, onChange } }) => (
        <Menu
          visible={visible}
          onDismiss={() => setVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setVisible(true)}
              style={{ borderRadius: 12 }}
            >
              {LABEL_OPTIONS.find((opt) => opt.id === value)?.label ||
                "Add Label"}
            </Button>
          }
        >
          {LABEL_OPTIONS.map((opt) => (
            <Menu.Item
              key={opt.id}
              onPress={() => {
                onChange(opt.id);
                setVisible(false);
              }}
              title={opt.label}
            />
          ))}
        </Menu>
      )}
    />
  );
}

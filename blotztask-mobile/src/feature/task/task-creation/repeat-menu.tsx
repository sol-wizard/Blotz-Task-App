import React, { useState } from "react";

import { Menu, Button } from "react-native-paper";
import { Controller } from "react-hook-form";

const REPEAT_OPTIONS = [
  { value: "none", label: "No Repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export function RepeatMenu({ control }: { control: any }) {
  const [visible, setVisible] = useState(false);

  return (
    <Controller
      control={control}
      name="repeat"
      render={({ field: { value, onChange } }) => {
        const current =
          REPEAT_OPTIONS.find((opt) => opt.value === value)?.label || "Repeat";

        return (
          <Menu
            visible={visible}
            onDismiss={() => setVisible(false)}
            anchorPosition="bottom"
            anchor={
              <Button
                mode="outlined"
                icon="repeat"
                onPress={() => setVisible(true)}
                style={{ borderRadius: 12, borderColor: "#E5E7EB" }}
                contentStyle={{ height: 44 }}
                labelStyle={{ fontSize: 12, color: "#444964" }}
              >
                {current}
              </Button>
            }
          >
            {REPEAT_OPTIONS.map((opt) => (
              <Menu.Item
                key={opt.value}
                title={opt.label}
                onPress={() => {
                  onChange(opt.value);
                  setVisible(false);
                }}
              />
            ))}
          </Menu>
        );
      }}
    />
  );
}

import React, { useEffect, useState } from "react";
<<<<<<< HEAD
import { View } from "react-native";
=======
>>>>>>> 6eb4676 (Frontend refactor (#467))
import { Menu, Button } from "react-native-paper";
import { Controller } from "react-hook-form";
import { LabelDTO } from "@/shared/models/label-dto";
import { fetchAllLabel } from "@/shared/services/label-service";

export function LabelSelect({ control }: { control: any }) {
  const [visible, setVisible] = useState(false);
  const [labels, setLabels] = useState<LabelDTO[]>([]);
<<<<<<< HEAD

  useEffect(() => {
    (async () => {
      try {
        const labelData = await fetchAllLabel();
        setLabels(labelData);
      } catch (error) {
        console.error("Error loading labels:", error);
      }
    })();
=======
  const loadAllLabel = async () => {
    try {
      const labelData = await fetchAllLabel();
      setLabels(labelData);
    } catch (error) {
      console.error("Error loading labels:", error);
    }
  };

  useEffect(() => {
    loadAllLabel();
>>>>>>> 6eb4676 (Frontend refactor (#467))
  }, []);

  return (
    <Controller
      control={control}
      name="labelId"
<<<<<<< HEAD
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => {
        const selected = labels.find((opt) => opt.labelId === value);
        const borderColor = error ? "#EF4444" /* red-500 */ : "#E5E7EB"; /* gray-200 */

        return (
          <View>
            <Menu
              visible={visible}
              onDismiss={() => setVisible(false)}
              anchorPosition="bottom"
              anchor={
                <Button
                  mode="outlined"
                  icon="label-outline"
                  onPress={() => setVisible(true)}
                  style={{ borderRadius: 12, borderColor, borderWidth: 1 }}
                  labelStyle={{ fontSize: 12, color: "#444964" }}
                >
                  {selected?.name || "Add Label"}
                </Button>
              }
            >
              {labels.map((opt) => (
                <Menu.Item
                  key={opt.labelId}
                  onPress={() => {
                    onChange(Number(opt.labelId)); // ensure number if schema expects number
                    setVisible(false);
                  }}
                  title={opt.name}
                />
              ))}
            </Menu>
          </View>
        );
      }}
=======
      render={({ field: { value, onChange } }) => (
        <Menu
          visible={visible}
          onDismiss={() => setVisible(false)}
          anchorPosition="bottom"
          anchor={
            <Button
              mode="outlined"
              icon="label-outline"
              onPress={() => setVisible(true)}
              style={{ borderRadius: 12, borderColor: "#E5E7EB" }}
              contentStyle={{ height: 44 }}
              labelStyle={{ fontSize: 12, color: "#444964" }}
            >
              {labels.find((opt) => opt.labelId === value)?.name || "Add Label"}
            </Button>
          }
        >
          {labels.map((opt) => (
            <Menu.Item
              key={opt.labelId}
              onPress={() => {
                onChange(opt.labelId);
                setVisible(false);
              }}
              title={opt.name}
            />
          ))}
        </Menu>
      )}
>>>>>>> 6eb4676 (Frontend refactor (#467))
    />
  );
}

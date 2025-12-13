import React from "react";
import { View, Text } from "react-native";
import { Controller, Control } from "react-hook-form";
import { Dropdown } from "react-native-element-dropdown";
import { Ionicons } from "@expo/vector-icons";
import { FormDivider } from "@/shared/components/ui/form-divider";

type AlertSelectProps = {
  control: Control<any>;
  name?: string;
};

const ALERT_OPTIONS = [
  { label: "None", value: null },
  { label: "At the start of the event", value: 0 },
  { label: "5 mins before", value: 300 },
  { label: "10 mins before", value: 600 },
  { label: "30 mins before", value: 1800 },
  { label: "1 hour before", value: 3600 },
  { label: "2 hours before", value: 7200 },
  { label: "1 day before", value: 86400 },
];

export const AlertSelect: React.FC<AlertSelectProps> = ({ control, name = "alert" }) => {
  return (
    <Controller
      control={control}
      name={name}
      defaultValue={300}
      render={({ field: { value, onChange } }) => (
        <View className="flex-row items-center justify-between">
          <Text className="font-baloo text-secondary text-2xl mt-1">Alert</Text>

          <Dropdown
            data={ALERT_OPTIONS}
            labelField="label"
            valueField="value"
            placeholder="None"
            placeholderStyle={{
              fontSize: 16,
              color: "#444964",
              textAlign: "right",
              fontFamily: "BalooRegular",
            }}
            value={value}
            onChange={(item) => onChange(item.value)}
            style={{
              minWidth: 230,
              paddingHorizontal: 4,
            }}
            activeColor="transparent"
            autoScroll={false}
            selectedTextStyle={{
              fontSize: 16,
              color: "#444964",
              textAlign: "right",
              fontFamily: "BalooRegular",
            }}
            containerStyle={{
              borderRadius: 24,
              paddingVertical: 8,
              paddingHorizontal: 12,
              elevation: 4,
            }}
            renderItem={(item, selected) => (
              <View key={item.label}>
                <View className="flex-row h-12 items-center">
                  <View className="w-6 items-center justify-center mr-1">
                    {selected && <Ionicons name="checkmark" size={18} color="#3E415C" />}
                  </View>
                  <Text className="text-secondary font-baloo text-lg">{item.label}</Text>
                </View>
                <FormDivider marginVertical={2} />
              </View>
            )}
          />
        </View>
      )}
    />
  );
};

import React from "react";
import { View, Text } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { Ionicons } from "@expo/vector-icons";
import { FormDivider } from "@/shared/components/ui/form-divider";

const LANGUAGE_OPTIONS = [
  { label: "English", value: "en-US" as const },
  { label: "中文", value: "zh-CN" as const },
];

type AiLanguageProps = {
  value: "en-US" | "zh-CN";
  onChange: (lang: "en-US" | "zh-CN") => void;
};

export function AiLanguagePicker({ value, onChange }: AiLanguageProps) {
  return (
    <Dropdown
      data={LANGUAGE_OPTIONS}
      labelField="label"
      valueField="value"
      value={value}
      onChange={(item) => onChange(item.value)}
      style={{
        backgroundColor: "#f4f8f9",
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 24,
        minWidth: 100,
        borderWidth: 0,
      }}
      selectedTextStyle={{
        color: "#444964",
        fontWeight: "600",
        fontSize: 12,
        textAlign: "left",
        marginLeft: 4,
      }}
      containerStyle={{
        borderRadius: 16,
        marginTop: 8,
        width: 180,
        overflow: "hidden",
        borderWidth: 1,
        backgroundColor: "#F1F5F9",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.8,
        shadowRadius: 16,
        elevation: 8,
      }}
      activeColor="transparent"
      autoScroll={false}
      renderRightIcon={() => (
        <Ionicons name="chevron-down" size={20} color="#4A5568" style={{ marginLeft: 8 }} />
      )}
      renderItem={(item) => {
        const isSelected = item.value === value;
        return (
          <View key={item.value} className="bg-white">
            <View className="flex-row items-center px-5 py-2">
              <View className="w-8 justify-center items-start">
                {isSelected && <Ionicons name="checkmark" size={20} color="#444964" />}
              </View>
              <Text
                className={`text-[#444964] text-[12px] ${isSelected ? "font-bold" : "font-medium"}`}
                style={{ fontFamily: "BalooRegular" }}
              >
                {item.label}
              </Text>
            </View>

            {LANGUAGE_OPTIONS.indexOf(item) > 0 && (
              <View className="px-4">
                <FormDivider marginVertical={0} />
              </View>
            )}
          </View>
        );
      }}
    />
  );
}

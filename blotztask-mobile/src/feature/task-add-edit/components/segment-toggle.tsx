import React from "react";
import { View, Text, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { SegmentButtonValue } from "../models/segment-button-value";

type Props = {
  value: SegmentButtonValue;
  setValue: (next: SegmentButtonValue) => void;
};

export function SegmentToggle({ value, setValue }: Props) {
  const { t } = useTranslation("tasks");
  return (
    <View className="flex-row bg-[#F4F6FA] p-1 rounded-xl mb-6 w-56">
      <Pressable
        className={`flex-1 justify-center items-center py-2 px-3 rounded-[10px] ${
          value === "reminder" ? "bg-white" : ""
        }`}
        style={
          value === "reminder"
            ? {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 4,
                elevation: 2,
              }
            : undefined
        }
        onPress={() => setValue("reminder")}
      >
        <Text
          className={`text-[15px] font-semibold ${
            value === "reminder" ? "text-[#1A2433]" : "text-[#6B768A]"
          }`}
        >
          {t("form.reminder")}
        </Text>
      </Pressable>

      {/* Event tab */}
      <Pressable
        className={`flex-1 justify-center items-center py-2 px-3 rounded-[10px] ${
          value === "event" ? "bg-white" : ""
        }`}
        style={
          value === "event"
            ? {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 4,
                elevation: 2,
              }
            : undefined
        }
        onPress={() => setValue("event")}
      >
        <Text
          className={`text-[15px] font-semibold ${
            value === "event" ? "text-[#1A2433]" : "text-[#6B768A]"
          }`}
        >
          {t("form.event")}
        </Text>
      </Pressable>
    </View>
  );
}

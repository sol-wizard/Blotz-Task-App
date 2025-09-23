import React from "react";
import { View, Text, Pressable, ScrollView, SafeAreaView } from "react-native";

export interface LabelSelectItem {
  id: LabelType;
  label: string;
  count: number;
}

export interface LabelSelectProps {
  labels: LabelSelectItem[];
  selectedLabelId: LabelType;
  onChange: (value: LabelType) => void;
}

export type LabelType = "all" | "todo" | "inprogress" | "done" | "overdue";

export function LabelSelect({ labels, selectedLabelId, onChange }: LabelSelectProps) {
  return (
    <SafeAreaView>
      <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} className="mb-4">
        <View className="flex-row gap-2 px-4 items-center">
          {labels.map((labelItem) => {
            const isSelected = selectedLabelId === labelItem.id;

            return (
              <Pressable
                key={labelItem.id}
                onPress={() => onChange(labelItem.id)}
                className={`flex-row items-center gap-2 px-4 py-2 rounded-xl border ${
                  isSelected ? "bg-black" : "bg-white border-gray-300"
                }`}
              >
                <Text
                  className={`text-sm ${isSelected ? "text-white font-extrabold" : "text-gray-700"}`}
                >
                  {labelItem.label}
                </Text>
                <View
                  className={`px-2 py-0.5 rounded-full ${isSelected ? "bg-white" : "bg-gray-400"}`}
                >
                  <Text
                    className={`text-xs font-semibold ${isSelected ? "text-black font-bold" : "text-white"}`}
                  >
                    {labelItem.count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

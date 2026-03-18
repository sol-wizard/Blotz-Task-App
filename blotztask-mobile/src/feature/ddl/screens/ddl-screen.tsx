import { FlatList, View } from "react-native";
import { ReturnButton } from "@/shared/components/ui/return-button";
import { SafeAreaView } from "react-native-safe-area-context";

import DdlCard from "../components/ddl-card";
import { DdlDTO } from "../models/ddl-dto";

const mockDdls: DdlDTO[] = [
  {
    id: 1,
    title: "Workout",
    description: "Morning routine",
    isDone: false,
    dueAt: "2026-03-22T00:00:00.000Z",
    isPinned: false,
  },
  {
    id: 2,
    title: "Buy tickets",
    description: "Flight booking",
    isDone: false,
    dueAt: "2026-03-25T00:00:00.000Z",
    isPinned: true,
  },
  {
    id: 3,
    title: "study",
    description: "booking",
    isDone: false,
    dueAt: "2027-01-20T00:00:00.000Z",
    isPinned: true,
  },
];

export default function DdlScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row px-6 pt-6">
        <ReturnButton />
      </View>

      <FlatList
        data={mockDdls}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <DdlCard ddl={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 8, paddingTop: 16 }}
      />
    </SafeAreaView>
  );
}

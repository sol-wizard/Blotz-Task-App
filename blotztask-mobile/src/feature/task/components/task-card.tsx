import React from "react";
import { Pressable, Text } from "react-native";
import { Surface } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";

const MeetingReminderCard = ({ onPress }: { onPress?: () => void }) => {
  return (
    <Surface
      mode="flat"
      elevation={0} // No Android shadow
      style={{
        marginHorizontal: 16,
        marginVertical: 8,
        backgroundColor: "#ffffff", // White tile
        borderRadius: 12,

        // Make border same as outside (invisible)
        borderWidth: 0,
        borderColor: "transparent",

        // Remove iOS shadow
        shadowColor: "transparent",
        shadowOpacity: 0,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 0,
      }}
    >
      <Pressable
        onPress={onPress}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 16,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#000" }}>
          Set Meeting Reminder
        </Text>
        <Ionicons name="time-outline" size={22} color="#444" />
      </Pressable>
    </Surface>
  );
};

export default MeetingReminderCard;

import React, { useEffect, useState } from "react";
import { View, Pressable } from "react-native";
import { Surface, Text, Checkbox, IconButton } from "react-native-paper";

interface TaskCardProps {
  id: string;
  title: string;
  startTime?: string;
  endTime?: string;
  isCompleted?: boolean;
  onToggleComplete?: (id: string, completed: boolean) => void;
  onPress?: () => void;
}

export default function TaskCard({
  id,
  title,
  startTime,
  endTime,
  isCompleted = false,
  onToggleComplete,
  onPress,
}: TaskCardProps) {
  const [checked, setChecked] = useState(isCompleted);

  useEffect(() => {
    setChecked(isCompleted);
  }, [isCompleted]);

  const handleToggleComplete = () => {
    const next = !checked;
    setChecked(next);
    onToggleComplete?.(id, next);
  };

  const handleIconPress = (e: any) => {
    e.stopPropagation();
    console.log("Time icon pressed for:", title);
  };

  const formatTimeRange = () => {
    if (startTime && endTime) return `${startTime}-${endTime}`;
    if (startTime) return startTime;
    return "";
  };

  return (
    <Surface
      mode="flat"
      elevation={0} // Disable Android shadow
      style={{
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 12,
        backgroundColor: "#ffffff",
        // Make border invisible
        borderWidth: 0,
        borderColor: "transparent",
        // Disable iOS shadow
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
          minHeight: 72,
        }}
      >
        {/* Left side: checkbox + text */}
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <View style={{ marginRight: 12 }}>
            <Checkbox
              status={checked ? "checked" : "unchecked"}
              onPress={handleToggleComplete}
              color="#2196F3"
              uncheckedColor="#E0E0E0"
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              variant="bodyLarge"
              style={{
                fontWeight: "500",
                color: checked ? "#9E9E9E" : "#212121",
                textDecorationLine: checked ? "line-through" : "none",
                marginBottom: formatTimeRange() ? 2 : 0,
              }}
            >
              {title}
            </Text>

            {!!formatTimeRange() && (
              <Text variant="bodySmall" style={{ color: "#757575", fontSize: 13 }}>
                {formatTimeRange()}
              </Text>
            )}
          </View>
        </View>

        {/* Right side: clock icon */}
        <IconButton
          icon="clock-outline"
          size={20}
          iconColor="#757575"
          style={{ margin: 0 }}
          onPress={handleIconPress}
        /> 
      </Pressable>
    </Surface>
  );
}

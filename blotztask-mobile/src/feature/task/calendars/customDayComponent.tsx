import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { DayProps } from "react-native-calendars/src/calendar/day";
import { MarkingProps } from "react-native-calendars/src/calendar/day/marking";

interface CustomMarking extends MarkingProps {
  marked?: boolean;
}

// custom day component
// haven't used this yet, but we can use this to customize the day view in calendar later
export default function CustomDayComponent({
  date,
  state,
  marking,
  onPress,
}: DayProps) {
  const isSelected = state === "selected";
  // const isToday = state === 'today';
  const isDisabled = state === "disabled";

  const customMarking = marking as CustomMarking;
  const hasDot = customMarking?.marked;

  const weekDayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayOfWeek = date ? weekDayMap[date.weekday % 7] : "";

  return (
    <TouchableOpacity
      onPress={() => onPress?.(date)}
      style={styles.container}
      disabled={isDisabled}
    >
      <View style={styles.contentContainer}>
        {/* dot */}
        {hasDot && (
          <View style={[styles.dot, isSelected && styles.dotSelected]} />
        )}

        <View style={styles.dateAndDayWrapper}>
          {/* day */}
          <Text
            style={[
              styles.dateText,
              isSelected && styles.dateTextSelected,
              isDisabled && styles.dateTextDisabled,
            ]}
          >
            {date?.day}
          </Text>

          {/* weekday */}
          <Text
            style={[
              styles.dayText,
              isSelected && styles.dayTextSelected,
              isDisabled && styles.dateTextDisabled,
            ]}
          >
            {dayOfWeek}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 4,
  },
  contentContainer: {
    alignItems: "center",
    flexDirection: "column",
    justifyContent: "space-between",
    height: 50,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#2d4150",
  },
  dotSelected: {
    backgroundColor: "white",
  },
  dateAndDayWrapper: {
    alignItems: "center",
  },
  dateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2d4150",
  },
  dateTextSelected: {
    color: "white",
  },
  dateTextDisabled: {
    color: "#d9e1e8",
  },
  dayText: {
    fontSize: 12,
    color: "#888888",
    marginTop: 1,
  },
  dayTextSelected: {
    color: "white",
  },
});

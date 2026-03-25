import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { DateData } from "react-native-calendars/src/types";
import { theme } from "@/shared/constants/theme";
import { parseISO } from "date-fns";

export interface CustomCalendarDayProps {
  date: DateData;
  state: string;
  isSelected: boolean;
  isDeadline: boolean;
  isInRange?: boolean;
  isRangeStart?: boolean;
  isRangeEnd?: boolean;
  isInvalid?: boolean;
  onPress: (date: Date) => void;
  disabled?: boolean;
}

export const CustomCalendarDay = ({
  date,
  state,
  isSelected,
  isDeadline,
  isInRange,
  isRangeStart,
  isRangeEnd,
  isInvalid,
  onPress,
  disabled,
}: CustomCalendarDayProps) => {
  const isToday = state === "today";
  const isDisabledState = state === "disabled" || disabled;

  const circleBgColor = isInvalid
    ? "#FFE5E5"
    : isSelected || isInRange || isRangeStart || isRangeEnd
      ? "#EEFBE1"
      : "transparent";

  const textColor = isInvalid
    ? "#FF4444"
    : isSelected || isInRange || isRangeStart || isRangeEnd
      ? theme.colors.highlight
      : isDeadline
        ? "#333"
        : isDisabledState
          ? "#bbb"
          : isToday
            ? "#BAD5FA"
            : "#333";

  return (
    <TouchableOpacity
      activeOpacity={isDisabledState ? 1 : 0.7}
      onPress={() => {
        if (!isDisabledState) onPress(parseISO(date.dateString));
      }}
      style={{
        width: 48,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        zIndex: isDeadline ? 100 : 0,
      }}
    >
      {/* Range connector backgrounds */}
      {(isInRange || isRangeEnd) && !isRangeStart && (
        <View
          style={{
            position: "absolute",
            left: -4,
            width: 28,
            top: 4,
            bottom: 4,
            backgroundColor: "#EEFBE1",
          }}
        />
      )}
      {(isInRange || isRangeStart) && !isRangeEnd && (
        <View
          style={{
            position: "absolute",
            right: -4,
            width: 28,
            top: 4,
            bottom: 4,
            backgroundColor: "#EEFBE1",
          }}
        />
      )}

      {/* Main Circle */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: circleBgColor,
          position: "relative",
          zIndex: 1,
        }}
      >
        <Text
          style={{
            fontFamily: "BalooBold",
            fontSize: 16,
            color: textColor,
          }}
        >
          {date.day}
        </Text>
      </View>

      {/* DDL Overlay on top layer */}
      {isDeadline && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: 40,
            height: 40,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: "#8fc351",
            zIndex: 10, // Ensure strictly top layer
          }}
        >
          <View
            style={{
              position: "absolute",
              bottom: -8,
              alignSelf: "center",
              backgroundColor: "#8fc351",
              paddingHorizontal: 4,
              paddingVertical: 1,
              borderRadius: 8,
              borderWidth: 1.5,
              borderColor: "#8fc351",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 8,
                fontFamily: "BalooBold",
                lineHeight: 10,
              }}
            >
              DDL
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

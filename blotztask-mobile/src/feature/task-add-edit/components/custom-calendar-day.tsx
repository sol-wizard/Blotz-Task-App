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
    : isDeadline
      ? theme.colors.highlight
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
        flex: 1, // Fluidly adapt to calendar sizing instead of breaking it with strict widths
        alignSelf: "stretch",
        height: 32, // Restored native row spacing! (was 48)
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
            right: "50%",
            top: 1,
            bottom: 1,
            backgroundColor: "#EEFBE1",
          }}
        />
      )}
      {(isInRange || isRangeStart) && !isRangeEnd && (
        <View
          style={{
            position: "absolute",
            left: "50%",
            right: -4,
            top: 1,
            bottom: 1,
            backgroundColor: "#EEFBE1",
          }}
        />
      )}

      {/* Main Circle */}
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 16,
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
            width: 30,
            height: 30,
            borderRadius: 14,
            borderWidth: 2,
            borderColor: "#8fc351",
            zIndex: 10,
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
                lineHeight: 12,
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

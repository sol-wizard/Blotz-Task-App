import React from "react";
import { View, Dimensions } from "react-native";
import { format, startOfWeek, differenceInDays } from "date-fns";

interface TodayIndicatorProps {
  selectedDay: Date;
}

export default function TodayIndicator({ selectedDay }: TodayIndicatorProps) {
  const today = new Date();

  // Get the start date of the currently displayed week
  const weekStart = startOfWeek(selectedDay, { weekStartsOn: 1 });

  // Calculate the number of days difference between today and the start of this week
  const daysDiff = differenceInDays(today, weekStart);

  // If today is not within the currently displayed week (0-6 days), do not display the indicator.
  if (daysDiff < 0 || daysDiff > 6) {
    return null;
  }

  // Get screen width
  const screenWidth = Dimensions.get("window").width;

  // WeekCalendar usually has a left and right margin of about 20px, 
  // and the width of each day is approximately (screenWidth - 40) / 7
  const calendarPadding = 20;
  const dayWidth = (screenWidth - calendarPadding * 2) / 7;
  const leftOffset = calendarPadding + dayWidth * daysDiff + dayWidth / 2 - 6; // -6 is half of the width of the indicator dot

  return (
    <View className="h-2 relative" style={{ width: screenWidth }}>
      <View
        className="absolute w-2 h-2 rounded-full"
        style={{
          left: leftOffset,
          backgroundColor: "#CDF79A",
        }}
      />
    </View>
  );
}

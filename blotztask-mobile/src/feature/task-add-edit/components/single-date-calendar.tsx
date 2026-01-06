import { theme } from "@/shared/constants/theme";
import { parseISO, format } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import { useState } from "react";
import { Calendar, DateData } from "react-native-calendars";
import { Text } from "react-native";
import { useTranslation } from "react-i18next";

export const SingleDateCalendar = ({
  defaultStartDate,
  onStartDateChange,
}: {
  defaultStartDate: string;
  onStartDateChange: (...event: any[]) => void;
}) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(defaultStartDate);
  const { i18n } = useTranslation();
  const isChinese = i18n.language === "zh";
  const locale = isChinese ? zhCN : enUS;

  const renderHeader = (date?: any) => {
    if (!date) return null;
    const dateObj = date instanceof Date ? date : new Date(date.toString());
    const monthText = format(dateObj, "MMMM yyyy", { locale });
    return (
      <Text
        style={{
          fontFamily: "BalooBold",
          fontSize: 18,
          color: "#333",
        }}
      >
        {monthText}
      </Text>
    );
  };

  return (
    <Calendar
      onDayPress={(day: DateData) => {
        const asDate = parseISO(day.dateString);

        setSelectedDate(day.dateString);
        onStartDateChange(asDate);
      }}
      markedDates={
        selectedDate
          ? {
              [selectedDate]: {
                selected: true,
                selectedColor: "#EEFBE1",
                selectedTextColor: theme.colors.highlight,
              },
            }
          : {}
      }
      theme={{
        todayTextColor: "#BAD5FA",
        arrowColor: theme.colors.highlight,
        textDayFontFamily: "BalooBold",
        textDayHeaderFontFamily: "BalooBold",
        textMonthFontFamily: "BalooBold",
        dayTextColor: "#333",
        textDisabledColor: "#bbb",
      }}
      renderHeader={renderHeader}
      enableSwipeMonths
    />
  );
};

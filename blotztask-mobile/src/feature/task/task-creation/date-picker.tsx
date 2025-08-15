import { Calendar, DateData } from "react-native-calendars";

export const DatePicker = ({
  dateSelected,
  setDateSelected,
}: {
  dateSelected: string;
  setDateSelected: (date: string) => void;
}) => {
  const handleDateSelected = (date: DateData) => {
    const isoString = new Date(date.dateString).toISOString();
    setDateSelected(isoString);
  };
  return (
    <>
      <Calendar
        onDayPress={handleDateSelected}
        theme={{
          textSectionTitleColor: "#b6c1cd",
          selectedDayBackgroundColor: "black",
          selectedDayTextColor: "white",
          dayTextColor: "#2d4150",
        }}
        markedDates={{
          [dateSelected]: {
            selected: true,
            disableTouchEvent: true,
            selectedColor: "grey",
          },
        }}
      />
    </>
  );
};

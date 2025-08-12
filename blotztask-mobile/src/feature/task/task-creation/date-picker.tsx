import { Calendar, DateData } from "react-native-calendars";

export const DatePicker = ({
  dateSelected,
  setDateSelected,
}: {
  dateSelected: string;
  setDateSelected: (date: string) => void;
}) => {
  const handleDateSelected = (date: DateData) => {
    console.log("Date selected");
  };
  return (
    <>
      <Calendar
        onDayPress={handleDateSelected}
        markedDates={{
          [dateSelected]: {
            selected: true,
            disableTouchEvent: true,
            selectedColor: "#7c7c80",
          },
        }}
      />
    </>
  );
};

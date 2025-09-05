import { Portal } from 'react-native-paper'
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet'
import { Pressable, Text, View } from 'react-native'
import { useEffect, useRef, useState } from 'react'
import { Controller } from 'react-hook-form'
import { DatePicker } from './date-picker'
import TimePicker from './time-picker'

export const DateTimeBottomSheet = ({
  control,
  isVisible,
  onClose,
  handleCreateTaskBottomSheetOpen,
}: {
  control: any
  isVisible: boolean
  onClose: () => void
  handleCreateTaskBottomSheetOpen: () => void
}) => {
  const bottomSheetRef = useRef<BottomSheet>(null)

  const [dateSelected, setDateSelected] = useState<string>('')
  const [timeSelected, setTimeSelected] = useState<string>('')
  // const [hasTime, setHasTime] = useState<boolean>(false);

  // const handleDateTimeSubmit = () => {
  // if (!dateSelected || !timeSelected) {
  //     console.error("❌ Unselected date or time");
  //     return;
  //   }

  // if (!hasTime) {
  //   const endDateISO = dateSelected;
  //   console.log("✅ Choose all day, End DateTime ISO:", endDateISO);
  // } else {
  //   const combined = `${dateSelected}T${timeSelected}`;

  //   const endDateISO = new Date(combined).toISOString();

  //   console.log("✅ End DateTime ISO:", endDateISO);
  // }
  // };

  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.snapToIndex(0)
    } else {
      bottomSheetRef.current?.close()
      handleCreateTaskBottomSheetOpen()
    }
  }, [isVisible])
  return (
    <Controller
      control={control}
      name="endTime"
      render={({ field: { value, onChange } }) => {
        const handleDateTimeSubmit = () => {
          if (!dateSelected || !timeSelected) {
            console.error('❌ Unselected date or time')
            return
          }
          const combined = `${dateSelected}T${timeSelected}`
          const iso = new Date(combined).toISOString()
          onChange(iso)
          onClose()
        }
        return (
          <Portal>
            <BottomSheet
              ref={bottomSheetRef}
              snapPoints={['80%']}
              enablePanDownToClose
              onClose={onClose}
            >
              <BottomSheetView style={{ padding: 16 }}>
                <DatePicker
                  dateSelected={dateSelected}
                  setDateSelected={setDateSelected}
                ></DatePicker>
                <TimePicker setTimeSelected={setTimeSelected}></TimePicker>
                <View className="flex-row justify-between mx-2 mb-2">
                  <Pressable className="border border-gray-400 rounded-xl px-4 py-2 w-48 items-center">
                    <Text className="text-lg font-semibold ">Cancel</Text>
                  </Pressable>
                  <Pressable
                    className="bg-black rounded-xl px-4 py-2 ml-2 w-64 items-center"
                    onPress={handleDateTimeSubmit}
                  >
                    <Text className="text-lg font-semibold text-white">
                      Done
                    </Text>
                  </Pressable>
                </View>
              </BottomSheetView>
            </BottomSheet>
          </Portal>
        )
      }}
    />
  )
}

import React, { useRef, useState, useCallback } from 'react'
import { Button } from 'react-native-paper'
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Controller } from 'react-hook-form'

export default function DateBottomSheetTriggers({ control }: { control: any }) {
  const sheetRef = useRef<BottomSheetModal>(null)
  const [tempDate, setTempDate] = useState<Date | null>(null)

  const snapPoints = ['40%']

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.4}
      />
    ),
    []
  )

  return (
    <Controller
      control={control}
      name="endTime"
      render={({ field: { value, onChange } }) => (
        <>
          <Button
            mode="outlined"
            icon="calendar"
            onPress={() => sheetRef.current?.present()}
            buttonColor={undefined}
            style={{ borderRadius: 12, borderColor: '#E5E7EB', flex: 1 }}
            contentStyle={{ height: 44 }}
            labelStyle={{ fontSize: 12, color: '#444964' }}
          >
            {value ? new Date(value).toLocaleDateString() : 'Add Time'}
          </Button>
          {/* BottomSheet 内放系统 DateTimePicker */}
          <BottomSheetModal
            ref={sheetRef}
            snapPoints={snapPoints}
            backdropComponent={renderBackdrop}
            enablePanDownToClose
          >
            <BottomSheetView style={{ padding: 16 }}>
              <DateTimePicker
                value={value ? new Date(value) : new Date()}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setTempDate(selectedDate)
                  }
                }}
                style={{ flex: 1 }}
              />

              <Button
                mode="contained"
                style={{ marginTop: 16, borderRadius: 12 }}
                onPress={() => {
                  if (tempDate) {
                    onChange(tempDate.toISOString())
                  }
                  sheetRef.current?.dismiss()
                }}
              >
                Confirm
              </Button>
              <Button
                mode="text"
                style={{ marginTop: 8 }}
                onPress={() => sheetRef.current?.dismiss()}
              >
                Cancel
              </Button>
            </BottomSheetView>
          </BottomSheetModal>
        </>
      )}
    />
  )
}

import { Button } from 'react-native-paper'
import { Controller } from 'react-hook-form'

export default function DateBottomSheetTrigger({ control }: { control: any }) {
  const getTodayISOString = () => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }

  return (
    <Controller
      control={control}
      name="endTime"
      render={({ field: { value, onChange } }) => (
        <Button
          mode="outlined"
          icon="calendar"
          onPress={() => onChange(getTodayISOString())}
          style={{ borderRadius: 12, borderColor: '#E5E7EB', flex: 1 }}
          contentStyle={{ height: 44 }}
          labelStyle={{ fontSize: 12, color: '#444964' }}
        >
          {value ? new Date(value).toLocaleDateString() : 'Add Time'}
        </Button>
      )}
    />
  )
}

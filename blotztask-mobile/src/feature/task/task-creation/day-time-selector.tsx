import { Button } from "react-native-paper";
import { Controller } from "react-hook-form";

export const DateBottomSheetTrigger = ({
  control,
  // handleTaskCreationSheetClose,
  // handleTaskCreationSheetOpen,
}: {
  control: any;
  // handleTaskCreationSheetClose: () => void;
  // handleTaskCreationSheetOpen: () => void;
}) => {
  // const [modalVisible, setModalVisible] = useState(false);

  // const handleDateBottomSheetOpen = () => {
  //   setModalVisible(true);
  //   handleTaskCreationSheetClose();
  // };

  const getTodayISOString = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  };

  return (
    <Controller
      control={control}
      name="endTime"
      render={({ field: { value, onChange } }) => {
        const handlePress = () => {
          onChange(getTodayISOString());
        };

        return (
          <Button
            mode="outlined"
            icon="calendar"
            onPress={handlePress}
            style={{ borderRadius: 12, borderColor: "#E5E7EB", flex: 1 }}
            contentStyle={{ height: 44 }}
            labelStyle={{ fontSize: 12, color: "#444964" }}
          >
            {value ? new Date(value).toLocaleDateString() : "Add Time"}
          </Button>
        );
      }}
    />
    // <>
    //   <Button
    //     mode="outlined"
    //     icon="calendar"
    //     onPress={handleDateBottomSheetOpen}
    //     style={{ borderRadius: 12, borderColor: "#E5E7EB", flex: 1 }}
    //     contentStyle={{ height: 44 }}
    //     labelStyle={{ fontSize: 12, color: "#444964" }}
    //   >
    //     Add Time
    //   </Button>

    // <DateTimeBottomSheet
    //     control={control}
    //     isVisible={modalVisible}
    //     onClose={() => setModalVisible(false)}
    //     handleCreateTaskBottomSheetOpen={handleTaskCreationSheetOpen}
    //   />
    // </>
  );
};

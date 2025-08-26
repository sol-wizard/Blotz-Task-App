import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { Pressable, View, Text } from "react-native";

export type AddSubtaskBottomSheetHandle = {
  present: () => void;
  dismiss: () => void;
};

type Props = { handleAddSubtasks: () => void };

export const AddSubtaskBottomSheet = forwardRef<
  AddSubtaskBottomSheetHandle,
  Props
>(({ handleAddSubtasks }, ref) => {
  const addSubtasRef = useRef<BottomSheetModal>(null);

  useImperativeHandle(ref, () => ({
    present: () => addSubtasRef.current?.present(),
    dismiss: () => addSubtasRef.current?.dismiss(),
  }));
  return (
    <BottomSheetModal
      ref={addSubtasRef}
      snapPoints={["40%"]}
      handleComponent={null}
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.14,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: -2 },
      }}
    >
      <BottomSheetView>
        <View
          className="bg-white rounded-2xl p-4 pb-14 pt-8"
          style={{ elevation: 4 }}
        >
          <View className="flex-row items-center">
            <Pressable
              android_ripple={{ color: "transparent" }}
              onPress={() => console.log("Edit Steps")}
              className="flex-1 h-11 mr-3 items-center justify-center rounded-xl border border-gray-300 bg-transparent"
              style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
            >
              <Text className="text-[15px] font-semibold text-neutral-900">
                Edit Steps
              </Text>
            </Pressable>

            <Pressable
              android_ripple={{ color: "transparent" }}
              onPress={handleAddSubtasks}
              className="flex-1 h-11 items-center justify-center rounded-xl bg-gray-300"
              style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
            >
              <Text className="text-[15px] font-semibold text-neutral-900">
                Add Selected
              </Text>
            </Pressable>
          </View>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

AddSubtaskBottomSheet.displayName = "AddSubtaskBottomSheet";

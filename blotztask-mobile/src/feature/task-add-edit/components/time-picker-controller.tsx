import { format } from "date-fns";
import { Controller } from "react-hook-form";
import { Pressable, View, Text, TouchableOpacity } from "react-native";
import Modal from "react-native-modal";
import TimePicker from "./time-picker";
import { useState } from "react";

export const TimePickerController = ({ control, name }: { control: any; name: string }) => {
  const [showModal, setShowModal] = useState(false);
  return (
    <>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value } }) => {
          const handleClose = () => {
            onChange(null);
            setShowModal(false);
          };

          const handleConfirm = () => {
            setShowModal(false);
          };

          return (
            <View className="justify-center">
              <View className="flex-row justify-between">
                <Pressable
                  onPress={() => {
                    if (!value) {
                      onChange(new Date());
                    }
                    setShowModal(true);
                  }}
                  className="bg-background px-4 py-2 rounded-xl"
                >
                  <Text className="text-xl font-baloo text-secondary ">
                    {value ? format(value, "hh:mm a") : "Select Time"}
                  </Text>
                </Pressable>
              </View>
              <View className="items-center">
                <Modal
                  isVisible={showModal}
                  backdropColor="black"
                  backdropOpacity={0.5}
                  onBackdropPress={handleClose}
                  presentationStyle="overFullScreen"
                >
                  <View className="w-full max-w-md rounded-2xl bg-white p-4 mx-auto">
                    <TimePicker value={value} onChange={(v: Date) => onChange(v)} />

                    <View className="flex-row justify-end mt-3 space-x-3 gap-2">
                      <TouchableOpacity
                        onPress={handleClose}
                        className="px-4 py-2 rounded-lg bg-gray-200"
                      >
                        <Text className="text-gray-700 font-medium">Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleConfirm}
                        className={`px-4 py-2 rounded-lg ${value ? "bg-[#9AD513]" : "bg-gray-200"}`}
                        disabled={value == null}
                      >
                        <Text className="text-white font-medium">Confirm</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              </View>
            </View>
          );
        }}
      />
    </>
  );
};

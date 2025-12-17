import { View, TextInput, TouchableOpacity, Text } from "react-native";

const DetailsView = ({
  taskDescription,
  setDescription,
}: {
  taskDescription: string;
  setDescription: (v: string) => void;
}) => {
  return (
    <View className="bg-gray-100 rounded-xl p-4 min-h-80">
      <TextInput
        value={taskDescription}
        onChangeText={setDescription}
        placeholder="Add any task details — people, places, links, notes…"
        multiline
        textAlignVertical="top"
        className="font-baloo text-[#3E4A5A] text-base"
        style={{
          flex: 1,        // 占掉上半空間
        }}
      />
      <View className="mt-3 items-end">
        <TouchableOpacity className="bg-[#E3EFFE] rounded-2xl px-4 py-2">
          <Text className="text-xs font-balooBold text-[#3E4A5A]">Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default DetailsView;

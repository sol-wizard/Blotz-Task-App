import { View, TextInput, TouchableOpacity, Text } from "react-native";

const DetailsView = ({
  taskDescription,
  setDescription,
}: {
  taskDescription: string;
  setDescription: (v: string) => void;
}) => {
  const hasContent = taskDescription.trim().length > 0;
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
          flex: 1,
        }}
      />
      <View className="mt-3 items-end">
        <TouchableOpacity
          disabled={!hasContent}
          className={`
            rounded-xl px-4 py-2
            ${hasContent ? "bg-[#9AD513]":"bg-[ #D1D1D6]"}
          `}
        >
          <Text
            className={`text-xs font-balooBold`}
          >
            Save
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default DetailsView;

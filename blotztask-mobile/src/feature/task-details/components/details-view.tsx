import { useEffect } from "react";
import { View, TextInput } from "react-native";

type DetailsViewProps = {
  descriptionText?: string;
  setDescriptionText: (v: string) => void;
};

const DetailsView = ({ descriptionText, setDescriptionText }: DetailsViewProps) => {
  useEffect(() => {
    setDescriptionText(descriptionText || "");
    console.log("DetailsView mounted, descriptionText:", descriptionText);
  }, [descriptionText]);

  return (
    <View className="bg-gray-100 rounded-xl p-4 min-h-80">
      <TextInput
        value={descriptionText}
        onChangeText={setDescriptionText}
        placeholder="Add any task details — people, places, links, notes…"
        multiline
        textAlignVertical="top"
        className="font-baloo text-gray-800 text-lg"
      />
    </View>
  );
};
export default DetailsView;

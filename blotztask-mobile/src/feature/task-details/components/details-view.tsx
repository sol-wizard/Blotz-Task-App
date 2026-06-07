import { useState } from "react";
import { View, TextInput, TouchableOpacity, Text } from "react-native";
import { useTranslation } from "react-i18next";

type DetailsViewProps = {
  initialDescription: string;
  onSave: (description: string) => void;
  isUpdating: boolean;
};
const DetailsView = ({
  initialDescription,
  onSave,
  isUpdating,
}: DetailsViewProps) => {
  const { t } = useTranslation();
  const [description, setDescription] = useState(initialDescription);
  const canSave = description.trim() !== initialDescription.trim();

  return (
    <View className="bg-gray-100 rounded-xl p-4 h-[190px] w-full">
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder={t("tasks:details.addDetails")}
        multiline
        textAlignVertical="top"
        className="font-baloo text-[#3E4A5A] text-base flex-1 py-0"
      />
      <View className="mt-3 items-end">
        <TouchableOpacity
          onPress={() => onSave(description)}
          disabled={!canSave}
          className={`
            rounded-xl px-4 py-2
            ${canSave ? "bg-highlight" : "bg-[#D1D1D6]"}
          `}
        >
          <Text className={`text-xs font-balooBold`}>
            {isUpdating ? t("common:buttons.saving") : t("common:buttons.save")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default DetailsView;

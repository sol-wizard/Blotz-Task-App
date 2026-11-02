import { Children, Fragment, ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { FormDivider } from "@/shared/components/form-divider";

type SettingsSectionProps = {
  title?: string;
  children: ReactNode;
};

/** A white card of rows with dashed dividers between them, and an optional small title above. */
export function SettingsSection({ title, children }: SettingsSectionProps) {
  // Children.toArray drops `false`, so platform-only rows can be written inline.
  const rows = Children.toArray(children);

  return (
    <View className="w-full mt-5">
      {title && <Text className="text-sm font-balooBold text-secondary/60 mb-2 px-1">{title}</Text>}
      <View className="bg-white rounded-2xl px-5">
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 && <FormDivider marginVertical={0} animateLayout={false} />}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

type SettingsRowProps = {
  label: string;
  icon?: ReactNode;
  // "chevron" opens a page inside the app, "external" leaves it.
  trailing?: "chevron" | "external" | ReactNode;
  onPress?: () => void;
};

export function SettingsRow({ label, icon, trailing, onPress }: SettingsRowProps) {
  const trailingElement =
    trailing === "chevron" ? (
      <MaterialCommunityIcons name="chevron-right" size={22} color="#444964" />
    ) : trailing === "external" ? (
      <MaterialCommunityIcons name="open-in-new" size={20} color="#444964" />
    ) : (
      trailing
    );

  const content = (
    <>
      <View className="flex-row items-center flex-1 mr-3">
        {icon && <View className="mr-3">{icon}</View>}
        <Text className="text-base font-baloo text-secondary shrink">{label}</Text>
      </View>
      {trailingElement}
    </>
  );

  // Without onPress the row is a plain View: a disabled Pressable would read as "dimmed" and
  // hide the switch or dropdown inside it from VoiceOver.
  if (!onPress) {
    return <View className="flex-row items-center justify-between py-4">{content}</View>;
  }

  return (
    <Pressable onPress={onPress} className="flex-row items-center justify-between py-4">
      {content}
    </Pressable>
  );
}

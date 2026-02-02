import UserProfile from "./user-profile";
import { View, Text, Pressable } from "react-native";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { AnimatedChevron } from "@/shared/components/ui/chevron";
import { useState, useRef } from "react";
import { useSharedValue, withTiming } from "react-native-reanimated";
import Modal from "react-native-modal";

export type SectionType = "Today" | "Reminder" | "DDL";

interface TasksHeaderProps {
  selectedSection: SectionType;
  onSectionChange: (section: SectionType) => void;
}

export default function TasksHeader({ selectedSection, onSectionChange }: TasksHeaderProps) {
  const { userProfile } = useUserProfile();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownProgress = useSharedValue(0);
  const [anchor, setAnchor] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const triggerRef = useRef<View>(null);

  const sectionOptions = [
    { label: "Today", value: "Today" as SectionType },
    { label: "Reminder", value: "Reminder" as SectionType },
    { label: "DDL", value: "DDL" as SectionType },
  ];

  const handleToggleDropdown = () => {
    if (!isDropdownOpen && triggerRef.current) {
      triggerRef.current.measureInWindow((x, y, w, h) => {
        setAnchor({ x, y, w, h });
        setIsDropdownOpen(true);
        dropdownProgress.value = withTiming(1, { duration: 200 });
      });
    } else {
      setIsDropdownOpen(false);
      dropdownProgress.value = withTiming(0, { duration: 200 });
    }
  };

  const handleSelectSection = (section: SectionType) => {
    onSectionChange(section);
    setIsDropdownOpen(false);
    dropdownProgress.value = withTiming(0, { duration: 200 });
  };

  const panelLeft = anchor?.x ?? 0;
  const panelTop = (anchor?.y ?? 0) + (anchor?.h ?? 0) + 6;

  return (
    <View className="flex-row items-center justify-between px-5">
      <View className="flex-row items-center gap-3">
        <View className="flex-row items-center" ref={triggerRef}>
          <Text className="text-5xl text-gray-800 font-balooExtraBold items-end pt-10">
            {selectedSection}
          </Text>

          <Pressable
            onPress={handleToggleDropdown}
            className="ml-2 p-1"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <AnimatedChevron color="#1F2937" progress={dropdownProgress} />
          </Pressable>
        </View>
      </View>

      <UserProfile profile={userProfile} />

      {/* Dropdown Modal */}
      <Modal
        isVisible={isDropdownOpen}
        onBackdropPress={() => {
          setIsDropdownOpen(false);
          dropdownProgress.value = withTiming(0, { duration: 200 });
        }}
        onBackButtonPress={() => {
          setIsDropdownOpen(false);
          dropdownProgress.value = withTiming(0, { duration: 200 });
        }}
        backdropOpacity={0.08}
        animationIn="fadeIn"
        animationOut="fadeOut"
        style={{ margin: 0 }}
      >
        {anchor && (
          <View
            pointerEvents="box-none"
            style={{
              position: "absolute",
              left: panelLeft,
              top: panelTop,
              minWidth: 150,
            }}
          >
            <View className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              {sectionOptions.map((option, index) => (
                <Pressable
                  key={option.value}
                  onPress={() => handleSelectSection(option.value)}
                  className={`px-4 py-3 ${
                    index < sectionOptions.length - 1 ? "border-b border-gray-100" : ""
                  }`}
                >
                  <Text
                    className={`text-lg font-baloo ${
                      selectedSection === option.value
                        ? "text-gray-800 font-balooBold"
                        : "text-gray-600"
                    }`}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

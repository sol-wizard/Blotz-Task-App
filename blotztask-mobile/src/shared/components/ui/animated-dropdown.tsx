import React, { useEffect, useState } from "react";
import { Pressable, Text, View, FlatList } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import Modal from "react-native-modal";
import { Ionicons } from "@expo/vector-icons";
import { FormDivider } from "./form-divider";

export type DropdownOption<T> = {
  label: string;
  value: T;
};

type Props<T> = {
  value: T;
  onChange: (next: T) => void;

  options: DropdownOption<T>[];
  placeholder?: string;

  // UI
  minWidth?: number;
  maxVisibleItems?: number;
  itemHeight?: number;

  // styles (optional)
  triggerClassName?: string;
  labelClassName?: string;

  // render override (optional)
  renderItemLabel?: (opt: DropdownOption<T>) => React.ReactNode;
};

export function AnimatedDropdown<T>({
  value,
  onChange,
  options,
  placeholder = "Select",

  minWidth = 230,
  maxVisibleItems = 6,
  itemHeight = 48,

  renderItemLabel,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  console.log("Rendered AnimatedDropdown with value:", value);
  // animation progress: 0 -> closed, 1 -> open
  const animationProgress = useSharedValue(0);

  useEffect(() => {
    animationProgress.value = withTiming(open ? 1 : 0, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [open, animationProgress]);

  const foundOption = options.find((option) => option.value === value);
  const selectedLabel = foundOption?.label ?? placeholder;

  const visibleCount = Math.min(options.length, maxVisibleItems);

  const arrowSpinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(animationProgress.value, [0, 1], [0, Math.PI])}rad` }],
  }));

  const openDropdown = (ref: any) => {
    if (!ref?.measureInWindow) {
      setOpen(true);
      return;
    }
    ref.measureInWindow((x: number, y: number, w: number, h: number) => {
      setAnchor({ x, y, w, h });
      setOpen(true);
    });
  };

  const closeDropdown = () => setOpen(false);

  // use ref-less approach via callback ref
  const [triggerRef, setTriggerRef] = useState<any>(null);

  const onSelect = (next: T) => {
    onChange(next);
    closeDropdown();
  };

  // Position panel under trigger
  const panelLeft = anchor?.x ?? 0;
  const panelTop = (anchor?.y ?? 0) + (anchor?.h ?? 0) + 6;
  const panelWidth = Math.max(minWidth, anchor?.w ?? minWidth);

  return (
    <>
      {/* Trigger */}
      <Pressable
        ref={setTriggerRef}
        onPress={() => openDropdown(triggerRef)}
        style={{ minWidth }}
        className={"flex-row items-center justify-end"}
      >
        <Text className={"text-lg text-[#444964] font-baloo text-right"} numberOfLines={1}>
          {selectedLabel}
        </Text>

        <Animated.View className="ml-2" style={arrowSpinStyle}>
          <Ionicons name="chevron-down" size={18} color="#3E415C" />
        </Animated.View>
      </Pressable>

      {/* Overlay + Panel */}
      <Modal
        isVisible={open}
        onBackdropPress={closeDropdown}
        onBackButtonPress={closeDropdown}
        backdropOpacity={0.08}
        animationIn="fadeIn"
        animationOut="fadeOut"
        style={{ margin: 0 }}
      >
        {/* Panel container (absolute) */}
        {anchor && (
          <View style={{ flex: 1 }}>
            <View
              pointerEvents="box-none"
              style={{
                position: "absolute",
                left: panelLeft,
                top: panelTop,
                width: panelWidth,
              }}
            >
              {/* Actual panel */}
              <Animated.View className="bg-white py-2 px-3 overflow-hidden rounded-xl">
                <FlatList
                  data={options}
                  keyExtractor={(item, idx) => `${item.label}-${idx}`}
                  bounces={false}
                  style={{ maxHeight: visibleCount * itemHeight }}
                  renderItem={({ item }) => {
                    const selected = item.value === value;
                    return (
                      <Pressable
                        onPress={() => onSelect(item.value)}
                        className="flex-row items-center"
                        style={{ height: itemHeight }}
                      >
                        <View className="mr-1.5 w-6 items-center">
                          {selected && <Ionicons name="checkmark" size={18} color="#3E415C" />}
                        </View>

                        <View className="flex-1">
                          {renderItemLabel ? (
                            renderItemLabel(item)
                          ) : (
                            <Text className="text-secondary font-baloo text-lg">{item.label}</Text>
                          )}
                        </View>
                      </Pressable>
                    );
                  }}
                  ItemSeparatorComponent={() => <FormDivider marginVertical={0} />}
                />
              </Animated.View>
            </View>
          </View>
        )}
      </Modal>
    </>
  );
}

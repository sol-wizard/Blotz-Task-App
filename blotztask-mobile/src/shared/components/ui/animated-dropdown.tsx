import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, Text, View, FlatList, LayoutChangeEvent } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

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

function isEqual<T>(a: T, b: T) {
  // works for primitives (string/number/null). If you later store objects, replace this with id comparison.
  return a === b;
}

export function AnimatedDropdown<T>({
  value,
  onChange,
  options,
  placeholder = "Select",

  minWidth = 230,
  maxVisibleItems = 6,
  itemHeight = 48,

  triggerClassName,
  labelClassName,
  renderItemLabel,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // animation progress: 0 -> closed, 1 -> open
  const animationProgress = useSharedValue(0);

  useEffect(() => {
    animationProgress.value = withTiming(open ? 1 : 0, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [open, animationProgress]);

  const selectedLabel = useMemo(() => {
    const found = options.find((o) => isEqual(o.value, value));
    return found?.label ?? placeholder;
  }, [options, value, placeholder]);

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
        className={triggerClassName ?? "flex-row items-center justify-end"}
      >
        <Text
          className={labelClassName ?? "text-lg text-[#444964] font-baloo text-right"}
          numberOfLines={1}
        >
          {selectedLabel}
        </Text>

        <Animated.View className="ml-2" style={arrowSpinStyle}>
          <Ionicons name="chevron-down" size={18} color="#3E415C" />
        </Animated.View>
      </Pressable>

      {/* Overlay + Panel */}
      <Modal visible={open} transparent animationType="none" onRequestClose={closeDropdown}>
        {/* Backdrop */}
        <Pressable className="flex-1 bg-[rgba(0,0,0,0.08)]" onPress={closeDropdown} />

        {/* Panel container (absolute) */}
        {anchor && (
          <View
            pointerEvents="box-none"
            style={{
              position: "absolute",
              left: panelLeft,
              top: panelTop,
              width: panelWidth,
            }}
          >
            {/* Clip wrapper for height animation */}
            <Animated.View className="overflow-hidden rounded-xl">
              {/* Actual panel */}
              <Animated.View
                style={[
                  {
                    // shadow (iOS) + elevation (Android)
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.12,
                    shadowRadius: 14,
                    elevation: 6,
                  },
                ]}
                className="rounded-[24px] bg-white py-2 px-3"
              >
                <FlatList
                  data={options}
                  keyExtractor={(item, idx) => `${item.label}-${idx}`}
                  bounces={false}
                  style={{ maxHeight: visibleCount * itemHeight }}
                  renderItem={({ item }) => {
                    const selected = isEqual(item.value, value);
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
                  ItemSeparatorComponent={() => <View className="h-px bg-[rgba(62,65,92,0.08)]" />}
                />
              </Animated.View>
            </Animated.View>
          </View>
        )}
      </Modal>
    </>
  );
}

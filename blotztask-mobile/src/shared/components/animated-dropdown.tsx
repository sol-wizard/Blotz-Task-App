import React, { useEffect, useState } from "react";
import { Pressable, Text, View, FlatList, useWindowDimensions } from "react-native";
import Animated, { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import Modal from "react-native-modal";
import Ionicons from "@react-native-vector-icons/ionicons/static";

import { AnimatedChevron } from "./chevron";
import { FormDivider } from "./form-divider";

const PANEL_GAP = 6;

const PANEL_VERTICAL_PADDING = 16;
const SCREEN_EDGE_MARGIN = 8;

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
  itemHeight = 44,

  renderItemLabel,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const { height: windowHeight } = useWindowDimensions();

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

  const openDropdown = (ref: View | null) => {
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
  const [triggerRef, setTriggerRef] = useState<View | null>(null);

  const onSelect = (next: T) => {
    onChange(next);
    closeDropdown();
  };

  const anchorTop = anchor?.y ?? 0;
  const anchorHeight = anchor?.h ?? 0;

  const topLimit = SCREEN_EDGE_MARGIN;
  const bottomLimit = windowHeight - SCREEN_EDGE_MARGIN;
  const spaceBelow = bottomLimit - (anchorTop + anchorHeight + PANEL_GAP);
  const spaceAbove = anchorTop - PANEL_GAP - topLimit;

  const preferredListHeight = Math.min(options.length, maxVisibleItems) * itemHeight;
  const dropUp =
    spaceBelow < preferredListHeight + PANEL_VERTICAL_PADDING && spaceAbove > spaceBelow;

  // Shrink the list rather than letting the panel run off-screen; the FlatList scrolls.
  const availableHeight = Math.max(
    dropUp ? spaceAbove : spaceBelow,
    itemHeight + PANEL_VERTICAL_PADDING,
  );
  const listHeight = Math.min(preferredListHeight, availableHeight - PANEL_VERTICAL_PADDING);
  const panelHeight = listHeight + PANEL_VERTICAL_PADDING;

  const panelLeft = anchor?.x ?? 0;
  const panelTop = dropUp
    ? Math.max(topLimit, anchorTop - PANEL_GAP - panelHeight)
    : Math.min(anchorTop + anchorHeight + PANEL_GAP, bottomLimit - panelHeight);
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
        <Text className={"text-lg text-[#444964] font-baloo text-right mr-2"} numberOfLines={1}>
          {selectedLabel}
        </Text>
        <AnimatedChevron color="#3E415C" progress={animationProgress} />
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
        {anchor && (
          <View
            pointerEvents="box-none"
            style={{
              position: "absolute",
              left: panelLeft,
              top: panelTop,
              width: panelWidth,
            }}
            className="flex-1"
          >
            {/* Actual panel */}
            <Animated.View className="bg-white py-2 px-3 overflow-hidden rounded-xl">
              <FlatList
                data={options}
                keyExtractor={(item, idx) => `${item.label}-${idx}`}
                bounces={false}
                style={{ maxHeight: listHeight }}
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
        )}
      </Modal>
    </>
  );
}

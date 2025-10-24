import React, { useState } from "react";
import { Modal, View, Text, TextInput, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface AddTaskLabelProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, color: string) => Promise<void>;
}

// 5 preset colors
const presetColors = ["#BAD5FA", "#CCE7DB", "#D6FAF9", "#EEFBE1", "#C2E49F"];

export default function AddTaskLabel({ visible, onClose, onCreate }: AddTaskLabelProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(presetColors[0]);

  // If not visible, do not render anything
  if (!visible) return null;

  const handleSave = async () => {
    if (!name.trim()) return;
    await onCreate(name.trim(), color);
    setName("");
    setColor(presetColors[0]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Background overlay */}
      <View
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Content card */}
        <View
          style={{
            width: 340,
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            paddingHorizontal: 24,
            paddingBottom: 20,
            paddingTop: 52, // space for close button
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 10,
            elevation: 4,
          }}
        >
          {/* Close button */}
          <Pressable
            onPress={onClose}
            hitSlop={8}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 32,
              height: 32,
              borderRadius: 9999,
              backgroundColor: "#F3F4F6",
              alignItems: "center",
              justifyContent: "center",
              borderColor: "#E5E7EB",
            }}
          >
            <MaterialIcons name="close" size={18} color="#444964" />
          </Pressable>

          {/* Input field */}
          <TextInput
            placeholder="New category"
            placeholderTextColor="#D1D1D6"
            value={name}
            onChangeText={setName}
            style={{
              height: 40,
              borderRadius: 8,
              backgroundColor: "#F5F9FA",
              paddingHorizontal: 16,
              fontFamily: "baloo",
              fontSize: 12,
              color: "#111827",
              marginBottom: 16,
            }}
          />

          {/* Color selection */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
            {presetColors.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  backgroundColor: c,
                  borderWidth: 2,
                  borderColor: color === c ? "#000" : "#D1D5DB",
                  marginRight: 10,
                }}
              />
            ))}
            <Pressable
              onPress={() => {}}
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: "#444964",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 20, color: "#444964" }}>＋</Text>
            </Pressable>
          </View>

          {/* Save button */}
          <Pressable
            onPress={handleSave}
            style={{
              alignSelf: "center",
              minWidth: 44,
              height: 24,
              paddingHorizontal: 12,
              borderRadius: 6,
              backgroundColor: "#9AD513",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 14, color: "#000" }} className="font-baloo">
              Save
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

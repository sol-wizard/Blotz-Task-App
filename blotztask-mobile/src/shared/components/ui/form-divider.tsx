import React from "react";
import { View } from "react-native";

export const FormDivider = () => {
  return (
    <View
      style={{
        height: 1,
        width: "100%",
        borderRadius: 1,
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderStyle: "dashed",
        marginVertical: 16,
      }}
    >
      <View
        style={{
          left: 0,
          bottom: 0,
          width: "100%",
          height: 1,
          backgroundColor: "white",
        }}
      />
    </View>
  );
};

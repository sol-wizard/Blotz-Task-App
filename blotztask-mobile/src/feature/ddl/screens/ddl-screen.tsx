import { View, Text, StyleSheet } from "react-native";

export default function DdlScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.input}>DDL page</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 5,
  },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function NoGoalsView() {
  return (
    <View style={styles.container}>
      <View style={styles.imagePlaceholder}>
        <Text style={styles.imageText}>🎨</Text>
      </View>

      <Text style={styles.title}>No Goals right now!</Text>
      <Text style={styles.subtitle}>Your to do list is empty. Wanna Create new?</Text>

      <TouchableOpacity style={styles.button}>
        {/* <Ionicons name="checkmark-circle-outline" size={20} color="#2d2d2d" /> */}
        <Text style={styles.buttonText}>Check Sample</Text>
        <Text style={styles.arrow}>→</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button}>
        {/* <Ionicons name="add-circle-outline" size={20} color="#2d2d2d" /> */}
        <Text style={styles.buttonText}>Create New</Text>
        <Text style={styles.arrow}>→</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff'
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#eef2f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  imageText: {
    fontSize: 60,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2d2d2d',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e9e9f0',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 15,
    marginBottom: 15,
    width: '80%',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d2d2d',
    marginLeft: 10,
  },
  arrow: {
    marginLeft: 'auto', // 把箭头推到最右边
    fontSize: 16,
    color: '#2d2d2d',
  }
});
import React from 'react';
import { View, StyleSheet } from 'react-native';

interface VerticalDashedLineProps {
  height: number;
  color: string;
  width?: number;
  dashLength?: number;
  gapLength?: number;
  style?: object;
}

export const VerticalDashedLine: React.FC<VerticalDashedLineProps> = ({
  height,
  color,
  width = 2,
  dashLength = 5,
  gapLength = 3,
  style = {},
}) => {
  const totalDashes = Math.floor(height / (dashLength + gapLength));
  
  return (
    <View style={[styles.container, { height }, style]}>
      {Array.from({ length: totalDashes }).map((_, index) => (
        <View
          key={index}
          style={{
            width,
            height: dashLength,
            backgroundColor: color,
            marginBottom: gapLength,
          }}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
});

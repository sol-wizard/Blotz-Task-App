import React, { useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Card, Button, Text, Chip, Portal } from 'react-native-paper';
import { TaskDTO } from '../models/task-dto';

interface CalendarBottomSheetProps {
  task?: TaskDTO;
  isVisible: boolean;
  onClose: () => void;
}

const CalendarBottomSheet: React.FC<CalendarBottomSheetProps> = ({ 
  task, 
  isVisible, 
  onClose 
}) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%', '80%'], []);
  
  const handleSheetChange = useCallback((index: number) => {
    if (index === -1) {
      onClose();
      console.log('Bottom sheet closed');
    }
  }, [onClose]);

  return (
    <Portal>
      <View style={[StyleSheet.absoluteFillObject, styles.overlayContainer]} pointerEvents="box-none">
        {isVisible && (
          <Pressable
            style={styles.blocker}
            onPress={() => bottomSheetRef.current?.close()}
          />
        )}
        <BottomSheet
          ref={bottomSheetRef}
          index={isVisible ? 0 : -1}
          snapPoints={snapPoints}
          onChange={handleSheetChange}
          enablePanDownToClose
          backgroundStyle={styles.sheetBackground}
          handleIndicatorStyle={styles.handleIndicator}
        >
          <BottomSheetView style={styles.contentContainer}>
        {task ? (
          <>
            <Text variant="titleLarge" style={styles.title}>
              {task.name}
            </Text>

            <Card style={styles.card}>
              <Card.Title title="Task Details" />
              <Card.Content>
                <View style={styles.detailRow}>
                  <Text variant="bodyMedium">Status:</Text>
                  <Chip 
                    mode="outlined" 
                    textStyle={{ color: task.checked ? '#4CAF50' : '#FF9800' }}
                  >
                    {task.checked ? 'Completed' : 'Pending'}
                  </Chip>
                </View>
                
                <View style={styles.detailRow}>
                  <Text variant="bodyMedium">Date:</Text>
                  <Text variant="bodyMedium">
                    {task.date.toLocaleDateString()}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text variant="bodyMedium">ID:</Text>
                  <Text variant="bodySmall" style={styles.idText}>
                    {task.id}
                  </Text>
                </View>
              </Card.Content>
            </Card>

            <View style={styles.buttonContainer}>
              <Button
                mode="contained"
                onPress={() => bottomSheetRef.current?.close()}
                style={styles.button}
              >
                Close
              </Button>
              
              <Button
                mode="outlined"
                onPress={() => {
                  console.log('Edit task:', task.id);
                }}
                style={styles.button}
              >
                Edit Task
              </Button>
            </View>
          </>
        ) : (
          <Text variant="bodyMedium">No task selected</Text>
        )}
          </BottomSheetView>
        </BottomSheet>
      </View>
    </Portal>
  );
};

export default CalendarBottomSheet;

const styles = StyleSheet.create({
  overlayContainer: {
    zIndex: 9999,
  },
  blocker: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetBackground: {
    backgroundColor: '#FFFFFF',
  },
  handleIndicator: {
    backgroundColor: '#C7C7CC',
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  card: {
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  idText: {
    color: '#757575',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
});

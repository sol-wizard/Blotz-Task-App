import React, { useState } from "react";
import { View, TextInput, Button } from "react-native";

type TaskFormProps = {
  mode: "create" | "edit";
  defaultValues?: {
    title?: string;
    description?: string;
  };
  onSubmit: (data: { title: string; description: string }) => void;
};

const TaskForm = ({ mode, defaultValues, onSubmit }: TaskFormProps) => {
  const [title, setTitle] = useState(defaultValues?.title ?? "");
  const [description, setDescription] = useState(defaultValues?.description ?? "");

  return (
    <View>
      <TextInput value={title} onChangeText={setTitle} placeholder="Title" />
      <TextInput value={description} onChangeText={setDescription} placeholder="Description" />
      <Button
        title={mode === "create" ? "Create Task" : "Update Task"}
        onPress={() => onSubmit({ title, description })}
      />
    </View>
  );
};

export default TaskForm;

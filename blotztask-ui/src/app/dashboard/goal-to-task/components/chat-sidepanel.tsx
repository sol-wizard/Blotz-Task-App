'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
} from '../components/ui/sidepanel';
import { useSidebar, SidebarTrigger } from '../components/ui/sidepanel';
import { Button } from '@/components/ui/button';
import { addTaskItem } from '@/services/task-service'; // Service to add tasks to backend
import { mapTaskToAddTask } from '../utils/map-task-to-addtask-dto'; // Utility for mapping task DTOs
import React, { useState } from 'react';
import type { TaskDetailDTO } from '@/model/task-detail-dto';
import ChatSidePanelTaskcard from './chat-sidepanel-taskcard';

interface SidePanelProps {
  tasks: TaskDetailDTO[];
  setTasks: React.Dispatch<React.SetStateAction<TaskDetailDTO[]>>;
}

export function SidePanel({ tasks, setTasks }: SidePanelProps) {
  const { open } = useSidebar();
  const [isLoading, setIsLoading] = useState(false);

  // TODO: Add edit task function
  // TODO: Ensure only one task card can be in editing mode at a time
  // const handleUpdateTask = () => {

  // };


  const handleDeleteTask = (taskId: number) => {
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
  };

  // Handler for saving all tasks to the backend
  const handleAddAllTasks = async () => {
    setIsLoading(true);
    await Promise.all(
      tasks.map(async (task) => {
        try {
          await addTaskItem(mapTaskToAddTask(task));
        } catch (error: unknown) {
          console.error('Failed to save task:', error);
        }
      })
    );
    setTasks([]); // Clear tasks from sidebar after saving successfully
    setIsLoading(false);
  };

  return (
    <Sidebar side="right" variant="floating" collapsible="icon" className="ml-2">
      <SidebarHeader className="w-full text-base font-semibold px-4 py-3">
        {open && <div className="flex-1">Generated Tasks</div>}
        <SidebarTrigger />
      </SidebarHeader>

      {open && (
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              {tasks.length === 0 ? ( 
                <SidebarMenuItem className="p-4 text-center text-gray-500">
                  No selected tasks yet.
                </SidebarMenuItem>
              ) : (
                tasks.map((task) => (
                  <SidebarMenuItem key={task.id} className="p-0"> 
                    <ChatSidePanelTaskcard
                      task={task}
                      onDelete={handleDeleteTask}
                    />
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      )}

      {open && (
        <SidebarFooter className="text-xs text-muted-foreground px-8 py-2">
          {tasks.length > 0 && (
            <Button onClick={handleAddAllTasks} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save & Add'}
            </Button>
          )}
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
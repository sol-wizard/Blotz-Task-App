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
import ChatSidePanelTaskcard from './chat-sidepanel-taskcard';
import { addTaskItem } from '@/services/task-service';
import { mapTaskToAddTask } from '../utils/map-task-to-addtask-dto';
import React, { useState } from 'react';
import { TaskDetailDTO } from '@/model/task-detail-dto';

interface SidePanelProps {
  tasks: TaskDetailDTO[];
  setTasks: React.Dispatch<React.SetStateAction<TaskDetailDTO[]>>;
}

export function SidePanel({ tasks, setTasks }: SidePanelProps) {
  const { open } = useSidebar();
  const [isLoading, setIsLoading] = useState(false);
  // const onRemoveTaskcard = (taskId: string) => {
  //   setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
  // };

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
    setTasks([]);
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
              {tasks.map((task, i) => (
                <SidebarMenuItem key={i} className="p-0">
                  <ChatSidePanelTaskcard 
                  task={task} 
                  // handleRemoveTask={onRemoveTaskcard} 
                  />
                </SidebarMenuItem>
              ))}
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

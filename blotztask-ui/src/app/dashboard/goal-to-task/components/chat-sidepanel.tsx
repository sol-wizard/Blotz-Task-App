// components/tasks-sidebar.tsx
"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
} from "../components/ui/sidepanel";
import { ExtractedTask } from "@/model/extracted-task-dto";
import { useSidebar, SidebarTrigger } from "../components/ui/sidepanel";
import { Button } from '@/components/ui/button';
import TaskCardToAdd from "../../shared/components/taskcard/task-card-to-add";

interface SidePanelProps {
  tasks: ExtractedTask[];
  addedTaskIndices: Set<number>;
  onTaskAdded: (idx: number) => void;
}

export function SidePanel({
  tasks,
  addedTaskIndices,
  onTaskAdded,
}: SidePanelProps) {
  const { open } = useSidebar();
  return (
    <Sidebar side="right" variant="floating" collapsible="icon" className="ml-2">
      <SidebarHeader className="w-full text-base font-semibold px-4 py-3">
        {open && <div className="flex-1">Generated Tasks</div>}
        <SidebarTrigger />
      </SidebarHeader>

      {open &&
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              {tasks.map((t, i) => (
                <SidebarMenuItem key={i} className="p-0">
                  <TaskCardToAdd
                    taskToAdd={t}
                    index={i}
                    addedTaskIndices={addedTaskIndices}
                    onTaskAdded={onTaskAdded}
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      }
      
      {open && 
        <SidebarFooter className="text-xs text-muted-foreground px-8 py-2">
          <Button>Save & Add</Button>
        </SidebarFooter>
      }
    </Sidebar>
  );
}

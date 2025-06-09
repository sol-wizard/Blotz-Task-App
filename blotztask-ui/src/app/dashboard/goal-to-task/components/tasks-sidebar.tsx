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
import { Check, Plus } from "lucide-react";
import { ExtractedTask } from "@/model/extracted-task-dto";
import { useSidebar, SidebarTrigger } from "../components/ui/sidepanel";
import { Button } from '@/components/ui/button';

interface TasksSidebarProps {
  tasks: ExtractedTask[];
  addedTaskIndices: Set<number>;
  onTaskAdded: (idx: number) => void;
}

export function TasksSidebar({
  tasks,
  addedTaskIndices,
  onTaskAdded,
}: TasksSidebarProps) {
  const { open } = useSidebar();
  return (
    <Sidebar side="right" variant="floating" collapsible="icon" className="w-72 ml-2">
      <SidebarHeader className="w-full text-base font-semibold px-4 py-3">
        {open && <div className="flex-1">Generated Tasks</div>}
        <SidebarTrigger />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {tasks.map((t, i) => (
              <SidebarMenuItem
                key={i}
                onClick={() => onTaskAdded(i)}
                className="justify-between"
              >
                <span className="truncate">{t.title}</span>
                {addedTaskIndices.has(i) ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4 opacity-50" />
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      
      {open && 
        <SidebarFooter className="text-xs text-muted-foreground px-8 py-2">
          <Button>Save & Add</Button>
        </SidebarFooter>
      }
    </Sidebar>
  );
}

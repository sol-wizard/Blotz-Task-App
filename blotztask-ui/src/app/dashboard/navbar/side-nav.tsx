'use client';

import { ListChecks, ClipboardCheck, Plus, CalendarCheck, Bot } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { ProfileSectionButton } from './components/profile-section-button';
import { Categories } from './components/categories';
import { useEffect, useState } from 'react';
import { LabelDTO } from '@/model/label-dto';
import { fetchAllLabel } from '@/services/label-service';
import { cn } from '@/lib/utils';
import AddTaskDialog from './components/add-task-dialog';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SearchBar from './components/search-bar';
import { useTodayTaskActions } from '../../store/today-task-store';
import { useScheduleTaskActions } from '@/app/store/schedule-task-store';
import { useSearchQuery, useSearchTaskActions } from '@/app/store/search-task-store';
import { RawAddTaskDTO } from '@/model/raw-add-task-dto';
import { addTaskItem } from '@/services/task-service';

const menuItems = [
  { title: 'All Tasks', url: 'task-list', icon: ListChecks },
  { title: 'Today', url: 'today', icon: ClipboardCheck },
  { title: 'Schedule', url: 'schedule', icon: CalendarCheck },
];

const FEATURE_FLAG_KEY = 'aiEnabled';

export function AppSidebar() {
  const { loadScheduleTasks } = useScheduleTaskActions();
  const { loadTodayTasks } = useTodayTaskActions();
  const pathname = usePathname();
  const [aiEnabled, setAiEnabled] = useState(false);
  const { loadSearchTasks, setQuery } = useSearchTaskActions();
  const query = useSearchQuery();
  
  const handleSignOut = (e) => {
    e.preventDefault();
    window.location.href = '/api/auth/signout';
  };

  const [labels, setLabels] = useState<LabelDTO[]>([]);

  const loadAllLabel = async () => {
    try {
      const labelData = await fetchAllLabel();
      setLabels(labelData);
    } catch (error) {
      console.error('Error loading labels:', error);
    }
  };

  useEffect(() => {
    loadAllLabel();
    const flag = localStorage.getItem(FEATURE_FLAG_KEY);
    if (flag !== null) {
      setAiEnabled(flag === 'true');
    }
  }, []);

  const toggleAiFeature = (value) => {
    setAiEnabled(value);
    localStorage.setItem(FEATURE_FLAG_KEY, value.toString());
  };

  const submitGlobalTask = async (data: RawAddTaskDTO) => {
    try {
      await addTaskItem(data);
      loadTodayTasks();
      loadScheduleTasks();
    } catch (error) {
      console.error('Error adding action:', error);
    }
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="relative">
              <SidebarMenuItem className="w-full">
                <SearchBar query={query} loadSearchTasks={loadSearchTasks} setQuery={setQuery} />
              </SidebarMenuItem>

              <SidebarMenuItem>
                <AddTaskDialog submitGlobalTask={submitGlobalTask}>
                  <SidebarMenuButton className="flex items-center w-full px-4 py-3 ml-2 rounded-md hover:bg-blue-100 ">
                    <div
                      className={cn(
                        'bg-primary',
                        'text-white rounded-sm',
                        'inline-flex items-center justify-center'
                      )}
                    >
                      <Plus size={16} />
                    </div>
                    <span className="pl-3 text-primary text-xl">New Task</span>
                  </SidebarMenuButton>
                </AddTaskDialog>
              </SidebarMenuItem>

              {aiEnabled && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link
                      href="ai-assistant"
                      className="flex items-center ml-2 px-4 py-3 w-full rounded-md hover:bg-white"
                    >
                      <Bot className="text-indigo-600" />
                      <span className="pl-3 text-base text-indigo-700 font-medium">AI Assistant ✨</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    className={cn(
                      'flex items-center ml-2 px-4 py-3 w-full rounded-md',
                      pathname === `/dashboard/${item.url}`
                        ? 'bg-blue-100 text-primary hover:bg-blue-200'
                        : 'hover:bg-blue-200'
                    )}
                    asChild
                  >
                    <Link href={`/dashboard/${item.url}`}>
                      <item.icon />
                      <span className="pl-3 text-base">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className='mt-20'>
          <SidebarGroupLabel className="text-lg font-semibold mb-2 ml-2 px-4 text-primary">My Tasks</SidebarGroupLabel>
          <SidebarSeparator className="mb-2 bg-primary" />
          <SidebarGroupContent>
            <SidebarMenu>
              <Categories labels={labels} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <ProfileSectionButton
            onSignOut={handleSignOut}
            aiEnabled={aiEnabled}
            setAiEnabled={toggleAiFeature}
          />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

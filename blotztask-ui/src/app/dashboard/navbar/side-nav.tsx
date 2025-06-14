'use client';

import { Plus, CircleCheckBig, List, Calendar, Sparkles, Target } from 'lucide-react';
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
import { useIncompleteTodayTasks, useOverdueTasks, useTodayTaskActions } from '../../store/today-task-store';
import { useScheduleTaskStore, useScheduleTaskActions } from '@/app/store/schedule-task-store';
import { useSearchQuery, useSearchTaskActions } from '@/app/store/search-task-store';
import { RawAddTaskDTO } from '@/model/raw-add-task-dto';
import { addTaskItem } from '@/services/task-service';
import { Badge } from '@/components/ui/badge';



const FEATURE_FLAG_KEY = 'aiEnabled';

export function AppSidebar() {
  const { loadScheduleTasks } = useScheduleTaskActions();
  const { loadTodayTasks, loadOverdueTasks } = useTodayTaskActions();
  const overdueFromTodayStore = useOverdueTasks();
  const incompleteFromTodayStore = useIncompleteTodayTasks();
  const { overdueTasks: overdueFromScheduleStore, todayTasks: todayFromScheduleStore, tomorrowTasks: tomorrowFromScheduleStore, weekTasks: weekFromScheduleStore, monthTasks: monthFromScheduleStore } = useScheduleTaskStore();
  const pathname = usePathname();
  const [aiEnabled, setAiEnabled] = useState(true);
  const { loadSearchTasks, setQuery } = useSearchTaskActions();
  const query = useSearchQuery();

  const todayBadgeCount = overdueFromTodayStore.length + incompleteFromTodayStore.length;
  
  const monthTasksCount = Object.values(monthFromScheduleStore).flat().length;
  const scheduleBadgeCount = overdueFromScheduleStore.length + todayFromScheduleStore.length + tomorrowFromScheduleStore.length + weekFromScheduleStore.length + monthTasksCount;

  const menuItems = [
    { title: 'All Tasks', url: 'task-list', icon: List },
    { title: 'Today', url: 'today', icon: CircleCheckBig, count: todayBadgeCount},
    { title: 'Schedule', url: 'schedule', icon: Calendar, count: scheduleBadgeCount },
  ];

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
    loadTodayTasks();
    loadOverdueTasks();
    loadScheduleTasks();
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
            <p>{process.env.NODE_ENV}</p>
            <SidebarMenu className="relative">
              <SidebarMenuItem className="w-full">
                <SearchBar query={query} loadSearchTasks={loadSearchTasks} setQuery={setQuery} />
              </SidebarMenuItem>

              <SidebarMenuItem>
                <AddTaskDialog submitGlobalTask={submitGlobalTask}>
                  <SidebarMenuButton className="flex items-center w-full px-4 py-3 rounded-md hover:bg-blue-100 ">
                    <div
                      className={cn(
                        'bg-primary',
                        'text-white rounded-sm',
                        'inline-flex items-center justify-center'
                      )}
                    >
                      <Plus size={18} />
                    </div>
                    <span className="pl-3 text-primary text-xl">New Task</span>
                  </SidebarMenuButton>
                </AddTaskDialog>
              </SidebarMenuItem>

              {aiEnabled && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link
                        href="ai-assistant"
                        className="flex items-center px-4 py-3 w-full rounded-md hover:bg-white"
                      >
                        <Sparkles size={18} className='text-indigo-700'/>
                        <span className="pl-3 text-base font-medium text-indigo-700">AI Assistant</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link
                        href="goal-to-task"
                        className="flex items-center px-4 py-3 w-full rounded-md hover:bg-white"
                      >
                        <Target size={18} className='text-red-500'/>
                        <span className="pl-3 text-base text-indigo-700 font-medium">Goal to task</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}

              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    className={cn(
                      'flex items-center px-4 py-3 w-full rounded-md',
                      pathname === `/dashboard/${item.url}`
                        ? 'bg-blue-100 text-primary hover:bg-blue-200'
                        : 'hover:bg-blue-200'
                    )}
                    asChild
                  >
                    <Link href={`/dashboard/${item.url}`} className='flex justify-between '>
                      <div className='flex items-center'>
                        <item.icon size={18}/>
                        <span className="pl-3 text-base">{item.title}</span>
                      </div>

                      {item.count !== undefined && (
                        <Badge
                          className="w-6 h-6 rounded-full bg-white text-primary border border-primary text-sm font-semibold flex items-center justify-center"
                        >
                          {item.count}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-20">
          <SidebarGroupLabel className="text-lg font-semibold mb-2 ml-2 px-4 text-primary">
            My Tasks
          </SidebarGroupLabel>
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

'use client';

import { ListChecks, Home, ClipboardCheck, Plus } from 'lucide-react';
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
} from '@/components/ui/sidebar';
import { useSession } from 'next-auth/react';
import { ProfileSectionButton } from './components/profile-section-button';
import { Categories } from './components/categories';
import { useEffect, useState } from 'react';
import { LabelDTO } from '@/model/label-dto';
import { fetchAllLabel } from '@/services/labelService';
import { useTodayTaskStore } from '../store/today-task-store';
import { cn } from '@/lib/utils';
import AddTaskDialog from './components/add-task-dialog';

const authenticatedItems = [
  { title: 'All Tasks', url: 'task-list', icon: ListChecks },
  { title: 'Today', url: 'today', icon: ClipboardCheck },
];

const guestItems = [{ title: 'Home', url: '/home', icon: Home }];

const loadingItems = [{ title: 'Loading...', url: '#', icon: Home }];

export function AppSidebar() {
  const { data: session, status } = useSession();
  const handleAddTask = useTodayTaskStore((state) => state.handleAddTask);

  const handleSignOut = (e) => {
    e.preventDefault();
    window.location.href = '/api/auth/signout';
  };

  // Determine which items to show based on session status
  const items = status === 'loading' ? loadingItems : session ? authenticatedItems : guestItems;

  // Hook to load all labels
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
  }, []);

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem className="my-5 ml-5">
                <AddTaskDialog handleAddTask={handleAddTask}>
                  <SidebarMenuButton>
                    <div
                      className={cn(
                        'bg-primary',
                        'text-white p-1 rounded-sm',
                        'inline-flex items-center justify-center'
                      )}
                    >
                      <Plus size={18} />
                    </div>
                    <span className="text-primary text-xl">New Task</span>
                  </SidebarMenuButton>
                </AddTaskDialog>
              </SidebarMenuItem>

              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url} className="flex items-center ml-2 px-4 py-3 w-full hover:bg-white">
                      <item.icon />
                      <span className="pl-3 text-base">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-semibold mb-2">Task Categories</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <Categories labels={labels} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <ProfileSectionButton session={session} onSignOut={handleSignOut} />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

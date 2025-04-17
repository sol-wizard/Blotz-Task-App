'use client';

import { ListChecks, Home, ClipboardCheck, Plus, CalendarCheck, Bot } from 'lucide-react';
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
import { fetchAllLabel } from '@/services/label-service';
import { cn } from '@/lib/utils';
import AddTaskDialog from './components/add-task-dialog';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SearchBar from './components/search-bar';
import { useTodayTaskActions } from '../store/today-store/today-task-store';

const authenticatedItems = [
  { title: 'All Tasks', url: 'task-list', icon: ListChecks },
  { title: 'Today', url: 'today', icon: ClipboardCheck },
  { title: 'Schedule', url: 'schedule', icon: CalendarCheck },
];

const guestItems = [{ title: 'Home', url: '/home', icon: Home }];
const loadingItems = [{ title: 'Loading...', url: '#', icon: Home }];
const FEATURE_FLAG_KEY = 'aiEnabled';

export function AppSidebar() {
  const { data: session, status } = useSession();
  const { handleAddTask } = useTodayTaskActions();
  const pathname = usePathname();
  const [aiEnabled, setAiEnabled] = useState(false);
  const handleSignOut = (e) => {
    e.preventDefault();
    window.location.href = '/api/auth/signout';
  };

  // Determine which items to show based on session status
  const items = status === 'loading' ? loadingItems : session ? authenticatedItems : guestItems;

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

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="relative">
              <SidebarMenuItem className="w-full">
                <SearchBar />
              </SidebarMenuItem>

              <SidebarMenuItem>
                <AddTaskDialog handleAddTask={handleAddTask}>
                  <SidebarMenuButton className="flex items-center w-full px-4 py-3 rounded-md hover:bg-blue-100">
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

              {aiEnabled && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <a href="ai-assistant" className="flex items-center px-3 py-3 w-full hover:bg-white">
                      <Bot className="text-indigo-600" size={18} />
                      <span className="pl-3 text-base text-indigo-700 font-medium">AI Assistant ✨</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {items.map((item) => (
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
                    <Link href={item.url}>
                      <item.icon className="w-5 h-5" />
                      <span className="pl-3 text-base">{item.title}</span>
                    </Link>
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
          <ProfileSectionButton
            session={session}
            onSignOut={handleSignOut}
            aiEnabled={aiEnabled}
            setAiEnabled={toggleAiFeature}
          />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

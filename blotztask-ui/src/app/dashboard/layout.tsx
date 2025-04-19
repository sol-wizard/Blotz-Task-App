'use client';
import React from 'react';
import { AppSidebar } from './navbar/side-nav';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useSession } from 'next-auth/react';

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl text-gray-600 font-medium">Loading Dashboard...</p>
      </div>
    );
  }
  return (
    <div className="flex h-screen">
      <SidebarProvider>
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <SidebarTrigger />

          <main className="container mx-auto px-6 py-4 flex-1">{children}</main>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default DashboardLayout;

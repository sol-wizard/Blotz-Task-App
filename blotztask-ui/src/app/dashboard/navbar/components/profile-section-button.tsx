'use client';

import { useState } from 'react';
import { useEffect } from 'react';
import { SidebarMenuItem } from '@/components/ui/sidebar';
import { NavUser, User } from './nav-user';
import { fetchCurrentUserInfo } from '@/services/user-service';

export function ProfileSectionButton({ onSignOut, aiEnabled, setAiEnabled }) {
  const [userInfo, setUserInfo] = useState<User>();

  const loadUserInfo = async () => {
      //TODO: Move this to parent fetch logic to parent
    const result = await fetchCurrentUserInfo();
    setUserInfo({
      name: `${result.data.firstname} ${result.data.lastname}`,
      email: result.data.email,
      avatar: '../../../assets/images/blotz-logo.png',
    });
  };

  //TODO: Move this to parent 
  useEffect(() => {
    loadUserInfo();
  }, []);

  return (
    <SidebarMenuItem>
      {userInfo ? (
        <NavUser
          user={userInfo}
          onSignOut={onSignOut}
          aiEnabled={aiEnabled}
          onToggleAI={setAiEnabled}
        />
      ) : (
        <>Loading</>
      )}
    </SidebarMenuItem>
  );
}

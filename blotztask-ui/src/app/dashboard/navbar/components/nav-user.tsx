import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenuButton } from '@/components/ui/sidebar';
import { Switch } from '@/components/ui/switch';
import { ChevronsUpDown, LogOut, Settings } from 'lucide-react';

export interface User {
    name: string;
    email: string;
    avatar: string;
}

interface NavUserProps {
    user: User;
    onSignOut: () => void; 
    aiEnabled?: boolean;
    onToggleAI?: (enabled: boolean) => void;
} 
  
export function NavUser({ user, onSignOut, aiEnabled = false, onToggleAI }: NavUserProps) {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="rounded-lg">CN</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{user.name}</span>
              <span className="truncate text-xs">{user.email}</span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
          align="end"
          sideOffset={4}
          side="right"
        >
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">CN</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <Settings />
              Settings
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuGroup>
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex flex-col">
                <span className="text-sm font-medium">AI Assistant</span>
                <span className="text-xs text-muted-foreground">Enable task extraction</span>
              </div>
              <Switch
                checked={aiEnabled}
                onCheckedChange={onToggleAI}
                aria-label="Toggle AI Assistant"
              />
            </div>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />
          <DropdownMenuItem  onClick={onSignOut}>
            <LogOut />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

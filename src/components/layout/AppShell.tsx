
'use client';

import * as React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { NexusHubLogo } from '@/components/icons';
import { SIDENAV_ITEMS, SIDENAV_USER_ITEMS } from '@/lib/constants';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlusCircle, LogOut, UserCircle } from 'lucide-react';
import type { NavItem } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const SidebarButtonContentWrapper = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { item: NavItem | { icon: React.ElementType; title: string }, isActive?: boolean, asChild?: boolean }
>(({ item, isActive, asChild: _removedAsChild, ...props }, ref) => {
  const IconComponent = item.icon;
  return (
    <div ref={ref} {...props}>
      <IconComponent className={cn(isActive && "text-primary")} />
      <span className={cn(isActive && "font-semibold")}>{item.title}</span>
    </div>
  );
});
SidebarButtonContentWrapper.displayName = 'SidebarButtonContentWrapper';

const UserProfileButtonContentWrapper = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { user?: { avatarUrl?: string, name: string } | null, loading?: boolean, asChild?: boolean }
>(({ user, loading, asChild: _removedAsChild, ...props }, ref) => {
  if (loading) {
    return (
      <div ref={ref} {...props} className="flex items-center w-full">
        <Skeleton className="h-8 w-8 rounded-full mr-2" />
        <Skeleton className="h-5 w-24" />
      </div>
    );
  }
  if (!user) {
     return (
      <div ref={ref} {...props} className="flex items-center w-full">
        <UserCircle className="h-8 w-8 mr-2 text-muted-foreground" />
        <span>Login/Sign Up</span>
      </div>
    );
  }
  return (
    <div ref={ref} {...props} className="flex items-center w-full">
      <Avatar className="h-8 w-8 mr-2">
        <AvatarImage src={user.avatarUrl || `https://placehold.co/32x32.png`} alt={user.name} data-ai-hint="profile avatar small"/>
        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
      </Avatar>
      <span className="truncate">{user.name}</span>
    </div>
  );
});
UserProfileButtonContentWrapper.displayName = 'UserProfileButtonContentWrapper';


export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();

  const resolvedUserNavItems = SIDENAV_USER_ITEMS.map(item => {
    if (item.href === '/profile/me' && user) {
      return { ...item, href: `/profile/${user.id}` };
    }
    return item;
  });

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        variant="sidebar"
        collapsible="icon"
        className="border-r dark:border-neutral-700"
      >
        <SidebarHeader className="p-4">
          <NexusHubLogo />
        </SidebarHeader>
        <ScrollArea className="flex-1">
          <SidebarContent className="p-2">
            <SidebarMenu>
               <SidebarMenuItem>
                 <Button asChild className="w-full btn-gradient" size="lg">
                   <Link href="/posts/create">
                     <PlusCircle className="mr-2 h-5 w-5" />
                     Create Post
                   </Link>
                 </Button>
              </SidebarMenuItem>
              {SIDENAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <SidebarMenuItem key={item.title}>
                    <Link href={item.href} asChild>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        variant="default"
                        disabled={item.disabled}
                      >
                        <SidebarButtonContentWrapper item={item} isActive={isActive} />
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>
        </ScrollArea>
        <SidebarSeparator />
        <SidebarFooter className="p-2">
           <Link href={user ? `/profile/${user.id}` : "/login"} asChild>
            <SidebarMenuButton asChild tooltip={user ? "Profile" : "Login"} variant="ghost" className="justify-start">
              <UserProfileButtonContentWrapper user={user} loading={authLoading} />
            </SidebarMenuButton>
          </Link>
          {resolvedUserNavItems.map((item) => {
            if (item.title === 'Profile' && user) return null;
            if (item.title === 'Logout' && !user) return null;
            if(item.title === 'Settings' && !user && item.href === '/settings') return null;

            const isActive = pathname === item.href;
            return (
                <SidebarMenuItem key={item.title}>
                  <Link href={item.href} asChild>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      variant="ghost"
                      disabled={item.disabled}
                    >
                       <SidebarButtonContentWrapper item={item} isActive={isActive}/>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
            );
          })}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-background">
          {children}
        </main>
      </SidebarInset>
    </div>
  );
}

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
import { PlusCircle } from 'lucide-react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { open, setOpen, isMobile, openMobile, setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const { user } = useAuth();

  const resolvedUserNavItems = SIDENAV_USER_ITEMS.map(item => 
    item.href === '/profile/me' && user ? { ...item, href: `/profile/${user.id}` } : item
  );

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
                <Link href="/posts/create" passHref legacyBehavior>
                  <Button className="w-full btn-gradient" size="lg">
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Create Post
                  </Button>
                </Link>
              </SidebarMenuItem>
              {SIDENAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <Link href={item.href} passHref legacyBehavior>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={item.title}
                      variant="default"
                    >
                      <a>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </ScrollArea>
        <SidebarSeparator />
        <SidebarFooter className="p-2">
           {user && (
             <Link href={`/profile/${user.id}`} passHref legacyBehavior>
              <SidebarMenuButton asChild tooltip="Profile" variant="ghost" className="justify-start">
                <a>
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="truncate">{user.name}</span>
                </a>
              </SidebarMenuButton>
            </Link>
           )}
          {resolvedUserNavItems.map((item) => (
             item.href !== `/profile/${user?.id}` && // Avoid duplicate profile link
            <SidebarMenuItem key={item.title}>
              <Link href={item.href} passHref legacyBehavior>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.title}
                  variant="ghost"
                >
                  <a>
                    <item.icon />
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
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

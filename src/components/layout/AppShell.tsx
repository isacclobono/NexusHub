
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
import { SIDENAV_ITEMS } from '@/lib/constants';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/use-auth-provider';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlusCircle, LogOut, UserCircle, Settings as SettingsIcon, LogIn, UserPlus } from 'lucide-react';
import type { NavItem } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';


const SidebarButtonContentWrapper = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { item: NavItem | { icon: React.ElementType; title: string }, isActive?: boolean, asChild?: boolean }
>(({ item, isActive, asChild: _removedAsChild, ...props }, ref) => {
  const IconComponent = item.icon;
  return (
    <div ref={ref} {...props} className={cn("flex items-center w-full", props.className)}>
      <IconComponent className={cn("mr-2 h-5 w-5", isActive && "text-primary")} />
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
      <div ref={ref} {...props} className={cn("flex items-center w-full", props.className)}>
        <Skeleton className="h-8 w-8 rounded-full mr-2" />
        <Skeleton className="h-5 w-24" />
      </div>
    );
  }
  if (!user) { // Should not happen if this component is rendered conditionally
     return (
      <div ref={ref} {...props} className={cn("flex items-center w-full", props.className)}>
        <LogIn className="h-5 w-5 mr-2 text-muted-foreground" />
        <span>Login / Sign Up</span>
      </div>
    );
  }
  return (
    <div ref={ref} {...props} className={cn("flex items-center w-full", props.className)}>
      <Avatar className="h-8 w-8 mr-2 border">
        <AvatarImage src={user.avatarUrl || `https://placehold.co/32x32.png`} alt={user.name} data-ai-hint="profile avatar small"/>
        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
      </Avatar>
      <span className="truncate font-medium">{user.name}</span>
    </div>
  );
});
UserProfileButtonContentWrapper.displayName = 'UserProfileButtonContentWrapper';


export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading: authLoading, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    router.push('/login');
  };

  const userNavItems: NavItem[] = React.useMemo(() => {
    if (authLoading) return []; // Or return skeleton items
    if (isAuthenticated && user) {
      return [
        { title: 'Profile', href: `/profile/${user.id}`, icon: UserCircle },
        { title: 'Settings', href: '/settings', icon: SettingsIcon },
        { title: 'Logout', onClick: handleLogout, icon: LogOut, href: '#' }
      ];
    }
    return [
      { title: 'Login', href: '/login', icon: LogIn },
      { title: 'Register', href: '/register', icon: UserPlus }
    ];
  }, [user, authLoading, isAuthenticated, handleLogout, router]);


  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        variant="sidebar"
        collapsible="icon"
        className="border-r dark:border-neutral-700 bg-card"
      >
        <SidebarHeader className="p-4">
          <Link href="/" aria-label="NexusHub Home">
            <NexusHubLogo />
          </Link>
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
                    <Link href={item.href} passHref legacyBehavior={false} >
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
          {authLoading ? (
            <>
              <Skeleton className="h-10 w-full rounded-md mb-1" />
              <Skeleton className="h-10 w-full rounded-md" />
            </>
          ) : (
            userNavItems.map((item) => {
              const isActive = pathname === item.href;
              if (item.onClick) {
                return (
                   <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        onClick={item.onClick}
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        variant="ghost"
                        className={cn(item.title === 'Logout' && 'text-destructive hover:bg-destructive/10 hover:text-destructive focus:text-destructive focus:bg-destructive/10')}
                      >
                         <SidebarButtonContentWrapper item={item} isActive={isActive} />
                      </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              }
              return (
                <SidebarMenuItem key={item.title}>
                  <Link href={item.href} passHref legacyBehavior={false}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      variant="ghost"
                    >
                       <SidebarButtonContentWrapper item={item} isActive={isActive}/>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              );
            })
          )}
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

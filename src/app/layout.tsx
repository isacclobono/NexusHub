
'use client';

import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppShell from '@/components/layout/AppShell';
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from '@/hooks/use-auth-provider';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react'; // Added Loader2 import


const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  weight: ['400', '700'],
});


function AuthRedirectWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  const authPages = ['/login', '/register'];
  // Define explicitly which pages are public and use a simple layout
  const simpleLayoutPages = ['/', '/login', '/register'];

  useEffect(() => {
    if (loading) {
      return; // Wait for auth state to load
    }

    const isOnAuthPage = authPages.includes(pathname);
    const isOnLandingPage = pathname === '/';

    if (isAuthenticated) {
      // User is logged in
      if (isOnAuthPage || isOnLandingPage) {
        // If on login, register, or landing page, redirect to feed
        router.push('/feed');
      }
      // Otherwise, they are on a protected page or a page that should use AppShell, let them proceed.
    } else {
      // User is NOT logged in
      // If trying to access a page that is NOT one of the simpleLayoutPages (i.e., it's protected)
      if (!simpleLayoutPages.includes(pathname)) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      }
      // Otherwise, they are on landing, login, or register, let them proceed.
    }
  }, [pathname, isAuthenticated, loading, router]);

  if (loading) {
    // If auth is loading, show a full-page loader to prevent layout shifts or content flashes.
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // After loading, decide layout based on authentication and path
  if (isAuthenticated) {
    // User is authenticated
    if (authPages.includes(pathname) || pathname === '/') {
      // If on login, register, or landing page, a redirect to /feed is pending (from useEffect).
      // Show a loader to prevent briefly rendering the simple layout page.
      return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
    }
    // Authenticated and on a protected page, render with AppShell
    return (
      <SidebarProvider defaultOpen={true}>
        <AppShell>
          {children}
        </AppShell>
      </SidebarProvider>
    );
  } else {
    // User is NOT authenticated
    if (simpleLayoutPages.includes(pathname)) {
      // If on a public page (landing, login, register), render simple layout
      return <>{children}</>;
    }
    // Not authenticated and on a protected page - useEffect should redirect to /login.
    // Show a loader until redirect completes.
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    // Apply dark mode from localStorage on initial load
    if (localStorage.getItem('theme') === 'dark' ||
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="font-body antialiased h-full bg-background text-foreground">
        <AuthProvider>
          <TooltipProvider delayDuration={100}>
            <AuthRedirectWrapper>
              {children}
            </AuthRedirectWrapper>
          </TooltipProvider>
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}

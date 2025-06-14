
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
  const publicPages = ['/', ...authPages]; // Landing page is public

  useEffect(() => {
    if (loading) {
      return; 
    }

    const isAuthPage = authPages.includes(pathname);
    const isLandingPage = pathname === '/';

    if (!isAuthenticated && !publicPages.includes(pathname)) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    } else if (isAuthenticated && isAuthPage) { // Redirect logged-in users away from login/register
      router.push('/feed');
    }
    // Allow authenticated users to visit the landing page ('/')
    
  }, [pathname, isAuthenticated, loading, router]); 

  // Determine if AppShell (with sidebar etc.) should be used
  // It should NOT be used for login, register, or the main landing page ('/')
  const useSimpleLayout = publicPages.includes(pathname);

  if (useSimpleLayout) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AppShell>
        {children}
      </AppShell>
    </SidebarProvider>
  );
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

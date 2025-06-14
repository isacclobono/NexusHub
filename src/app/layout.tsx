
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
  const publicPages = ['/', ...authPages];

  useEffect(() => {
    if (loading) {
      return; 
    }

    const isAuthPage = authPages.includes(pathname);
    const isLandingPage = pathname === '/';

    if (!isAuthenticated && !publicPages.includes(pathname)) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    } else if (isAuthenticated && (isAuthPage || isLandingPage)) {
      router.push('/feed');
    }
  }, [pathname, isAuthenticated, loading, router, publicPages]); 

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

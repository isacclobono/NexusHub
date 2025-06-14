
'use client';

import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppShell from '@/components/layout/AppShell';
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from '@/hooks/use-auth-provider';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect } from 'react';

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

// Metadata should ideally be handled by a Server Component or generateMetadata if needed dynamically.
// For a client RootLayout, static metadata can be defined here or in specific page.tsx files.
// export const metadata: Metadata = {
//   title: 'NexusHub - Your Community Platform',
//   description: 'The all-in-one community platform for connection, collaboration, and content.',
// };

function AuthRedirectWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  const authPages = ['/login', '/register'];
  const publicPages = ['/', ...authPages];

  useEffect(() => {
    if (loading) {
      return; // Wait until authentication status is resolved
    }

    const isAuthPage = authPages.includes(pathname);
    const isLandingPage = pathname === '/';

    if (!isAuthenticated && !publicPages.includes(pathname)) {
      // User is not authenticated and trying to access a protected page
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    } else if (isAuthenticated && (isAuthPage || isLandingPage)) {
      // User is authenticated and on an auth page or landing page
      router.push('/feed');
    }
  }, [pathname, isAuthenticated, loading, router, publicPages]); // Added publicPages to dependency array

  // Determine if the current page should use the simple layout (no AppShell)
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
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}

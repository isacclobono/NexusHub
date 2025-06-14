
'use client';

import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppShell from '@/components/layout/AppShell';
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from '@/hooks/use-auth-provider';
import { usePathname } from 'next/navigation';

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const simpleLayoutPaths = ['/', '/login', '/register'];
  const useSimpleLayout = simpleLayoutPaths.includes(pathname);

  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full`}>
      
      <body className="font-body antialiased h-full bg-background text-foreground">
        <AuthProvider>
          <TooltipProvider delayDuration={100}>
            {useSimpleLayout ? (
              <>{children}</>
            ) : (
              <SidebarProvider defaultOpen={true}>
                <AppShell>
                  {children}
                </AppShell>
              </SidebarProvider>
            )}
          </TooltipProvider>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}

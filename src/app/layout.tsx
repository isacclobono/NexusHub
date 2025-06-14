
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppShell from '@/components/layout/AppShell';
import { TooltipProvider } from "@/components/ui/tooltip"; // Added for global tooltip provider

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

export const metadata: Metadata = {
  title: 'NexusHub - Your Community Platform',
  description: 'The all-in-one community platform for connection, collaboration, and content.',
  // Add more metadata like icons, open graph tags etc.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full`}>
      <head />
      <body className="font-body antialiased h-full bg-background text-foreground">
        <TooltipProvider delayDuration={100}>
          <SidebarProvider defaultOpen={true}>
            <AppShell>
              {children}
            </AppShell>
          </SidebarProvider>
        </TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}

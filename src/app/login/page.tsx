
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import toast from 'react-hot-toast';
import { LogIn, Loader2, UserPlus, AlertTriangle } from "lucide-react";
import { useAuth } from '@/hooks/use-auth-provider';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const success = await login(email, password);
      if (success) {
        toast.success("Welcome back!");
        const redirectUrl = searchParams.get('redirect') || '/feed';
        router.push(redirectUrl);
      }
      // If login throws an error, it will be caught below
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Invalid email or password. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-primary">
        <CardHeader className="text-center pt-8">
          <div className="mx-auto mb-6 p-4 bg-primary rounded-full inline-block shadow-md">
             <LogIn className="h-10 w-10 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-headline">Welcome Back!</CardTitle>
          <CardDescription>Sign in to continue to NexusHub.</CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Button variant="link" size="sm" className="p-0 h-auto text-xs text-primary hover:text-accent" disabled={isLoading} asChild>
                   <Link href="/forgot-password"><span className="inline-flex items-center justify-center">Forgot password?</span></Link>
                </Button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="text-base"
              />
            </div>
            <Button type="submit" className="w-full btn-gradient text-lg py-3" disabled={isLoading}>
              <span className="inline-flex items-center justify-center gap-2">
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <LogIn className="h-5 w-5" />
                )}
                Sign In
              </span>
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-3 pt-6 pb-8 bg-muted/50 rounded-b-lg">
          <p className="text-sm text-muted-foreground">
            Don't have an account?
          </p>
          <Button variant="outline" asChild className="w-full border-primary/50 text-primary hover:bg-primary/5 hover:text-primary" disabled={isLoading}>
            <Link href="/register">
              <span className="inline-flex items-center justify-center gap-2">
                <UserPlus className="mr-2 h-4 w-4" /> Create a New Account
              </span>
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

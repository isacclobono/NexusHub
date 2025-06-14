
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Loader2, LogIn, AlertTriangle } from "lucide-react";
import { useAuth } from '@/hooks/use-auth-provider';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please re-enter.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);

    const success = await register(name, email, password);

    if (success) {
      toast({
        title: "Registration Almost Complete!",
        description: "Welcome to NexusHub! Please log in to continue.",
      });
      router.push('/login'); 
    } else {
      // Assuming register function might return a more specific error or it's generic
      const regError = "Could not create your account. The email might already be in use or another issue occurred.";
      setError(regError);
      toast({
        title: "Registration Failed",
        description: regError,
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-accent/10 via-background to-background p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-accent">
        <CardHeader className="text-center pt-8">
           <div className="mx-auto mb-6 p-4 bg-accent rounded-full inline-block shadow-md">
             <UserPlus className="h-10 w-10 text-accent-foreground" />
          </div>
          <CardTitle className="text-3xl font-headline">Create Your Account</CardTitle>
          <CardDescription>Join NexusHub to connect and collaborate.</CardDescription>
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
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
                className="text-base"
              />
            </div>
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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="•••••••• (min. 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={isLoading}
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                className="text-base"
              />
            </div>
            <Button type="submit" className="w-full btn-gradient text-lg py-3" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-5 w-5" />
              )}
              Create Account
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-3 pt-6 pb-8 bg-muted/50 rounded-b-lg">
          <p className="text-sm text-muted-foreground">
            Already have an account?
          </p>
           <Button variant="outline" asChild className="w-full border-primary/50 text-primary hover:bg-primary/5 hover:text-primary" disabled={isLoading}>
            <Link href="/login">
               <LogIn className="mr-2 h-4 w-4" /> Sign In Instead
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

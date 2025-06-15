
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import toast from 'react-hot-toast';
import { Mail, Loader2, LogIn, AlertTriangle, CheckCircle } from "lucide-react";
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState<string | null>(null); // For dev only
  const router = useRouter();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true);
    setError(null);
    setMessage(null);
    setShowToken(null);

    try {
      const response = await fetch('/api/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to request password reset.");
      }
      setMessage(result.message || "If an account with that email exists, a password reset link has been sent (simulated).");
      toast.success(result.message || "Password reset instructions sent (simulated).");
      if (result.resetTokenForDev) { // For development display
          setShowToken(result.resetTokenForDev);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
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
             <Mail className="h-10 w-10 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-headline">Forgot Your Password?</CardTitle>
          <CardDescription>Enter your email address and we'll send you a link to reset your password (simulated).</CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" /> {error}
                </div>
              )}
              {message && !showToken && (
                <div className="p-3 bg-green-500/10 text-green-700 dark:text-green-400 text-sm rounded-md flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" /> {message}
                </div>
              )}
              {showToken && (
                <div className="p-3 bg-yellow-400/10 text-yellow-700 dark:text-yellow-400 text-sm rounded-md">
                  <p className="font-semibold mb-1">Development Mode: Password Reset Token</p>
                  <p className="break-all text-xs">Token: <code>{showToken}</code></p>
                  <p className="mt-2">Use this token on the <Link href={`/reset-password?token=${showToken}`} className="font-bold underline hover:text-yellow-600">Reset Password Page</Link>.</p>
                  <p className="text-xs mt-1 italic">This token is shown for testing purposes as email sending is not implemented.</p>
                </div>
              )}

              {!message && !showToken && (
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="email">Email Address</Label>
                      <FormControl>
                        <Input id="email" type="email" placeholder="you@example.com" {...field} disabled={isLoading} className="text-base" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {!message && !showToken && (
                <Button type="submit" className="w-full btn-gradient text-lg py-3" disabled={isLoading}>
                  <span className="inline-flex items-center justify-center gap-2">
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />}
                    Send Reset Link
                  </span>
                </Button>
              )}
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-3 pt-6 pb-8 bg-muted/50 rounded-b-lg">
          <p className="text-sm text-muted-foreground">Remember your password?</p>
          <Button variant="outline" asChild className="w-full border-primary/50 text-primary hover:bg-primary/5 hover:text-primary" disabled={isLoading}>
            <Link href="/login">
              <span className="inline-flex items-center justify-center gap-2">
                <LogIn className="mr-2 h-4 w-4" /> Back to Login
              </span>
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

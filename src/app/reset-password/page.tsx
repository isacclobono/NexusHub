
'use client';

import { useState, useEffect, Suspense } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import toast from 'react-hot-toast';
import { Lock, Loader2, LogIn, AlertTriangle, CheckCircle, Eye, EyeOff } from "lucide-react";
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, { message: "Password must be at least 8 characters long." }),
  confirmPassword: z.string().min(8, { message: "Please confirm your password." }),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
    } else {
      setError("No reset token provided or token is invalid. Please request a new password reset.");
      toast.error("Invalid or missing password reset token.");
    }
  }, [searchParams]);

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      setError("Password reset token is missing.");
      toast.error("Password reset token is missing.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: data.newPassword }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to reset password.");
      }
      setMessage(result.message || "Your password has been successfully reset. You can now log in.");
      toast.success(result.message || "Password reset successfully!");
      form.reset();
      // Optional: redirect to login after a delay
      setTimeout(() => router.push('/login'), 3000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token && !error) {
    return (
        <div className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Verifying token...</p>
        </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-primary">
        <CardHeader className="text-center pt-8">
          <div className="mx-auto mb-6 p-4 bg-primary rounded-full inline-block shadow-md">
             <Lock className="h-10 w-10 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-headline">Reset Your Password</CardTitle>
          <CardDescription>Enter and confirm your new password.</CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-8">
           {error && (
            <div className="p-3 mb-6 bg-destructive/10 text-destructive text-sm rounded-md flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" /> {error}
            </div>
          )}
          {message && (
            <div className="p-3 mb-6 bg-green-500/10 text-green-700 dark:text-green-400 text-sm rounded-md flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" /> {message}
            </div>
          )}

          {!message && token && ( // Only show form if no success message and token is present
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="newPassword">New Password</Label>
                      <FormControl>
                        <div className="relative">
                          <Input id="newPassword" type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} disabled={isLoading} className="text-base pr-10" />
                          <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                            {showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                       <FormControl>
                        <div className="relative">
                          <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" {...field} disabled={isLoading} className="text-base pr-10" />
                          <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowConfirmPassword(!showConfirmPassword)} tabIndex={-1}>
                            {showConfirmPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full btn-gradient text-lg py-3" disabled={isLoading || !token}>
                  <span className="inline-flex items-center justify-center gap-2">
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
                    Reset Password
                  </span>
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-3 pt-6 pb-8 bg-muted/50 rounded-b-lg">
           {message && (
             <Button variant="outline" asChild className="w-full border-primary/50 text-primary hover:bg-primary/5 hover:text-primary">
                <Link href="/login">
                    <LogIn className="mr-2 h-4 w-4" /> Proceed to Login
                </Link>
             </Button>
           )}
          <p className="text-xs text-muted-foreground">
            If you didn't request this, you can safely ignore this page.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}


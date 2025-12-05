"use client";

import { useState } from "react";
import Link from "next/link";
import { Cloud, Loader2, Mail, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    organizationName: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      // Show email sent confirmation
      setRegisteredEmail(formData.email);
      setEmailSent(true);
    } catch (error) {
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registeredEmail }),
      });

      if (res.ok) {
        toast({
          title: "Email sent!",
          description: "Check your inbox for the verification link.",
        });
      } else {
        throw new Error("Failed to resend email");
      }
    } catch (error) {
      toast({
        title: "Failed to resend",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Email sent confirmation screen
  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <div className="p-3 bg-terminal-green/10 rounded-xl mb-4">
              <Cloud className="w-10 h-10 text-terminal-green" />
            </div>
            <h1 className="text-2xl font-bold text-foreground font-mono">Cloud Academy</h1>
          </div>

          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-terminal-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-terminal-green" />
            </div>
            
            <h2 className="text-xl font-semibold text-foreground mb-2">Check your email</h2>
            
            <p className="text-muted-foreground mb-6">
              We&apos;ve sent a verification link to<br />
              <span className="text-foreground font-medium">{registeredEmail}</span>
            </p>

            <p className="text-sm text-muted-foreground mb-6">
              Click the link in the email to verify your account and sign in.
            </p>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResendEmail}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Resend verification email
              </Button>
              
              <Link href="/login">
                <Button variant="ghost" className="w-full text-muted-foreground">
                  Back to sign in
                </Button>
              </Link>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-6">
            Didn&apos;t receive the email? Check your spam folder.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-terminal-green/10 rounded-xl mb-4">
            <Cloud className="w-10 h-10 text-terminal-green" />
          </div>
          <h1 className="text-2xl font-bold text-foreground font-mono">Cloud Academy</h1>
          <p className="text-muted-foreground text-sm mt-1">Master AWS Architecture</p>
        </div>

        {/* Register Form */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-6">Create your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="bg-accent border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="johndoe"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })
                }
                required
                minLength={3}
                maxLength={20}
                className="bg-accent border-border"
              />
              <p className="text-xs text-muted-foreground">3-20 characters, letters, numbers, underscores only</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="bg-accent border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  minLength={8}
                  className="bg-accent border-border pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="organizationName">Organization <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="organizationName"
                type="text"
                placeholder="Acme Inc."
                value={formData.organizationName}
                onChange={(e) =>
                  setFormData({ ...formData, organizationName: e.target.value })
                }
                className="bg-accent border-border"
              />
              <p className="text-xs text-muted-foreground">For team accounts</p>
            </div>

            <Button
              type="submit"
              className="w-full bg-terminal-green hover:bg-terminal-green/90 text-black font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground text-sm">
              Already have an account?{" "}
              <Link href="/login" className="text-terminal-green hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="p-3 bg-card/50 border border-border rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Free tier</p>
            <p className="text-sm font-semibold text-foreground">5GB transfers</p>
          </div>
          <div className="p-3 bg-card/50 border border-border rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Multi-tenant</p>
            <p className="text-sm font-semibold text-foreground">Isolated data</p>
          </div>
        </div>
      </div>
    </div>
  );
}

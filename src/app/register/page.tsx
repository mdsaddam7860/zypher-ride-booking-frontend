"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import * as Tabs from "@radix-ui/react-tabs";
import { useMutation } from "@tanstack/react-query";
import { api, getApiErrorMessage } from "@/lib/api";
import { useSessionStore } from "@/store/useSessionStore";
import type { AuthResult, Role } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Registration is only for riders and drivers — owner accounts are
// provisioned separately, same as the login screen.
const ROLES: { value: Extract<Role, "rider" | "driver">; label: string }[] = [
  { value: "rider", label: "Rider" },
  { value: "driver", label: "Driver" },
];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useSessionStore((s) => s.setSession);

  const initialRole = searchParams.get("role") === "driver" ? "driver" : "rider";
  const [role, setRole] = useState<Extract<Role, "rider" | "driver">>(initialRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const registerMutation = useMutation({
    mutationFn: async () => {
      const payload = { name, email, phone, password };
      // POSTs to /api/auth/register/driver or /api/auth/register/rider
      const { data } = await api.post<AuthResult>(`/api/auth/register/${role}`, payload);
      return data;
    },
    onSuccess: (data) => {
      setSession(data);
      router.replace(`/${data.role}`);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (password !== confirmPassword) {
      setFormError("Passwords don't match");
      return;
    }
    registerMutation.mutate();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>Sign up as a rider or driver to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs.Root value={role} onValueChange={(v) => setRole(v as "rider" | "driver")}>
            <Tabs.List className="mb-4 grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
              {ROLES.map((r) => (
                <Tabs.Trigger
                  key={r.value}
                  value={r.value}
                  className="rounded-sm px-2 py-1.5 text-sm font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  {r.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </Tabs.Root>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoComplete="tel"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}
            {registerMutation.isError && (
              <p className="text-sm text-destructive">{getApiErrorMessage(registerMutation.error)}</p>
            )}

            <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? "Creating account…" : `Create ${role} account`}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}

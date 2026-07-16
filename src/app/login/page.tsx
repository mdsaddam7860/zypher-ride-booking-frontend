"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import { useMutation } from "@tanstack/react-query";
import { api, getApiErrorMessage } from "@/lib/api";
import { useSessionStore } from "@/store/useSessionStore";
import type { AuthResult, Role } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const ROLES: { value: Role; label: string }[] = [
  { value: "rider", label: "Rider" },
  { value: "driver", label: "Driver" },
  { value: "owner", label: "Owner" },
];

export default function LoginPage() {
  const router = useRouter();
  const setSession = useSessionStore((s) => s.setSession);
  const [role, setRole] = useState<Role>("rider");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<AuthResult>(`/api/auth/login/${role}`, { email, password });
      return data;
    },
    onSuccess: (data) => {
      setSession(data);
      router.replace(`/${data.role}`);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    loginMutation.mutate();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Choose your role and sign in to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs.Root value={role} onValueChange={(v) => setRole(v as Role)}>
            <Tabs.List className="mb-4 grid grid-cols-3 gap-1 rounded-md bg-muted p-1">
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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {loginMutation.isError && (
              <p className="text-sm text-destructive">{getApiErrorMessage(loginMutation.error)}</p>
            )}

            <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "Signing in…" : `Sign in as ${role}`}
            </Button>
          </form>

          {role !== "owner" && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              No account?{" "}
              <Link href={`/register?role=${role}`} className="font-medium text-primary hover:underline">
                Create one
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

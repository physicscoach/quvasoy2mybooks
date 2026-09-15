"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { loginSchema, type LoginFormValues } from "@/lib/validators/auth.schema";
import { login } from "@/lib/api/auth";
import { useAuthStore } from "@/store/authStore";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((s) => s.setUser);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      const me = await login(values);
      setUser(me);
      toast.success("Muvaffaqiyatli kirdingiz");
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/") ? next : "/books");
      router.refresh();
    } catch (err) {
      const errors = (err as { errors?: Record<string, string[] | string> } | undefined)?.errors;
      if (errors) {
        let handled = false;
        for (const [field, message] of Object.entries(errors)) {
          if (field === "login" || field === "password") {
            form.setError(field, {
              message: Array.isArray(message) ? message.join(", ") : message,
            });
            handled = true;
          }
        }
        if (!handled) {
          const message = (err as Error).message || "Kirishda xatolik yuz berdi";
          setServerError(message);
        }
      } else {
        setServerError((err as Error).message || "Kirishda xatolik yuz berdi");
      }
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Kirish</CardTitle>
        <CardDescription>Hisobingizga kiring va o&apos;qishni davom ettiring.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="login"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Foydalanuvchi nomi yoki email</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="foydalanuvchi yoki siz@example.com" autoComplete="username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parol</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {serverError && <p className="text-sm text-destructive">{serverError}</p>}
            <Button type="submit" disabled={form.formState.isSubmitting} className="mt-1">
              {form.formState.isSubmitting ? "Kirilmoqda..." : "Kirish"}
            </Button>
          </form>
        </Form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Hisobingiz yo&apos;qmi?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Ro&apos;yxatdan o&apos;ting
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

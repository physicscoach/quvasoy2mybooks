"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { AuthShell } from "@/components/layout/AuthShell";
import { registerSchema, type RegisterFormValues } from "@/lib/validators/auth.schema";
import { register as registerRequest, login } from "@/lib/api/auth";
import { useAuthStore } from "@/store/authStore";
import { useQueryClient } from "@tanstack/react-query";

const FIELD_NAMES = ["username", "email", "first_name", "password", "password_confirm"] as const;
type FieldName = (typeof FIELD_NAMES)[number];

function isFieldName(value: string): value is FieldName {
  return (FIELD_NAMES as readonly string[]).includes(value);
}

export default function RegisterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      first_name: "",
      email: "",
      password: "",
      password_confirm: "",
    },
  });

  async function onSubmit(values: RegisterFormValues) {
    setServerError(null);
    try {
      await registerRequest({
        username: values.username,
        email: values.email,
        password: values.password,
        first_name: values.first_name,
      });
      const me = await login({ login: values.username, password: values.password });
      setUser(me);
      queryClient.setQueryData(["me"], me);
      toast.success("Hisob ochildi. Xush kelibsiz!");
      router.push("/books");
      router.refresh();
    } catch (err) {
      const errors = (err as { errors?: Record<string, string[] | string> } | undefined)?.errors;
      if (errors) {
        let handled = false;
        for (const [field, message] of Object.entries(errors)) {
          if (isFieldName(field)) {
            form.setError(field, {
              message: Array.isArray(message) ? message.join(", ") : message,
            });
            handled = true;
          }
        }
        if (!handled) {
          setServerError((err as Error).message || "Ro'yxatdan o'tishda xatolik yuz berdi");
        }
      } else {
        setServerError((err as Error).message || "Ro'yxatdan o'tishda xatolik yuz berdi");
      }
    }
  }

  return (
    <AuthShell title="Hisob ochish" description="Bir daqiqada hisob oching va birinchi kitobingizni boshlang.">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ism</FormLabel>
                      <FormControl>
                        <Input placeholder="Ism" autoComplete="given-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Foydalanuvchi nomi</FormLabel>
                      <FormControl>
                        <Input placeholder="foydalanuvchi" autoComplete="username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="siz@example.com" autoComplete="email" {...field} />
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
                        placeholder="Kamida 8 belgi"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password_confirm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parolni tasdiqlang</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {serverError && <p className="text-sm text-destructive">{serverError}</p>}
              <Button type="submit" disabled={form.formState.isSubmitting} size="lg" className="mt-1">
                {form.formState.isSubmitting ? "Hisob ochilmoqda..." : "Hisob ochish"}
              </Button>
            </form>
          </Form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Hisobingiz bormi?{" "}
            <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
              Kiring
            </Link>
          </p>
    </AuthShell>
  );
}

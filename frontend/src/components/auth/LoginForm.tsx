"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { loginSchema, type LoginFormValues } from "@/lib/validators/auth.schema";
import { login } from "@/lib/api/auth";
import { useAuthStore } from "@/store/authStore";
import type { Me } from "@/types/user";

interface LoginFormProps {
  /** Muvaffaqiyatli kirgandan keyin (yo'naltirish chaqiruvchining ishi) */
  onSuccess: (me: Me) => void;
  /** "Hisob oching" havolasi bosilganda (oynani yopish uchun) */
  onNavigate?: () => void;
}

/** Kirish formasi — /login sahifasida ham, Bookly uslubidagi oynada ham bir xil. */
export function LoginForm({ onSuccess, onNavigate }: LoginFormProps) {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      const me = await login(values);
      setUser(me);
      queryClient.setQueryData(["me"], me);
      toast.success(`Xush kelibsiz, ${me.first_name || me.username}!`);
      onSuccess(me);
    } catch (err) {
      const errors = (err as { errors?: Record<string, string[] | string> } | undefined)?.errors;
      let handled = false;
      if (errors) {
        for (const [field, message] of Object.entries(errors)) {
          if (field === "login" || field === "password") {
            form.setError(field, { message: Array.isArray(message) ? message.join(", ") : message });
            handled = true;
          }
        }
      }
      if (!handled) setServerError((err as Error).message || "Kirishda xatolik yuz berdi");
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="login"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Foydalanuvchi nomi yoki email</FormLabel>
                <FormControl>
                  <Input type="text" placeholder="masalan: sardor" autoComplete="username" {...field} />
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
                <div className="relative">
                  <FormControl>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="pr-11"
                      {...field}
                    />
                  </FormControl>
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <Button type="submit" disabled={form.formState.isSubmitting} size="lg" className="mt-1 w-full">
            {form.formState.isSubmitting ? "Kirilmoqda..." : "Kirish"}
          </Button>
        </form>
      </Form>
      <div className="mt-5 flex flex-col gap-1.5 text-sm text-muted-foreground">
        <p>Parolni unutdingizmi? Kutubxonachiga ayting — yangisini beradi.</p>
        <p>
          Hisobingiz yo&apos;qmi?{" "}
          <Link
            href="/register"
            onClick={onNavigate}
            className="font-semibold text-primary underline underline-offset-4"
          >
            Hisob oching
          </Link>
        </p>
      </div>
    </>
  );
}

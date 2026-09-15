import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Email kiritilishi shart").email("Email noto'g'ri formatda"),
  password: z.string().min(1, "Parol kiritilishi shart"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    first_name: z.string().min(1, "Ismingizni kiriting"),
    last_name: z.string().min(1, "Familiyangizni kiriting"),
    email: z.string().min(1, "Email kiritilishi shart").email("Email noto'g'ri formatda"),
    password: z.string().min(8, "Parol kamida 8 belgidan iborat bo'lishi kerak"),
    password_confirm: z.string().min(1, "Parolni tasdiqlang"),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: "Parollar mos kelmadi",
    path: ["password_confirm"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

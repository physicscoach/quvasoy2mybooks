"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration uchun standart mount belgisi
  useEffect(() => setMounted(true), []);

  // Hydration mos kelishi uchun mount bo'lgunча joy egallab turadi
  if (!mounted) {
    return <Button variant="ghost" size="icon-sm" aria-label="Mavzu" disabled />;
  }

  const isDark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={isDark ? "Yorug' rejim" : "Tungi rejim"}
      title={isDark ? "Yorug' rejim" : "Tungi rejim"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

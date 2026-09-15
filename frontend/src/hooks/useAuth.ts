"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMe } from "@/lib/api/auth";
import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";

export function useAuth() {
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  const query = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (query.data) setUser(query.data);
    if (query.isError) setUser(null);
  }, [query.data, query.isError, setUser]);

  return {
    user: query.data ?? user,
    isLoading: query.isLoading,
    isAuthenticated: !!query.data,
  };
}

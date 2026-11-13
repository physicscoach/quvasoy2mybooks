"use client";

import { Button } from "@/components/ui/button";
import { useLoginModal } from "@/store/loginModalStore";

/** Server sahifa ichidan kirish oynasini ochadigan tugma */
export function LoginTrigger({
  children,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "onClick">) {
  const setOpen = useLoginModal((s) => s.setOpen);
  return (
    <Button {...props} onClick={() => setOpen(true)}>
      {children}
    </Button>
  );
}

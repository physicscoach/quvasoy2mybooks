import { WifiOff } from "lucide-react";

export const metadata = { title: "Oflayn — Elektron kutubxona" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <span className="flex size-20 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <WifiOff className="size-9" />
      </span>
      <h1 className="text-3xl font-bold">Internet uzildi</h1>
      <p className="max-w-xs text-muted-foreground">
        O&apos;qigan sahifalaringiz yo&apos;qolmaydi. Internet qaytgach sahifani yangilang.
      </p>
    </div>
  );
}

import { BookOpen, Flame, Trophy } from "lucide-react";
import { LogoMark } from "@/components/layout/Logo";

const PROMISES = [
  { icon: BookOpen, text: "Kitob shu yerda ochiladi" },
  { icon: Flame, text: "Har kuni o'qisang — seriya o'sadi" },
  { icon: Trophy, text: "XP yig'ib, reytingda o'zib ket" },
];

interface AuthShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

/** Kirish va ro'yxatdan o'tish sahifalari: g'isht devor fonida markazdagi
 *  oq karta (Bookly'dagi kirish oynasi kabi), ostida uchta va'da. */
export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <div className="gisht flex flex-1 flex-col items-center justify-center gap-8 px-4 py-10 sm:py-14">
      <section className="paydo w-full max-w-[28rem] rounded-md border border-border bg-card p-6 shadow-[0_1rem_2.5rem_rgb(0_0_0/0.1)] sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <LogoMark className="size-11" />
          <h1 className="text-2xl font-semibold tracking-wide uppercase">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {children}
      </section>

      <ul className="grid w-full max-w-3xl gap-3 sm:grid-cols-3">
        {PROMISES.map(({ icon: Icon, text }, i) => (
          <li
            key={text}
            className="paydo flex items-center gap-3 rounded-md bg-card/80 px-4 py-3 text-sm font-medium shadow-sm"
            style={{ "--dl": `${0.15 + i * 0.1}s` } as React.CSSProperties}
          >
            <Icon className="size-6 shrink-0 text-primary" />
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

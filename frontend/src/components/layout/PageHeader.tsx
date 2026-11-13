import { DoskaMagic } from "@/components/magic/DoskaMagic";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  /** O'ng tomondagi qo'shimcha blok (balans, sanoq va h.k.) */
  aside?: React.ReactNode;
  className?: string;
}

/** Ichki sahifalar sarlavhasi — kichik doska. */
export function PageHeader({ title, description, aside, className }: PageHeaderProps) {
  return (
    <div className={cn("doska doska-rom relative overflow-hidden", className)}>
      <DoskaMagic dense={false} />
      <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-9">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl leading-none font-bold sm:text-5xl">{title}</h1>
          {description && <p className="max-w-xl text-base leading-relaxed text-white/80">{description}</p>}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
    </div>
  );
}

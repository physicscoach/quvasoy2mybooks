export const metadata = { title: "Oflayn — Elektron kutubxona" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="text-4xl">📡</div>
      <h1 className="text-xl font-semibold">Internet aloqasi yo&apos;q</h1>
      <p className="text-sm text-muted-foreground">
        Oflayn rejimdasiz. Internet qaytgach sahifani yangilang.
      </p>
    </div>
  );
}

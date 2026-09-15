import { serverApiFetch } from "@/lib/auth/session";
import type { LeaderboardEntry } from "@/types/gamification";
import type { Me } from "@/types/user";

export const metadata = { title: "Reyting jadvali — Elektron kutubxona" };

const MEDAL = ["🥇", "🥈", "🥉"];

async function getData() {
  const board = await serverApiFetch<LeaderboardEntry[]>("/gamification/leaderboard").catch(
    () => [] as LeaderboardEntry[]
  );
  let me: Me | null = null;
  try {
    me = await serverApiFetch<Me>("/auth/me");
  } catch {
    me = null;
  }
  return { board, myUsername: me?.username ?? null };
}

export default async function LeaderboardPage() {
  const { board, myUsername } = await getData();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">Reyting jadvali</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Eng ko&apos;p o&apos;qigan kitobxonlar. XP miqdoriga qarab tartiblangan.
      </p>

      {board.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          Hozircha reyting bo&apos;sh. Kitob o&apos;qib, birinchi bo&apos;ling!
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">O&apos;rin</th>
                <th className="px-4 py-3 text-left font-medium">Kitobxon</th>
                <th className="px-4 py-3 text-left font-medium">Daraja</th>
                <th className="px-4 py-3 text-right font-medium">🔥</th>
                <th className="px-4 py-3 text-right font-medium">XP</th>
              </tr>
            </thead>
            <tbody>
              {board.map((row, i) => {
                const isMe = row.username === myUsername;
                return (
                  <tr
                    key={row.username}
                    className={`border-t border-border ${isMe ? "bg-primary/10 font-semibold" : ""}`}
                  >
                    <td className="px-4 py-3">{MEDAL[i] ?? i + 1}</td>
                    <td className="px-4 py-3">
                      {row.username}
                      {isMe && <span className="ml-2 text-xs text-primary">(siz)</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.level ?? "—"}</td>
                    <td className="px-4 py-3 text-right">{row.current_streak}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.points_lifetime}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

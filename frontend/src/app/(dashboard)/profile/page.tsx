import { redirect } from "next/navigation";
import { Flame, Trophy, Coins, Star } from "lucide-react";
import { serverApiFetch, hasSessionCookie } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ApiError } from "@/types/api";
import type { Me } from "@/types/user";
import { formatNumberUz } from "@/lib/utils";

export const metadata = {
  title: "Profil — Elektron kutubxona",
};

async function getMe(): Promise<Me | null> {
  try {
    return await serverApiFetch<Me>("/me/");
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      return null;
    }
    throw err;
  }
}

export default async function ProfilePage() {
  const hasSession = await hasSessionCookie();
  if (!hasSession) {
    redirect("/login?next=/profile");
  }

  const me = await getMe();
  if (!me) {
    redirect("/login?next=/profile");
  }

  const { stats } = me;
  const initials = (me.first_name?.[0] ?? me.email[0])?.toUpperCase();
  const nextLevelPoints = stats.level.next_level_min_points;
  const progressPercent =
    nextLevelPoints && nextLevelPoints > stats.level.min_points
      ? Math.min(
          100,
          ((stats.points_lifetime - stats.level.min_points) /
            (nextLevelPoints - stats.level.min_points)) *
            100
        )
      : 100;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center gap-4">
        <Avatar size="lg">
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="font-heading text-xl font-semibold text-foreground">
            {me.first_name || me.email} {me.last_name}
          </h1>
          <p className="text-sm text-muted-foreground">{me.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card size="sm">
          <CardContent className="flex flex-col items-center gap-1 py-2 text-center">
            <Coins className="size-5 text-amber-500" />
            <span className="text-lg font-semibold text-foreground">
              {formatNumberUz(stats.points_balance)}
            </span>
            <span className="text-xs text-muted-foreground">Tanga</span>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex flex-col items-center gap-1 py-2 text-center">
            <Star className="size-5 text-primary" />
            <span className="text-lg font-semibold text-foreground">
              {formatNumberUz(stats.points_lifetime)}
            </span>
            <span className="text-xs text-muted-foreground">Jami XP</span>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex flex-col items-center gap-1 py-2 text-center">
            <Trophy className="size-5 text-violet-500" />
            <span className="text-lg font-semibold text-foreground">{stats.level.title}</span>
            <span className="text-xs text-muted-foreground">Daraja</span>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex flex-col items-center gap-1 py-2 text-center">
            <Flame className="size-5 text-orange-500" />
            <span className="text-lg font-semibold text-foreground">{stats.streak_days}</span>
            <span className="text-xs text-muted-foreground">Kunlik seriya</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Darajaga qarab rivojlanish</CardTitle>
          <CardDescription>
            {stats.level.title}
            {nextLevelPoints
              ? ` — keyingi darajaga ${formatNumberUz(Math.max(0, nextLevelPoints - stats.points_lifetime))} XP qoldi`
              : " — eng yuqori daraja"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercent} />
        </CardContent>
      </Card>

      {stats.last_activity_date === null && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Hozircha o&apos;qish faoliyati yo&apos;q. Kitob o&apos;qishni boshlab, birinchi
            ballaringizni qo&apos;lga kiriting.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

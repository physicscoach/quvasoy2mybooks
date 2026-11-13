export interface DailyActivity {
  activity_date: string; // YYYY-MM-DD
  active_seconds: number;
  pages_read: number;
  counts_for_streak: boolean;
}

const WEEKS = 17;
const DAY_LABELS = ["Du", "", "Cho", "", "Ju", "", "Ya"];
const MONTHS = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function level(minutes: number) {
  if (minutes <= 0) return 0;
  if (minutes < 10) return 1;
  if (minutes < 20) return 2;
  return 3; // 20 daqiqa — seriya hisoblanadigan chegara
}

/** Oxirgi 17 haftadagi o'qish taqvimi: har katak bir kun, rang to'qligi — o'qilgan daqiqalar. */
export function ReadingCalendar({ days }: { days: DailyActivity[] }) {
  const byDate = new Map(days.map((d) => [d.activity_date, d]));

  // "Bugun" o'quvchining vaqt zonasida (Toshkent), hisob-kitob esa UTC sanalarda
  const todayIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(new Date());
  const today = new Date(`${todayIso}T00:00:00Z`);
  const weekday = (today.getUTCDay() + 6) % 7; // dushanba = 0
  const start = new Date(today);
  start.setUTCDate(today.getUTCDate() - weekday - (WEEKS - 1) * 7);

  const weeks = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + w * 7 + d);
      const key = iso(date);
      const a = byDate.get(key);
      const minutes = a ? Math.round(a.active_seconds / 60) : 0;
      return { key, date, minutes, pages: a?.pages_read ?? 0, future: date > today };
    })
  );

  const activeDays = weeks.flat().filter((c) => c.minutes > 0).length;
  const totalMinutes = weeks.flat().reduce((sum, c) => sum + c.minutes, 0);

  return (
    <div className="taqvim flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Oxirgi {WEEKS} haftada <span className="font-semibold text-foreground">{activeDays} kun</span> o&apos;qidingiz,
        jami <span className="font-semibold text-foreground">{totalMinutes} daqiqa</span>.
      </p>

      <div className="overflow-x-auto pb-1">
        <div className="inline-flex gap-2">
          <div className="grid grid-rows-7 gap-[3px] pt-5 text-[10px] leading-[14px] text-muted-foreground" aria-hidden="true">
            {DAY_LABELS.map((l, i) => (
              <span key={i} className="h-3.5">
                {l}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px]">
            {weeks.map((week, w) => {
              const first = week[0].date;
              const showMonth = first.getUTCDate() <= 7;
              return (
                <div key={w} className="flex flex-col gap-[3px]">
                  <span className="h-4 text-[10px] leading-4 text-muted-foreground" aria-hidden="true">
                    {showMonth ? MONTHS[first.getUTCMonth()] : ""}
                  </span>
                  {week.map((c) =>
                    c.future ? (
                      <span key={c.key} className="size-3.5" />
                    ) : (
                      <span
                        key={c.key}
                        data-l={level(c.minutes)}
                        className="size-3.5 rounded-[4px] outline-offset-1 hover:outline-2 hover:outline-ring"
                        title={`${c.date.getUTCDate()}-${MONTHS[c.date.getUTCMonth()]}: ${
                          c.minutes > 0 ? `${c.minutes} daqiqa, ${c.pages} bet` : "o'qilmagan"
                        }`}
                      />
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>Kam</span>
        {[0, 1, 2, 3].map((l) => (
          <span key={l} data-l={l} className="size-3.5 rounded-[4px]" />
        ))}
        <span>Ko&apos;p</span>
        <span className="ml-3 flex items-center gap-1.5">
          <span data-l={3} className="size-3.5 rounded-[4px]" />
          20 daqiqa va undan ko&apos;p — seriya kuni
        </span>
      </div>
    </div>
  );
}

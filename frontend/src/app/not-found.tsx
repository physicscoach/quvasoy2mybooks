import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DoskaMagic } from "@/components/magic/DoskaMagic";

export const metadata = { title: "Sahifa topilmadi — Elektron kutubxona" };

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 items-center px-4 py-10">
      <div className="doska doska-rom relative w-full overflow-hidden">
        <DoskaMagic dense={false} />
        <div className="relative flex flex-col items-start gap-5 p-8 sm:p-12">
          <p className="font-heading text-7xl leading-none font-bold text-bor">404</p>
          <h1 className="text-4xl leading-none font-bold">Bu sahifa javonda yo&apos;q</h1>
          <p className="max-w-md text-lg text-white/80">
            Havola eskirgan yoki noto&apos;g&apos;ri yozilgan. Katalogdan kerakli kitobni topishingiz mumkin.
          </p>
          <Button size="lg" variant="sun" render={<Link href="/books" />}>
            Katalogga o&apos;tish
          </Button>
        </div>
      </div>
    </div>
  );
}

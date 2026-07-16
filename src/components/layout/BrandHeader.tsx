import Image from "next/image";
import Link from "next/link";
import type { Role } from "@/types";

const SUBTITLES: Record<Role, string> = {
  rider: "Rider Dashboard",
  driver: "Driver Dashboard",
  owner: "Owner Dashboard",
};

export function BrandHeader({
  role,
  compact = false,
}: {
  role: Role;
  compact?: boolean;
}) {
  const size = compact ? 32 : 44;
  return (
    <Link
      href={`/${role}`}
      className="flex items-center gap-3 transition-opacity hover:opacity-80 sm:gap-4"
    >
      <Image
        src="/logo.png"
        alt="Zypher Logo"
        width={size}
        height={size}
        className="rounded-xl shadow-sm shrink-0"
      />
      <div className="flex flex-col justify-center">
        <span
          className={
            compact
              ? "text-lg font-bold tracking-tight text-black leading-none"
              : "text-2xl font-bold tracking-tight text-black leading-none mb-1"
          }
        >
          Zypher
        </span>
        {!compact && (
          <span className="text-sm font-medium text-neutral-500 leading-none">
            {SUBTITLES[role]}
          </span>
        )}
      </div>
    </Link>
  );
}

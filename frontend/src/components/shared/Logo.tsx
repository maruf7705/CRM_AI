import Link from "next/link";

export const Logo = () => {
  return (
    <Link href="/" className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-sm font-extrabold text-white">
        OD
      </span>
      <span>OmniDesk AI</span>
    </Link>
  );
};

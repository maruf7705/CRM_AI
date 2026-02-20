import type { ReactNode } from "react";
import { Logo } from "@/components/shared/Logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-100 via-indigo-50 to-violet-100 px-4 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      <section className="w-full max-w-md space-y-6 rounded-2xl border bg-background p-8 shadow-lg">
        <div className="flex justify-center">
          <Logo />
        </div>
        {children}
      </section>
    </main>
  );
}

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-b from-slate-100 to-white px-6 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-xl text-center">
        <p className="text-sm font-medium text-indigo-500">404</p>
        <h1 className="mt-2 text-3xl font-bold">Page not found</h1>
        <p className="mt-3 text-muted-foreground">
          The page you requested does not exist or may have been moved.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className={buttonVariants({ className: "inline-flex" })}>
            Back to home
          </Link>
          <Link href="/dashboard" className={buttonVariants({ variant: "outline", className: "inline-flex" })}>
            Open dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

import Image from "next/image";
import { Button } from "@/components/ui/button";

export const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white px-6 py-20 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="mb-4 inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200">
            Trusted by 500+ businesses worldwide
          </p>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            All Your Conversations. One AI-Powered Inbox.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Connect Facebook, Instagram, and WhatsApp in one collaborative workspace with AI-assisted replies.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg">Start Free Trial</Button>
            <Button size="lg" variant="outline">
              Watch Demo ▶
            </Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border bg-card shadow-xl ring-1 ring-indigo-100 dark:ring-indigo-900/40">
          <Image
            src="/images/hero-dashboard.png"
            alt="OmniDesk AI dashboard preview"
            width={960}
            height={640}
            className="h-auto w-full"
            priority
          />
        </div>
      </div>
    </section>
  );
};

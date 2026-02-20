import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const CTASection = () => {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-4xl rounded-2xl border bg-gradient-to-r from-indigo-500 to-violet-500 p-10 text-center text-white">
        <h2 className="text-3xl font-semibold">Ready to transform your customer conversations?</h2>
        <p className="mt-3 text-indigo-100">Start with the free tier and scale as your team grows.</p>
        <Link
          href="/register"
          className={buttonVariants({ className: "mt-6 inline-flex bg-white text-indigo-700 hover:bg-indigo-50" })}
        >
          Start Free Trial
        </Link>
      </div>
    </section>
  );
};

"use client";

import { motion } from "framer-motion";

const messages = [
  { role: "CONTACT", text: "Do you have annual pricing?", tone: "left" },
  { role: "AI", text: "Yes. Annual plans include a 20% discount and priority onboarding.", tone: "right-ai" },
  { role: "AGENT", text: "I can also share a custom quote for your team size.", tone: "right-agent" },
] as const;

export const AiSpotlight = () => {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto grid max-w-6xl gap-8 rounded-2xl border bg-gradient-to-r from-indigo-500/10 via-background to-violet-500/10 p-8 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
            AI Spotlight
          </p>
          <h2 className="mt-2 text-3xl font-semibold">Watch AI assist your team in real-time</h2>
          <p className="mt-3 text-muted-foreground">
            Suggestions appear instantly, agents can edit before sending, and every action is tracked for quality.
          </p>
        </div>
        <div className="space-y-3">
          {messages.map((message, index) => (
            <motion.div
              key={`${message.role}-${index}`}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: index * 0.12, duration: 0.28 }}
              className={
                message.tone === "left"
                  ? "mr-8 rounded-xl bg-muted p-3 text-sm"
                  : message.tone === "right-ai"
                    ? "ml-8 rounded-xl bg-violet-500 p-3 text-sm text-white"
                    : "ml-8 rounded-xl bg-indigo-500 p-3 text-sm text-white"
              }
            >
              <p className="mb-1 text-xs font-semibold opacity-80">{message.role}</p>
              <p>{message.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

import { Bot, Inbox, LineChart, MessageSquare, Users, Zap } from "lucide-react";

const items = [
  { icon: Inbox, title: "Unified Inbox", description: "Handle all channels from one shared inbox." },
  { icon: Bot, title: "AI Auto-Reply", description: "Generate or send GPT-powered responses." },
  { icon: MessageSquare, title: "Omnichannel", description: "Facebook, Instagram, WhatsApp, and more." },
  { icon: LineChart, title: "Analytics", description: "Track response time and conversion trends." },
  { icon: Users, title: "Team Collaboration", description: "Assign conversations and coordinate agents." },
  { icon: Zap, title: "Quick Setup", description: "Connect channels and go live in minutes." },
];

export const Features = () => {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="text-center text-3xl font-semibold">Everything you need to run support at scale</h2>
      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="rounded-xl border bg-card p-6">
              <Icon className="h-6 w-6 text-indigo-500" />
              <h3 className="mt-4 font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
};

const testimonials = [
  {
    quote: "OmniDesk cut our first-response time by 60 percent in two weeks.",
    author: "Lina Torres",
    role: "Support Lead, Nimbus Co",
  },
  {
    quote: "The AI suggestions are accurate and save our team hours every day.",
    author: "Marcus Lee",
    role: "Operations Manager, Threadly",
  },
  {
    quote: "We unified social messaging and finally have clean analytics.",
    author: "Priya Shah",
    role: "Founder, BloomCart",
  },
];

export const Testimonials = () => {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="text-center text-3xl font-semibold">What customers say</h2>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {testimonials.map((item) => (
          <article key={item.author} className="rounded-xl border bg-card p-6">
            <p className="text-sm">"{item.quote}"</p>
            <p className="mt-4 text-sm font-semibold">{item.author}</p>
            <p className="text-xs text-muted-foreground">{item.role}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

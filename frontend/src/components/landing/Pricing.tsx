const plans = [
  { name: "Free", price: "$0", details: "2 channels, 100 AI replies/mo" },
  { name: "Starter", price: "$29", details: "5 channels, 1K AI replies" },
  { name: "Pro", price: "$79", details: "Unlimited channels, 10K AI replies" },
  { name: "Enterprise", price: "Custom", details: "Custom limits and SLA" },
];

export const Pricing = () => {
  return (
    <section id="pricing" className="bg-muted/40 px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-semibold">Simple pricing</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <article key={plan.name} className="rounded-xl border bg-card p-6">
              <h3 className="font-semibold">{plan.name}</h3>
              <p className="mt-2 text-3xl font-bold">{plan.price}</p>
              <p className="mt-2 text-sm text-muted-foreground">{plan.details}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

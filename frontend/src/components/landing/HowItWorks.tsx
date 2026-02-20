const steps = [
  {
    title: "Connect your channels",
    description: "Integrate Facebook, Instagram, and WhatsApp from one dashboard.",
  },
  {
    title: "Train your AI assistant",
    description: "Add prompts and knowledge docs to guide every response.",
  },
  {
    title: "Respond faster as a team",
    description: "Assign, automate, and resolve conversations in real time.",
  },
];

export const HowItWorks = () => {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="text-center text-3xl font-semibold">How it works</h2>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {steps.map((step, index) => (
          <article key={step.title} className="rounded-xl border bg-card p-6">
            <p className="text-sm font-semibold text-indigo-500">Step {index + 1}</p>
            <h3 className="mt-2 font-semibold">{step.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

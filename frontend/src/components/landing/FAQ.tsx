import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Can I connect multiple channels?",
    a: "Yes. You can connect Facebook, Instagram, WhatsApp, and web chat in one inbox.",
  },
  {
    q: "Does AI auto-reply by default?",
    a: "You can choose OFF, SUGGESTION, or AUTO_REPLY globally and per conversation.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. The Free plan includes 2 channels and 100 AI replies per month.",
  },
  {
    q: "Can my team collaborate?",
    a: "Yes. Assign conversations, track workload, and monitor response quality.",
  },
  {
    q: "Where is data stored?",
    a: "Data is stored in Supabase PostgreSQL with role-based access and secure keys.",
  },
  {
    q: "Can I deploy without Docker?",
    a: "Yes. Run frontend and backend with npm scripts and deploy to Vercel/Railway.",
  },
];

export const FAQ = () => {
  return (
    <section id="faq" className="bg-muted/40 px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-3xl font-semibold">Frequently asked questions</h2>
        <Accordion className="mt-8 space-y-3" defaultValue={faqs[0]!.q}>
          {faqs.map((faq) => (
            <AccordionItem key={faq.q} value={faq.q}>
              <AccordionTrigger>{faq.q}</AccordionTrigger>
              <AccordionContent>{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

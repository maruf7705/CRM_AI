import type { Metadata } from "next";
import { AiSpotlight } from "@/components/landing/AiSpotlight";
import { CTASection } from "@/components/landing/CTASection";
import { FAQ } from "@/components/landing/FAQ";
import { Features } from "@/components/landing/Features";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Navbar } from "@/components/landing/Navbar";
import { Pricing } from "@/components/landing/Pricing";
import { SocialProof } from "@/components/landing/SocialProof";
import { Testimonials } from "@/components/landing/Testimonials";

export const metadata: Metadata = {
  title: "All Your Conversations. One AI-Powered Inbox.",
  description:
    "Connect Facebook, Instagram, WhatsApp, and web chat. Let AI assist your team and track every conversation in one place.",
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <SocialProof />
      <Features />
      <HowItWorks />
      <AiSpotlight />
      <Pricing />
      <Testimonials />
      <FAQ />
      <CTASection />
      <Footer />
    </main>
  );
}

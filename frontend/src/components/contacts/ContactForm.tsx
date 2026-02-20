"use client";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ContactStage } from "@/types";

export interface ContactFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  stage: ContactStage;
  leadScore: number;
  company: string;
  jobTitle: string;
  notes: string;
}

interface ContactFormProps {
  defaultValues?: Partial<ContactFormValues>;
  submitLabel?: string;
  isSubmitting?: boolean;
  onSubmit: (data: ContactFormValues) => void;
}

const STAGES: ContactStage[] = ["NEW", "LEAD", "QUALIFIED", "CUSTOMER", "CHURNED"];

export const ContactForm = ({
  defaultValues,
  submitLabel = "Save contact",
  isSubmitting = false,
  onSubmit,
}: ContactFormProps) => {
  const form = useForm<ContactFormValues>({
    defaultValues: {
      firstName: defaultValues?.firstName ?? "",
      lastName: defaultValues?.lastName ?? "",
      email: defaultValues?.email ?? "",
      phone: defaultValues?.phone ?? "",
      stage: defaultValues?.stage ?? "NEW",
      leadScore: defaultValues?.leadScore ?? 0,
      company: defaultValues?.company ?? "",
      jobTitle: defaultValues?.jobTitle ?? "",
      notes: defaultValues?.notes ?? "",
    },
  });

  return (
    <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="First name" {...form.register("firstName")} />
        <Input placeholder="Last name" {...form.register("lastName")} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="Email" type="email" {...form.register("email")} />
        <Input placeholder="Phone" {...form.register("phone")} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm"
          {...form.register("stage")}
        >
          {STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {stage}
            </option>
          ))}
        </select>
        <Input
          type="number"
          min={0}
          max={100}
          placeholder="Lead score"
          {...form.register("leadScore", { valueAsNumber: true })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="Company" {...form.register("company")} />
        <Input placeholder="Job title" {...form.register("jobTitle")} />
      </div>

      <Textarea placeholder="Notes" rows={4} {...form.register("notes")} />

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
};

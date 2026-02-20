"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { ContactForm, type ContactFormValues } from "@/components/contacts/ContactForm";
import { ContactTable } from "@/components/contacts/ContactTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  useContacts,
  useCreateContact,
  useDeleteContact,
  useUpdateContact,
  type ContactPayload,
} from "@/hooks/useContacts";
import { useDebounce } from "@/hooks/useDebounce";
import type { Contact, ContactStage } from "@/types";

const STAGES: Array<ContactStage | ""> = ["", "NEW", "LEAD", "QUALIFIED", "CUSTOMER", "CHURNED"];

const toNullableString = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toContactPayload = (values: ContactFormValues): ContactPayload => ({
  firstName: toNullableString(values.firstName),
  lastName: toNullableString(values.lastName),
  email: toNullableString(values.email),
  phone: toNullableString(values.phone),
  stage: values.stage,
  leadScore: Math.max(0, Math.min(100, Number.isFinite(values.leadScore) ? values.leadScore : 0)),
  company: toNullableString(values.company),
  jobTitle: toNullableString(values.jobTitle),
  notes: toNullableString(values.notes),
});

export default function ContactsPage() {
  const router = useRouter();
  const { organizationId } = useAuth();
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<ContactStage | "">("");
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const filters = useMemo(
    () => ({
      page: 1,
      limit: 25,
      sort: "-updatedAt" as const,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(stage ? { stage } : {}),
    }),
    [debouncedSearch, stage],
  );

  const contactsQuery = useContacts(organizationId ?? undefined, filters);
  const createContact = useCreateContact(organizationId ?? undefined);
  const updateContact = useUpdateContact(organizationId ?? undefined, editingContact?.id);
  const deleteContact = useDeleteContact(organizationId ?? undefined);

  const isSaving = createContact.isPending || updateContact.isPending;

  const handleCreate = async (values: ContactFormValues) => {
    await createContact.mutateAsync(toContactPayload(values));
    setShowCreateForm(false);
  };

  const handleUpdate = async (values: ContactFormValues) => {
    if (!editingContact) {
      return;
    }

    await updateContact.mutateAsync(toContactPayload(values));
    setEditingContact(null);
  };

  const handleDelete = async (contact: Contact) => {
    const confirmed = window.confirm(`Delete ${contact.displayName}? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(contact.id);
      await deleteContact.mutateAsync(contact.id);
    } finally {
      setDeletingId(null);
    }
  };

  const contacts = contactsQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        description="View and manage customer profiles, stages, and metadata."
        actions={
          <Button
            onClick={() => {
              setEditingContact(null);
              setShowCreateForm((current) => !current);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Contact
          </Button>
        }
      />

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_220px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email, phone, or company" />
          <select
            value={stage}
            onChange={(event) => setStage(event.target.value as ContactStage | "")}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            {STAGES.map((stageOption) => (
              <option key={stageOption || "ALL"} value={stageOption}>
                {stageOption || "All stages"}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {showCreateForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Create Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <ContactForm onSubmit={handleCreate} isSubmitting={isSaving} submitLabel="Create contact" />
          </CardContent>
        </Card>
      ) : null}

      {editingContact ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Contact</CardTitle>
          </CardHeader>
          <CardContent>
              <ContactForm
                defaultValues={{
                  firstName: editingContact.firstName ?? "",
                  lastName: editingContact.lastName ?? "",
                  email: editingContact.email ?? "",
                  phone: editingContact.phone ?? "",
                  stage: editingContact.stage,
                  leadScore: editingContact.leadScore,
                  company: editingContact.company ?? "",
                  jobTitle: editingContact.jobTitle ?? "",
                  notes: editingContact.notes ?? "",
                }}
              onSubmit={handleUpdate}
              isSubmitting={isSaving}
              submitLabel="Save changes"
            />
            <Button className="mt-3" variant="ghost" onClick={() => setEditingContact(null)}>
              Cancel
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-4">
          {contactsQuery.isLoading ? (
            <div className="space-y-2 py-2">
              {[0, 1, 2, 3, 4].map((index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : null}

          {contactsQuery.isError ? (
            <EmptyState title="Unable to load contacts" description="Please refresh and try again." />
          ) : null}

          {!contactsQuery.isLoading && !contactsQuery.isError && contacts.length === 0 ? (
            <EmptyState
              title="No contacts found"
              description="Create your first contact to start organizing conversations."
              illustrationSrc="/images/empty-states/no-contacts.svg"
              illustrationAlt="No contacts illustration"
              actionLabel="Create contact"
              onAction={() => setShowCreateForm(true)}
            />
          ) : null}

          {!contactsQuery.isLoading && !contactsQuery.isError && contacts.length > 0 ? (
            <>
              <ContactTable
                contacts={contacts}
                onView={(contact) => router.push(`/contacts/${contact.id}`)}
                onEdit={(contact) => {
                  setShowCreateForm(false);
                  setEditingContact(contact);
                }}
                onDelete={handleDelete}
                deletingId={deletingId}
              />
              <p className="mt-3 text-xs text-muted-foreground">
                Showing {contacts.length} of {contactsQuery.data?.meta.total ?? contacts.length} contacts
              </p>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

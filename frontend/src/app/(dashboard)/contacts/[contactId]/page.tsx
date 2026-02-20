"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ContactCard } from "@/components/contacts/ContactCard";
import { TagManager } from "@/components/contacts/TagManager";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  useAddContactTags,
  useContact,
  useContactConversations,
  useRemoveContactTag,
  useTags,
} from "@/hooks/useContacts";

interface ContactRoutePageProps {
  params: {
    contactId: string;
  };
}

export default function ContactRoutePage({ params }: ContactRoutePageProps) {
  const router = useRouter();
  const { organizationId } = useAuth();

  const contactQuery = useContact(organizationId ?? undefined, params.contactId);
  const conversationsQuery = useContactConversations(organizationId ?? undefined, params.contactId, {
    page: 1,
    limit: 15,
  });
  const tagsQuery = useTags(organizationId ?? undefined);

  const addTagMutation = useAddContactTags(organizationId ?? undefined);
  const removeTagMutation = useRemoveContactTag(organizationId ?? undefined);

  const contact = contactQuery.data;
  const conversations = conversationsQuery.data?.data ?? [];
  const availableTags = tagsQuery.data ?? [];

  const isTagBusy = addTagMutation.isPending || removeTagMutation.isPending;

  const metadata = useMemo(() => {
    if (!contact) {
      return [] as Array<{ label: string; value: string }>;
    }

    return [
      { label: "Email", value: contact.email ?? "-" },
      { label: "Phone", value: contact.phone ?? "-" },
      { label: "Company", value: contact.company ?? "-" },
      { label: "Job Title", value: contact.jobTitle ?? "-" },
      { label: "Lead Score", value: String(contact.leadScore) },
      { label: "Stage", value: contact.stage },
      { label: "Conversations", value: String(contact.conversationCount) },
    ];
  }, [contact]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={contact ? contact.displayName : `Contact ${params.contactId}`}
        description="Contact detail, tags, and conversation history."
        actions={
          <Button variant="outline" onClick={() => router.push("/contacts")}>
            Back to Contacts
          </Button>
        }
      />

      {contactQuery.isLoading ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-6 w-2/5" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ) : null}

      {contactQuery.isError ? (
        <EmptyState title="Contact not found" description="The selected contact could not be loaded." />
      ) : null}

      {contact ? (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-6">
            <ContactCard contact={contact} />

            <Card>
              <CardHeader>
                <CardTitle>Contact Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {metadata.map((item) => (
                  <div key={item.label} className="flex items-center justify-between border-b py-1 last:border-0">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
                {contact.notes ? (
                  <div className="pt-2">
                    <p className="text-muted-foreground">Notes</p>
                    <p className="mt-1">{contact.notes}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <TagManager
                  value={contact.tags}
                  availableTags={availableTags}
                  disabled={isTagBusy}
                  onAddTag={(tagId) =>
                    addTagMutation.mutate({
                      contactId: params.contactId,
                      tagIds: [tagId],
                    })
                  }
                  onRemoveTag={(tagId) =>
                    removeTagMutation.mutate({
                      contactId: params.contactId,
                      tagId,
                    })
                  }
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Conversation History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {conversationsQuery.isLoading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">Loading conversations...</div>
              ) : null}

              {!conversationsQuery.isLoading && conversations.length === 0 ? (
                <EmptyState
                  title="No conversations"
                  description="This contact has no conversation history yet."
                  illustrationSrc="/images/empty-states/no-conversations.svg"
                  illustrationAlt="No conversations illustration"
                />
              ) : null}

              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => router.push(`/inbox/${conversation.id}`)}
                  className="w-full rounded-lg border p-3 text-left hover:bg-muted/40"
                >
                  <p className="text-sm font-medium">
                    {conversation.channel.type} | {conversation.status}
                  </p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {conversation.lastMessagePreview ?? "No preview available"}
                  </p>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}


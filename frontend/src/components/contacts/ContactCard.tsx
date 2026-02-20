import type { Contact } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const ContactCard = ({ contact }: { contact: Contact }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{contact.displayName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm text-muted-foreground">
        <p>{contact.email ?? "No email"}</p>
        <p>{contact.phone ?? "No phone"}</p>
        <p>Stage: {contact.stage}</p>
        <p>Score: {contact.leadScore}</p>
      </CardContent>
    </Card>
  );
};

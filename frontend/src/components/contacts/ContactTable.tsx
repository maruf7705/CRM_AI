import type { Contact } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ContactTableProps {
  contacts: Contact[];
  onView?: (contact: Contact) => void;
  onEdit?: (contact: Contact) => void;
  onDelete?: (contact: Contact) => void;
  deletingId?: string | null;
}

export const ContactTable = ({ contacts, onView, onEdit, onDelete, deletingId }: ContactTableProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Stage</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Tags</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contacts.map((contact) => (
          <TableRow key={contact.id}>
            <TableCell className="font-medium">{contact.displayName}</TableCell>
            <TableCell>{contact.stage}</TableCell>
            <TableCell>{contact.leadScore}</TableCell>
            <TableCell>{contact.email ?? "-"}</TableCell>
            <TableCell>{contact.phone ?? "-"}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {contact.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="text-xs">
                    {tag.name}
                  </Badge>
                ))}
                {contact.tags.length > 2 ? <Badge variant="outline">+{contact.tags.length - 2}</Badge> : null}
              </div>
            </TableCell>
            <TableCell className="space-x-2 text-right">
              {onView ? (
                <Button variant="outline" size="sm" onClick={() => onView(contact)}>
                  View
                </Button>
              ) : null}
              {onEdit ? (
                <Button variant="outline" size="sm" onClick={() => onEdit(contact)}>
                  Edit
                </Button>
              ) : null}
              {onDelete ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(contact)}
                  disabled={deletingId === contact.id}
                >
                  {deletingId === contact.id ? "Deleting..." : "Delete"}
                </Button>
              ) : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

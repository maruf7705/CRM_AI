import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface ContactPanelProps {
  name: string;
  avatar?: string | undefined;
  stage?: string | undefined;
  score?: number | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  company?: string | undefined;
  jobTitle?: string | undefined;
  notes?: string | undefined;
  tags?: Array<{ id: string; name: string; color: string }> | undefined;
  conversationCount?: number | undefined;
}

export const ContactPanel = ({
  name,
  avatar,
  stage,
  score,
  email,
  phone,
  company,
  jobTitle,
  notes,
  tags,
  conversationCount,
}: ContactPanelProps) => {
  return (
    <aside className="h-full space-y-4 border-l p-4">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10" {...(avatar ? { src: avatar, alt: name } : {})}>
          <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold">{name}</h3>
          <p className="text-xs text-muted-foreground">{company ?? "No company"}</p>
        </div>
      </div>

      <div className="grid gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Stage</span>
          <span>{stage ?? "-"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Score</span>
          <span>{typeof score === "number" ? score : "-"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Conversations</span>
          <span>{typeof conversationCount === "number" ? conversationCount : "-"}</span>
        </div>
      </div>

      <div className="space-y-1 text-sm">
        <p className="text-muted-foreground">Email</p>
        <p>{email ?? "No email"}</p>
      </div>

      <div className="space-y-1 text-sm">
        <p className="text-muted-foreground">Phone</p>
        <p>{phone ?? "No phone"}</p>
      </div>

      <div className="space-y-1 text-sm">
        <p className="text-muted-foreground">Job</p>
        <p>{jobTitle ?? "No title"}</p>
      </div>

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Tags</p>
        <div className="flex flex-wrap gap-1">
          {tags && tags.length > 0
            ? tags.map((tag) => (
                <Badge key={tag.id} variant="secondary" style={{ borderColor: tag.color }}>
                  {tag.name}
                </Badge>
              ))
            : <span className="text-xs text-muted-foreground">No tags</span>}
        </div>
      </div>

      <div className="space-y-1 text-sm">
        <p className="text-muted-foreground">Notes</p>
        <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-2 text-xs">
          {notes ?? "No notes yet."}
        </p>
      </div>
    </aside>
  );
};

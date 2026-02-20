"use client";

import { useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  useInviteMember,
  useRemoveMember,
  useTeam,
  useUpdateMember,
  type MemberRole,
  type TeamMember,
} from "@/hooks/useTeam";
import { useAuth } from "@/hooks/useAuth";

const roleOptions: MemberRole[] = ["OWNER", "ADMIN", "AGENT", "VIEWER"];

const getErrorMessage = (error: unknown): string => {
  if (isAxiosError(error)) {
    const message = error.response?.data?.error?.message;
    if (typeof message === "string") {
      return message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Request failed";
};

const memberName = (member: TeamMember): string => `${member.user.firstName} ${member.user.lastName}`.trim();

export default function TeamPage() {
  const { organizationId, role } = useAuth();
  const canManage = role === "OWNER" || role === "ADMIN";

  const teamQuery = useTeam(organizationId ?? undefined);
  const inviteMutation = useInviteMember(organizationId ?? undefined);
  const updateMutation = useUpdateMember(organizationId ?? undefined);
  const removeMutation = useRemoveMember(organizationId ?? undefined);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("AGENT");

  const teamMembers = teamQuery.data ?? [];
  const sortedMembers = useMemo(
    () => [...teamMembers].sort((a, b) => memberName(a).localeCompare(memberName(b))),
    [teamMembers],
  );

  const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!organizationId) {
      toast.error("No active organization found");
      return;
    }

    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    try {
      const payload: {
        email: string;
        role: MemberRole;
        firstName?: string;
        lastName?: string;
      } = {
        email: email.trim(),
        role: inviteRole,
      };

      const cleanedFirstName = firstName.trim();
      if (cleanedFirstName) {
        payload.firstName = cleanedFirstName;
      }

      const cleanedLastName = lastName.trim();
      if (cleanedLastName) {
        payload.lastName = cleanedLastName;
      }

      await inviteMutation.mutateAsync(payload);

      toast.success("Member invited");
      setEmail("");
      setFirstName("");
      setLastName("");
      setInviteRole("AGENT");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleRoleChange = async (memberId: string, newRole: MemberRole) => {
    try {
      await updateMutation.mutateAsync({
        memberId,
        payload: { role: newRole },
      });
      toast.success("Member role updated");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      await removeMutation.mutateAsync(memberId);
      toast.success("Member removed");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (!organizationId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Team" description="Invite and manage workspace members and roles." />
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">No active organization is selected.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Team" description="Invite members and manage organization roles." />

      {!canManage ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            You do not have permission to manage team members. Contact an admin or owner.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Invite Member</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-5" onSubmit={handleInvite}>
              <Input
                className="md:col-span-2"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Input
                placeholder="First name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
              <Input
                placeholder="Last name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
              <div className="flex gap-2">
                <Select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as MemberRole)}>
                  {roleOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
                <Button type="submit" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending ? "Inviting..." : "Invite"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          {teamQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading members...</p> : null}
          {teamQuery.isError ? (
            <p className="text-sm text-destructive">{getErrorMessage(teamQuery.error)}</p>
          ) : null}

          {!teamQuery.isLoading && !teamQuery.isError ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Member</th>
                    <th className="py-2 pr-4 font-medium">Email</th>
                    <th className="py-2 pr-4 font-medium">Role</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMembers.map((member) => {
                    const isCurrentOwner = member.role === "OWNER";
                    const canEditRole = canManage && !(role !== "OWNER" && isCurrentOwner);
                    const canRemove = canManage && !isCurrentOwner;

                    return (
                      <tr key={member.id} className="border-b">
                        <td className="py-3 pr-4">
                          <div className="font-medium">{memberName(member)}</div>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">{member.user.email}</td>
                        <td className="py-3 pr-4">
                          {canEditRole ? (
                            <Select
                              value={member.role}
                              onChange={(event) =>
                                void handleRoleChange(member.id, event.target.value as MemberRole)
                              }
                              disabled={updateMutation.isPending}
                            >
                              {roleOptions
                                .filter((option) => role === "OWNER" || option !== "OWNER")
                                .map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                            </Select>
                          ) : (
                            <span>{member.role}</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={member.isOnline ? "text-emerald-600" : "text-muted-foreground"}>
                            {member.isOnline ? "Online" : "Offline"}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {canRemove ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void handleRemove(member.id)}
                              disabled={removeMutation.isPending}
                            >
                              Remove
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Protected</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

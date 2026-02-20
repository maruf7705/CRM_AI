"use client";

import { useEffect } from "react";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization, useUpdateOrganization, type UpdateOrganizationInput } from "@/hooks/useOrganization";

interface OrgSettingsForm {
  name: string;
  logo: string;
  maxAgents: number;
  maxChannels: number;
  aiMode: "OFF" | "SUGGESTION" | "AUTO_REPLY";
  aiEnabled: "true" | "false";
}

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

export default function SettingsPage() {
  const { organizationId, role } = useAuth();
  const canEdit = role === "OWNER" || role === "ADMIN";
  const isOwner = role === "OWNER";

  const organizationQuery = useOrganization(organizationId ?? undefined);
  const updateOrganization = useUpdateOrganization(organizationId ?? undefined);

  const form = useForm<OrgSettingsForm>({
    defaultValues: {
      name: "",
      logo: "",
      maxAgents: 3,
      maxChannels: 2,
      aiMode: "SUGGESTION",
      aiEnabled: "true",
    },
  });

  useEffect(() => {
    if (!organizationQuery.data) {
      return;
    }

    form.reset({
      name: organizationQuery.data.name,
      logo: organizationQuery.data.logo ?? "",
      maxAgents: organizationQuery.data.maxAgents,
      maxChannels: organizationQuery.data.maxChannels,
      aiMode: organizationQuery.data.aiMode,
      aiEnabled: organizationQuery.data.aiEnabled ? "true" : "false",
    });
  }, [form, organizationQuery.data]);

  const onSubmit = async (values: OrgSettingsForm) => {
    if (!canEdit) {
      toast.error("You do not have permission to update organization settings");
      return;
    }

    const payload: UpdateOrganizationInput = {
      name: values.name,
      logo: values.logo.trim() ? values.logo.trim() : null,
      maxAgents: Number(values.maxAgents),
      maxChannels: Number(values.maxChannels),
      aiMode: values.aiMode,
      aiEnabled: values.aiEnabled === "true",
    };

    try {
      await updateOrganization.mutateAsync(payload);
      toast.success("Organization settings updated");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (!organizationId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" description="General workspace and account settings." />
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">No active organization is selected.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage organization-level settings and limits." />

      {!canEdit ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            You can view organization details, but only admins and owners can update settings.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent>
          {organizationQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading settings...</p> : null}
          {organizationQuery.isError ? (
            <p className="text-sm text-destructive">{getErrorMessage(organizationQuery.error)}</p>
          ) : null}

          {!organizationQuery.isLoading && !organizationQuery.isError ? (
            <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Organization name</label>
                <Input {...form.register("name")} disabled={!canEdit || updateOrganization.isPending} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Logo URL</label>
                <Input {...form.register("logo")} disabled={!canEdit || updateOrganization.isPending} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Max agents</label>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  {...form.register("maxAgents", { valueAsNumber: true })}
                  disabled={!canEdit || updateOrganization.isPending}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Max channels</label>
                <Input
                  type="number"
                  min={1}
                  max={200}
                  {...form.register("maxChannels", { valueAsNumber: true })}
                  disabled={!canEdit || updateOrganization.isPending}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">AI enabled</label>
                <Select {...form.register("aiEnabled")} disabled={!canEdit || updateOrganization.isPending}>
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">AI mode</label>
                <Select {...form.register("aiMode")} disabled={!canEdit || updateOrganization.isPending}>
                  <option value="OFF">Off</option>
                  <option value="SUGGESTION">Suggestion</option>
                  <option value="AUTO_REPLY">Auto Reply</option>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Button type="submit" disabled={!canEdit || updateOrganization.isPending}>
                  {updateOrganization.isPending ? "Saving..." : "Save settings"}
                </Button>
              </div>
            </form>
          ) : null}
        </CardContent>
      </Card>

      {isOwner ? (
        <Card>
          <CardHeader>
            <CardTitle>Owner Controls</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Plan and billing ownership controls are reserved for owner accounts.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

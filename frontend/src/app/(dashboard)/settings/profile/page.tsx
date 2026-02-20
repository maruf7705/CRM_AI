"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import {
  changePasswordSchema,
  updateProfileSchema,
  type ChangePasswordInput,
  type UpdateProfileInput,
} from "@/lib/validators";

const getErrorMessage = (error: unknown): string => {
  if (isAxiosError(error)) {
    const message = error.response?.data?.error?.message;
    if (typeof message === "string") {
      return message;
    }
  }

  return "Something went wrong. Please try again.";
};

export default function ProfileSettingsPage() {
  const { user, fetchMe, updateProfile, changePassword, uploadAvatar } = useAuth();
  const [avatarUploading, setAvatarUploading] = useState(false);

  const profileForm = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
    },
  });

  const passwordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
    },
  });

  useEffect(() => {
    const load = async () => {
      try {
        if (!user) {
          await fetchMe();
        }
      } catch {
        return;
      }
    };

    void load();
  }, [fetchMe, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    profileForm.reset({
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? "",
    });
  }, [profileForm, user]);

  const onProfileSubmit = async (values: UpdateProfileInput) => {
    try {
      await updateProfile({
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone ?? null,
      });
      toast.success("Profile updated");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const onPasswordSubmit = async (values: ChangePasswordInput) => {
    try {
      await changePassword(values);
      toast.success("Password changed. Please sign in again.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setAvatarUploading(true);
    try {
      await uploadAvatar(file);
      toast.success("Avatar updated");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Profile Settings" description="Update your account details and password." />

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">First name</label>
                <Input {...profileForm.register("firstName")} />
                {profileForm.formState.errors.firstName ? (
                  <p className="text-xs text-destructive">{profileForm.formState.errors.firstName.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Last name</label>
                <Input {...profileForm.register("lastName")} />
                {profileForm.formState.errors.lastName ? (
                  <p className="text-xs text-destructive">{profileForm.formState.errors.lastName.message}</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <Input {...profileForm.register("phone")} />
              {profileForm.formState.errors.phone ? (
                <p className="text-xs text-destructive">{profileForm.formState.errors.phone.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Avatar</label>
              <Input type="file" accept="image/*" onChange={handleAvatarChange} disabled={avatarUploading} />
            </div>

            <Button type="submit" disabled={profileForm.formState.isSubmitting}>
              {profileForm.formState.isSubmitting ? "Saving..." : "Save profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
            <div className="space-y-2">
              <label className="text-sm font-medium">Current password</label>
              <Input type="password" autoComplete="current-password" {...passwordForm.register("currentPassword")} />
              {passwordForm.formState.errors.currentPassword ? (
                <p className="text-xs text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New password</label>
              <Input type="password" autoComplete="new-password" {...passwordForm.register("newPassword")} />
              {passwordForm.formState.errors.newPassword ? (
                <p className="text-xs text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
              ) : null}
            </div>
            <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
              {passwordForm.formState.isSubmitting ? "Updating..." : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

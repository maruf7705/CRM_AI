"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

const getErrorMessage = (error: unknown): string => {
  if (isAxiosError(error)) {
    const message = error.response?.data?.error?.message;
    if (typeof message === "string") {
      return message;
    }
  }

  return "Unable to verify email right now.";
};

export default function VerifyEmailPage() {
  const { verifyEmail, resendVerification } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token"));
    setEmail(params.get("email") ?? "");
  }, []);

  useEffect(() => {
    if (!token || isVerified) {
      return;
    }

    const run = async () => {
      setIsVerifying(true);
      try {
        await verifyEmail({ token });
        setIsVerified(true);
        toast.success("Email verified successfully");
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setIsVerifying(false);
      }
    };

    void run();
  }, [isVerified, token, verifyEmail]);

  const handleResend = async () => {
    if (!email) {
      toast.error("Enter your email to resend verification");
      return;
    }

    setIsResending(true);
    try {
      await resendVerification({ email });
      toast.success("If your account is unverified, a new email was sent");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Verify your email</h1>
        <p className="text-sm text-muted-foreground">
          Confirm your email to activate all account features.
        </p>
      </div>

      {isVerifying ? <p className="text-sm text-muted-foreground">Verifying your email...</p> : null}
      {isVerified ? (
        <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          Your email is verified. You can now sign in.
        </p>
      ) : null}

      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
        />
      </div>

      <Button type="button" variant="outline" className="w-full" onClick={handleResend} disabled={isResending}>
        {isResending ? "Sending..." : "Resend verification email"}
      </Button>

      <Link href="/login" className="text-sm text-indigo-600 hover:underline">
        Back to login
      </Link>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AiTestResult } from "@/hooks/useAiSettings";

interface AiTestChatProps {
  isTesting?: boolean;
  onTest: (message: string) => Promise<AiTestResult>;
}

export const AiTestChat = ({ isTesting = false, onTest }: AiTestChatProps) => {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<AiTestResult | null>(null);
  const [error, setError] = useState<string>("");

  const handleTest = async () => {
    const message = value.trim();
    if (!message) {
      return;
    }

    try {
      setError("");
      const testResult = await onTest(message);
      setResult(testResult);
    } catch (cause) {
      const messageText =
        typeof cause === "object" && cause !== null && "message" in cause && typeof cause.message === "string"
          ? cause.message
          : "AI test request failed";
      setError(messageText);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Type a customer message to test your AI assistant."
        className="min-h-[120px]"
      />
      <Button type="button" onClick={() => void handleTest()} disabled={isTesting || value.trim().length === 0}>
        {isTesting ? "Testing..." : "Test AI"}
      </Button>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      {result ? (
        <div className="space-y-2 rounded-md bg-muted p-3">
          <p className="whitespace-pre-wrap text-sm">{result.response}</p>
          <p className="text-xs text-muted-foreground">
            Model: {result.model}
            {typeof result.tokensUsed === "number" ? ` | Tokens: ${result.tokensUsed}` : ""}
            {typeof result.confidence === "number" ? ` | Confidence: ${Math.round(result.confidence * 100)}%` : ""}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Run a test to preview model output.</p>
      )}
    </div>
  );
};

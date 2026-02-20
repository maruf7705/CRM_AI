"use client";

import { useEffect, useState } from "react";
import { AiModeSelector } from "./AiModeSelector";
import { SystemPromptEditor } from "./SystemPromptEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AiSettings } from "@/hooks/useAiSettings";
import type { UpdateAiSettingsInput } from "@/hooks/useAiSettings";

interface AiConfigPanelProps {
  settings: AiSettings;
  isSaving?: boolean;
  onSave: (payload: UpdateAiSettingsInput) => Promise<void> | void;
}

const normalizeNumber = (value: string, fallback: number): number => {
  const asNumber = Number(value);
  if (!Number.isFinite(asNumber)) {
    return fallback;
  }

  return asNumber;
};

export const AiConfigPanel = ({ settings, isSaving = false, onSave }: AiConfigPanelProps) => {
  const [aiMode, setAiMode] = useState<"OFF" | "SUGGESTION" | "AUTO_REPLY">(settings.aiMode);
  const [aiSystemPrompt, setAiSystemPrompt] = useState(settings.aiSystemPrompt);
  const [aiModel, setAiModel] = useState(settings.aiModel);
  const [aiTemperature, setAiTemperature] = useState(String(settings.aiTemperature));
  const [aiMaxTokens, setAiMaxTokens] = useState(String(settings.aiMaxTokens));
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState(settings.n8nWebhookUrl ?? "");

  useEffect(() => {
    setAiMode(settings.aiMode);
    setAiSystemPrompt(settings.aiSystemPrompt);
    setAiModel(settings.aiModel);
    setAiTemperature(String(settings.aiTemperature));
    setAiMaxTokens(String(settings.aiMaxTokens));
    setN8nWebhookUrl(settings.n8nWebhookUrl ?? "");
  }, [settings]);

  const handleSave = async () => {
    await onSave({
      aiMode,
      aiSystemPrompt: aiSystemPrompt.trim() || null,
      aiModel: aiModel.trim(),
      aiTemperature: Math.max(0, Math.min(2, normalizeNumber(aiTemperature, settings.aiTemperature))),
      aiMaxTokens: Math.max(50, Math.min(8192, Math.round(normalizeNumber(aiMaxTokens, settings.aiMaxTokens)))),
      n8nWebhookUrl: n8nWebhookUrl.trim() ? n8nWebhookUrl.trim() : null,
    });
  };

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <AiModeSelector value={aiMode} onChange={setAiMode} />
      <SystemPromptEditor value={aiSystemPrompt} onChange={setAiSystemPrompt} />

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Model</label>
          <Input
            value={aiModel}
            onChange={(event) => setAiModel(event.target.value)}
            placeholder="gpt-4o"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Temperature</label>
          <Input
            value={aiTemperature}
            onChange={(event) => setAiTemperature(event.target.value)}
            placeholder="0.7"
            type="number"
            min={0}
            max={2}
            step={0.1}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Max Tokens</label>
          <Input
            value={aiMaxTokens}
            onChange={(event) => setAiMaxTokens(event.target.value)}
            placeholder="1000"
            type="number"
            min={50}
            max={8192}
            step={1}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">n8n Webhook URL</label>
          <Input
            value={n8nWebhookUrl}
            onChange={(event) => setN8nWebhookUrl(event.target.value)}
            placeholder="https://your-instance.app.n8n.cloud/webhook/ai-reply"
          />
        </div>
      </div>

      <Button onClick={() => void handleSave()} disabled={isSaving}>
        {isSaving ? "Saving..." : "Save AI Settings"}
      </Button>
    </div>
  );
};

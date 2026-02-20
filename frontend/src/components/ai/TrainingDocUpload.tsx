"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface UploadPayload {
  title?: string;
  content?: string;
  file?: File;
}

interface TrainingDocUploadProps {
  isUploading?: boolean;
  onUpload: (payload: UploadPayload) => Promise<void> | void;
}

export const TrainingDocUpload = ({ isUploading = false, onUpload }: TrainingDocUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const canSubmit = Boolean(content.trim() || selectedFile);

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    await onUpload({
      ...(title.trim() ? { title: title.trim() } : {}),
      ...(content.trim() ? { content: content.trim() } : {}),
      ...(selectedFile ? { file: selectedFile } : {}),
    });

    setTitle("");
    setContent("");
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Document Title</label>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Pricing & support policy"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Raw Content</label>
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Paste the key business information you want AI to use."
          className="min-h-[120px]"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Or Upload File</label>
        <Input
          ref={fileInputRef}
          type="file"
          onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          accept=".txt,.md,.csv,.json,.xml,.pdf"
        />
        {selectedFile ? (
          <p className="text-xs text-muted-foreground">
            Selected file: {selectedFile.name}
          </p>
        ) : null}
      </div>

      <Button type="button" variant="outline" onClick={() => void handleSubmit()} disabled={!canSubmit || isUploading}>
        <Upload className="mr-2 h-4 w-4" />
        {isUploading ? "Uploading..." : "Upload Training Doc"}
      </Button>
    </div>
  );
};

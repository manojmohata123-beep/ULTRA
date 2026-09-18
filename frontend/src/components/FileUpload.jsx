import React, { useRef, useState } from "react";
import { Upload, FileText, Loader2, X } from "lucide-react";
import { uploadFile, fileUrl } from "@/lib/api";
import { toast } from "sonner";

export const FileUpload = ({ value, onChange, label = "Upload document or image", testid }) => {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handle = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const res = await uploadFile(file);
      onChange(res);
      toast.success("File uploaded");
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setBusy(false);
    }
  };

  if (value?.id) {
    return (
      <div
        className="flex items-center justify-between gap-3 rounded-xl border border-[#E4DDD3] bg-[#F8F6F0] px-4 py-3"
        data-testid={testid ? `${testid}-preview` : undefined}
      >
        <a
          href={fileUrl(value.id)}
          target="_blank"
          rel="noreferrer"
          className="flex min-w-0 items-center gap-2 text-sm text-[#2C2A29] hover:text-[#9E3C1B]"
        >
          <FileText size={16} className="shrink-0 text-[#8C857B]" />
          <span className="truncate">{value.filename || "View document"}</span>
        </a>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="rounded-lg p-1 text-[#8C857B] hover:bg-[#F0ECE1]"
          data-testid={testid ? `${testid}-remove` : undefined}
        >
          <X size={15} />
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        data-testid={testid}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#D6CFC3] bg-[#F8F6F0] px-4 py-4 text-sm text-[#635E59] transition-colors hover:bg-[#F0ECE1]"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
        {busy ? "Uploading…" : label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handle}
      />
    </>
  );
};

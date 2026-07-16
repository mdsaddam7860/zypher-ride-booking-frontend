"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Copies `value` to the clipboard, flips its icon to a checkmark for a
 *  beat, and confirms with a toast. Falls back gracefully if the Clipboard
 *  API is unavailable (non-HTTPS/older browsers). */
export function CopyButton({
  value,
  label = "Copy",
  successLabel = "Copied",
  toastMessage,
  className,
  variant = "ghost",
  size = "sm",
  ...props
}: {
  value: string;
  label?: string;
  successLabel?: string;
  toastMessage?: string;
} & Omit<ButtonProps, "onClick" | "children">) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(toastMessage ?? "Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy — try selecting the text manually");
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={cn("gap-1.5 text-xs", className)}
      {...props}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-success" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? successLabel : label}
    </Button>
  );
}

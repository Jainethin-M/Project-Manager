"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

type CopyButtonProps = Omit<ButtonProps, "onClick"> & {
  value?: string;
  getValue?: () => string | Promise<string>;
  label?: string;
  copiedLabel?: string;
};

export function CopyButton({ value, getValue, label = "Copy", copiedLabel = "Copied", variant = "outline", size = "sm", ...props }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function copy() {
    const text = getValue ? await getValue() : value;
    if (!text) return;
    setBusy(true);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant={variant} size={size} onClick={copy} disabled={busy || (!value && !getValue)} {...props}>
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? copiedLabel : label}
    </Button>
  );
}

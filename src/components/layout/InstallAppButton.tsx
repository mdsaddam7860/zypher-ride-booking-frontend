"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { cn } from "@/lib/utils";

interface InstallAppButtonProps {
  className?: string;
  /**
   * Icon-only, square button — for tight spots like the mobile top bar.
   * Default (full label + icon) suits roomier spots like the sidebar
   * footer.
   */
  compact?: boolean;
}

/**
 * Renders nothing until the browser has actually offered an install
 * prompt, and nothing again once the app is installed — so this can be
 * dropped anywhere (nav, settings, a banner) without extra visibility
 * logic at the call site.
 */
export function InstallAppButton({ className, compact = false }: InstallAppButtonProps) {
  const { canInstall, promptInstall } = useInstallPrompt();

  if (!canInstall) return null;

  async function handleClick() {
    const outcome = await promptInstall();
    if (outcome === "accepted") {
      toast.success("Installing Zypher…");
    }
  }

  if (compact) {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={handleClick}
        aria-label="Install app"
        className={className}
      >
        <Download className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      className={cn("gap-2", className)}
    >
      <Download className="h-4 w-4" />
      Install app
    </Button>
  );
}

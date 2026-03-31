import * as React from "react";
import { HotkeysProvider } from "@/components/HotkeysProvider";
import { MediaKeyBindings } from "@/components/MediaKeyBindings";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";

export interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <HotkeysProvider>
      <MediaKeyBindings />
      <TooltipProvider delay={0}>
        <ThemeProvider>{children}</ThemeProvider>
      </TooltipProvider>
    </HotkeysProvider>
  );
}

import React from "react";
import { HotkeysProvider } from "@/components/HotkeysProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";

export interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <HotkeysProvider>
      <TooltipProvider delay={0}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </TooltipProvider>
    </HotkeysProvider>
  );
}
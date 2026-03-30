import * as React from "react";

export function useCopyToClipboard({ timeout = 2000 } = {}) {
  const [copied, setCopied] = React.useState(false);

  const copy = React.useCallback(
    async (text: string) => {
      if (!navigator?.clipboard) {
        console.warn("Clipboard API not supported");
        return false;
      }

      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(setCopied, timeout, false);
        return true;
      } catch (err) {
        console.error("Failed to copy:", err);
        setCopied(false);
        return false;
      }
    },
    [timeout],
  );

  return { copy, copied };
}

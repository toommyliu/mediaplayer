import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";


export function GeneralSection() {
  const { resolvedTheme, setTheme, theme } = useTheme();

  const tabButtonClass = (active: boolean) =>
    active
      ? "h-7 w-full justify-start text-left px-2 text-xs font-medium bg-secondary text-secondary-foreground"
      : "h-7 w-full justify-start text-left px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground";

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2.5 text-sm font-medium">Application Theme</h3>
        <div className="flex flex-wrap gap-1.5">
          <Button
            className={tabButtonClass(theme === "light")}
            onClick={() => setTheme("light")}
            type="button"
            variant="ghost"
          >
            <span className="inline-flex items-center gap-1.5">
              <Sun className="size-3.5" />
              Light
            </span>
          </Button>
          <Button
            className={tabButtonClass(theme === "dark")}
            onClick={() => setTheme("dark")}
            type="button"
            variant="ghost"
          >
            <span className="inline-flex items-center gap-1.5">
              <Moon className="size-3.5" />
              Dark
            </span>
          </Button>
          <Button
            className={tabButtonClass(theme === "system")}
            onClick={() => setTheme("system")}
            type="button"
            variant="ghost"
          >
            <span className="inline-flex items-center gap-1.5">
              <Monitor className="size-3.5" />
              System ({resolvedTheme})
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}

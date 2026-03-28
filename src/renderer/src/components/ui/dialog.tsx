"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type DialogRootProps = {
  children: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
};

export function Dialog({ children }: DialogRootProps): React.ReactElement {
  return <>{children}</>;
}

export function DialogBackdrop({
  className
}: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-black/32 backdrop-blur-sm transition-all duration-200",
        className
      )}
      data-slot="dialog-backdrop"
    />
  );
}

export type DialogPopupProps = React.HTMLAttributes<HTMLDivElement> & {
  children?: React.ReactNode;
  onClose?: () => void;
  showCloseButton?: boolean;
};

export function DialogPopup({
  className,
  children,
  onClose,
  showCloseButton = true,
  ...props
}: DialogPopupProps): React.ReactElement {
  return (
    <>
      <DialogBackdrop />
      <div className="fixed inset-0 z-50 grid place-items-center p-4">
        <div
          className={cn(
            "relative flex max-h-full min-h-0 w-full min-w-0 max-w-lg flex-col rounded-2xl border bg-popover text-popover-foreground shadow-lg/5",
            className
          )}
          data-slot="dialog-popup"
          {...props}
        >
          {children}
          {showCloseButton ? (
            <Button
              aria-label="Close"
              className="absolute end-2 top-2"
              onClick={onClose}
              size="icon"
              variant="ghost"
            >
              x
            </Button>
          ) : null}
        </div>
      </div>
    </>
  );
}


export function DialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-6 in-[[data-slot=dialog-popup]:has([data-slot=dialog-panel])]:pb-3 max-sm:pb-4",
        className,
      )}
      data-slot="dialog-header"
      {...props}
    />
  );
}

export function DialogFooter({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & {
  variant?: "default" | "bare";
}): React.ReactElement {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 px-6 sm:flex-row sm:justify-end sm:rounded-b-[calc(var(--radius-2xl)-1px)]",
        variant === "default" && "border-t bg-muted/72 py-4",
        variant === "bare" &&
          "in-[[data-slot=dialog-popup]:has([data-slot=dialog-panel])]:pt-3 pt-4 pb-6",
        className,
      )}
      data-slot="dialog-footer"
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentProps<"h2">): React.ReactElement {
  return (
    <h2
      className={cn(
        "font-heading font-semibold text-xl leading-none",
        className,
      )}
      data-slot="dialog-title"
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentProps<"p">): React.ReactElement {
  return (
    <p
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="dialog-description"
      {...props}
    />
  );
}

export function DialogPanel({
  className,
  ...props
}: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div
      className={cn(
        "overflow-y-auto p-6 in-[[data-slot=dialog-popup]:has([data-slot=dialog-header])]:pt-1 in-[[data-slot=dialog-popup]:has([data-slot=dialog-footer]:not(.border-t))]:pb-1",
        className,
      )}
      data-slot="dialog-panel"
      {...props}
    />
  );
}

export {
  DialogBackdrop as DialogOverlay,
  DialogPopup as DialogContent,
  type DialogPopupProps as DialogContentProps,
};

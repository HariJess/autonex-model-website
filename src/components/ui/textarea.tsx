import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[96px] md:min-h-[80px] w-full rounded-md border-2 border-input bg-card px-3 py-2 text-base md:text-sm shadow-sm transition-colors ring-offset-background",
        "placeholder:text-muted-foreground/90",
        "hover:border-primary/40 hover:shadow",
        "focus-visible:outline-none focus-visible:border-primary/55 focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:bg-muted/70 disabled:opacity-80",
        "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive/25",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };

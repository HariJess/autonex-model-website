import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 md:h-10 w-full rounded-md border-2 border-input bg-card px-3 py-2 text-base shadow-sm transition-colors ring-offset-background",
          "placeholder:text-muted-foreground/90",
          "hover:border-primary/40 hover:shadow",
          "focus-visible:outline-none focus-visible:border-primary/55 focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:bg-muted/70 disabled:text-muted-foreground disabled:opacity-80",
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive/25",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

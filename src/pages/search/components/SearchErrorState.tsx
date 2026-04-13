import { AlertCircle } from "lucide-react";

type SearchErrorStateProps = {
  title: string;
  message: string;
};

export function SearchErrorState({ title, message }: SearchErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-2">
      <AlertCircle className="h-10 w-10 text-destructive mb-3" />
      <p className="font-serif text-lg text-foreground mb-1">{title}</p>
      <p className="font-sans text-sm text-muted-foreground max-w-md">{message}</p>
    </div>
  );
}

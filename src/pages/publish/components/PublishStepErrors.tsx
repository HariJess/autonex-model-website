import { AlertCircle } from "lucide-react";

type PublishStepErrorsProps = {
  errors: string[];
};

export function PublishStepErrors({ errors }: PublishStepErrorsProps) {
  if (errors.length === 0) return null;

  return (
    <div className="mb-4 p-4 bg-destructive/10 border-2 border-destructive/35 rounded-xl shadow-sm">
      {errors.map((err, i) => (
        <p key={i} className="text-sm text-destructive font-sans flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {err}
        </p>
      ))}
    </div>
  );
}


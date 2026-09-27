import { Construction } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PagePlaceholderProps {
  title: string;
  description: string;
  badge: string;
}

export function PagePlaceholder({ title, description, badge }: PagePlaceholderProps) {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-card/50 py-16 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
          <Construction className="size-6 text-muted-foreground" />
        </div>
        <Badge variant="secondary">{badge}</Badge>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="rounded-xl border bg-card p-10 text-center shadow-sm">
      <h1 className="text-2xl font-bold tracking-tight">Project not found</h1>
      <p className="mt-2 text-muted-foreground">That project does not exist in your local DevVault database.</p>
      <Button asChild className="mt-6">
        <Link href="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}

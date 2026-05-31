"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AdminToolbar() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex justify-end">
      <Button type="button" variant="outline" size="sm" onClick={logout}>
        Lock admin
      </Button>
    </div>
  );
}

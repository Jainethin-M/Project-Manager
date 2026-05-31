import type { ReactNode } from "react";
import { hasAdminSession } from "@/lib/admin-auth";
import { AdminLogin } from "@/components/admin/admin-login";
import { AdminToolbar } from "@/components/admin/admin-toolbar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const authenticated = await hasAdminSession();

  if (!authenticated) {
    return <AdminLogin />;
  }

  return (
    <div className="space-y-6">
      <AdminToolbar />
      {children}
    </div>
  );
}

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let session;
  try {
    session = await getSession();
  } catch {
    redirect("/login");
  }
  if (!session) redirect("/login");
  let user;
  try {
    user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, name: true },
    });
  } catch {
    redirect("/login");
  }
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <Sidebar user={{ email: user.email, name: user.name }} />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">{children}</div>
      </main>
    </div>
  );
}

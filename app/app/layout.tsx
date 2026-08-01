import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import Nav from "@/components/Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="rn-shell">
      <header className="rn-app-header">
        <div className="rn-wordmark rn-wordmark--small">Recovery Nutrition Tracker</div>
        <SignOutButton />
      </header>
      <Nav />
      {children}
    </main>
  );
}

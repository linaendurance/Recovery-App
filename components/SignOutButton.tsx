"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearFoodCache } from "@/lib/foodsRepo";

export default function SignOutButton() {
  const router = useRouter();

  const onClick = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearFoodCache(); // otherwise the next account in this tab reuses it
    router.push("/login");
    router.refresh();
  };

  return (
    <button className="rn-link" onClick={onClick}>
      Sign out
    </button>
  );
}

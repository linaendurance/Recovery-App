import { createClient } from "@/lib/supabase/client";
import { ageBandFromBirthYear, referencesFor, type AgeBand } from "@/lib/nutrition";

export type Profile = {
  id: string;
  display_name: string | null;
  birth_year: number | null;
  created_at: string;
};

export type ProfileContext = {
  profile: Profile | null;
  band: AgeBand;
  references: ReturnType<typeof referencesFor>;
};

/**
 * Loads the signed-in profile and resolves which set of reference nutrient
 * values applies. Adult references are the fallback when birth year is unknown
 * — they are the lower of the two for calcium, so an adolescent seeing them
 * would be under-informed rather than misled upward.
 */
export async function loadProfileContext(knownUserId?: string): Promise<ProfileContext> {
  const supabase = createClient();

  // Every auth.getUser() is a network round-trip that re-validates the JWT
  // against Supabase Auth. Callers that already resolved the user pass the id
  // in rather than paying for a second validation of the same token — loading
  // Today used to cost four (middleware, layout, page, and this).
  let userId = knownUserId;
  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id;
  }
  if (!userId) return { profile: null, band: "19plus", references: referencesFor("19plus") };

  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, birth_year, created_at")
    .eq("id", userId)
    .maybeSingle();

  const profile = (data as Profile) ?? null;
  const band = ageBandFromBirthYear(profile?.birth_year);
  return { profile, band, references: referencesFor(band) };
}

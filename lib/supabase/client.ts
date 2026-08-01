import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = "https://gzhujyagleysqqmhsdyg.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6aHVqeWFnbGV5c3FxbWhzZHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNTc0MzMsImV4cCI6MjEwMDgzMzQzM30._eG422FhCohMgL5laBGgUCz0M8z0tO3ASGMQDF6kqBw";

// One client per browser tab, used inside Client Components.
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

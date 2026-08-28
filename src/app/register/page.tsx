import { createClient } from "@/lib/supabase/server";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_servant_leaders");
  return <RegisterForm leaders={data ?? []} />;
}

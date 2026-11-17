import { HeaderClient } from "./header-client";
import { getAccountSummary } from "@/lib/auth/account-summary";
export async function Header() {
  return <HeaderClient account={await getAccountSummary()} />;
}

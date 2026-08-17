import { DiagnosisFlow } from "@/components/diagnosis-flow";
import { cookies } from "next/headers";
import { accountAuthEnabled, currentAccount } from "@/lib/account-auth";
import { authEnabled, isValidSession, SESSION_COOKIE } from "@/lib/auth";

export default async function DiagnozPage() {
  let authenticated = false;
  if (accountAuthEnabled()) authenticated = Boolean(await currentAccount());
  else if (!authEnabled()) authenticated = true;
  else authenticated = await isValidSession((await cookies()).get(SESSION_COOKIE)?.value);
  return <DiagnosisFlow authenticated={authenticated} />;
}

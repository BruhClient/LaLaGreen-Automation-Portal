import { assertItemAccess } from "@/lib/permissions";

export default async function PpcTopUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await assertItemAccess("automations", "ppc-top-up");
  return <>{children}</>;
}

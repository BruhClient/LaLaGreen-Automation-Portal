import { assertItemAccess } from "@/lib/permissions";

export default async function MasterListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await assertItemAccess("configuration", "master-list");
  return <>{children}</>;
}

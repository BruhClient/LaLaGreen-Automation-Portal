import { assertItemAccess } from "@/lib/permissions";

export default async function SponsoredBrandsUploadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await assertItemAccess("tools", "sponsored-brands-upload");
  return <>{children}</>;
}

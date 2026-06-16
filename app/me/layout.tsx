import { MeNav } from "@/components/me-nav";

export default function MeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MeNav />
      {children}
    </>
  );
}

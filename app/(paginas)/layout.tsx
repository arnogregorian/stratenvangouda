import NavFooter from "@/components/NavFooter";

export default function PaginaLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {children}
      <NavFooter />
    </>
  );
}

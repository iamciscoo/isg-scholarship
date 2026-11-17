import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { LanguageNotice } from "@/components/layout/language-notice";
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main">
        <LanguageNotice />
        {children}
      </main>
      <Footer />
    </>
  );
}

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { LanguageNotice } from "@/components/layout/language-notice";
import { LocalizedContent } from "@/components/public/localized-content";
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main">
        <LanguageNotice />
        <LocalizedContent>{children}</LocalizedContent>
      </main>
      <Footer />
    </>
  );
}

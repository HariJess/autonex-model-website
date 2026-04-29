import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { ReactNode } from "react";
import { YasBackButton } from "@/features/yas-app/components/YasBackButton";

type AuthFormShellProps = {
  title: string;
  maxWidthClassName: string;
  children: ReactNode;
};

export function AuthFormShell({ title, maxWidthClassName, children }: AuthFormShellProps) {
  return (
    <>
      <Helmet>
        <title>{title} — AutoNex</title>
      </Helmet>
      <Header />
      <div className="container mx-auto px-4 pt-3">
        <YasBackButton />
      </div>
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-10 md:py-16">
        <div className={`w-full ${maxWidthClassName} bg-card rounded-2xl border border-border p-5 sm:p-8 shadow-sm space-y-6`}>
          {children}
        </div>
      </div>
      <Footer />
    </>
  );
}


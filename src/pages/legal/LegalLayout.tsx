import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

interface Props {
  title: string;
  description: string;
  children: React.ReactNode;
}

export default function LegalLayout({ title, description, children }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title} | TELA ERP</title>
        <meta name="description" content={description} />
      </Helmet>
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="font-semibold">TELA ERP</Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/refund-policy" className="hover:text-foreground">Refunds</Link>
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: May 2, 2026</p>
        <article className="prose prose-sm max-w-none dark:prose-invert space-y-4 text-foreground/90 leading-relaxed [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_a]:text-primary [&_a]:underline">
          {children}
        </article>
      </main>
    </div>
  );
}

import { Helmet } from 'react-helmet-async';
import { Link, useParams, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, ArrowLeft, ArrowRight, Building2, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { blogPosts } from '@/data/blog-posts';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = blogPosts.find(p => p.slug === slug);

  if (!post) return <Navigate to="/blog" replace />;

  const currentIndex = blogPosts.findIndex(p => p.slug === slug);
  const prev = currentIndex > 0 ? blogPosts[currentIndex - 1] : null;
  const next = currentIndex < blogPosts.length - 1 ? blogPosts[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{post.metaTitle}</title>
        <meta name="description" content={post.metaDescription} />
        <link rel="canonical" href={`https://tela-erp.com/blog/${post.slug}`} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.metaTitle} />
        <meta property="og:description" content={post.metaDescription} />
        <meta property="og:url" content={`https://tela-erp.com/blog/${post.slug}`} />
        <meta property="og:image" content="https://tela-erp.com/og-image.svg" />
        <meta property="article:published_time" content={post.date} />
        <meta name="author" content="Erick Elibariki Olomi" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://tela-erp.com" },
            { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://tela-erp.com/blog" },
            { "@type": "ListItem", "position": 3, "name": post.title, "item": `https://tela-erp.com/blog/${post.slug}` }
          ]
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": post.title,
          "description": post.metaDescription,
          "datePublished": post.date,
          "author": {
            "@type": "Person",
            "name": "Erick Elibariki Olomi",
            "url": "https://tela-erp.com/about"
          },
          "publisher": {
            "@type": "Organization",
            "name": "TELA-ERP",
            "url": "https://tela-erp.com",
            "logo": "https://tela-erp.com/favicon.ico"
          },
          "url": `https://tela-erp.com/blog/${post.slug}`,
          "image": "https://tela-erp.com/og-image.svg"
        })}</script>
      </Helmet>

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">TELA-ERP</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link to="/modules" className="hover:text-foreground transition-colors">Modules</Link>
            <Link to="/features" className="hover:text-foreground transition-colors">Features</Link>
            <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link to="/blog" className="text-foreground font-semibold">Blog</Link>
            <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild><Link to="/login">Sign In</Link></Button>
            <Button size="sm" className="gradient-primary" asChild><Link to="/signup">Get Started</Link></Button>
          </div>
        </div>
      </nav>

      {/* BREADCRUMB */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>/</span>
          <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
          <span>/</span>
          <span className="text-foreground truncate">{post.title}</span>
        </div>
      </div>

      {/* ARTICLE HEADER */}
      <header className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Badge variant="secondary" className="mb-4">{post.category}</Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-6">
            {post.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                <span className="text-xs font-bold text-white">EO</span>
              </div>
              <span className="font-medium text-foreground">Erick Elibariki Olomi</span>
            </div>
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{post.date}</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{post.readTime}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {post.tags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-xs text-muted-foreground">
                <Tag className="w-3 h-3" />{tag}
              </span>
            ))}
          </div>
        </motion.div>
      </header>

      {/* ARTICLE BODY */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="prose prose-lg prose-slate dark:prose-invert max-w-none
            prose-headings:font-bold prose-headings:tracking-tight
            prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
            prose-p:leading-relaxed prose-p:mb-5
            prose-li:leading-relaxed
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-strong:text-foreground
            prose-table:text-sm
            prose-th:bg-muted prose-th:p-3
            prose-td:p-3 prose-td:border prose-td:border-border"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>

      {/* CTA BOX */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="rounded-2xl gradient-primary p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-1/4 w-64 h-64 rounded-full bg-white blur-3xl" />
          </div>
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-white mb-2">Try TELA-ERP Free Today</h2>
            <p className="text-white/80 mb-6">No subscriptions. No credit card. Just a powerful free ERP for your business.</p>
            <Button size="lg" variant="secondary" asChild>
              <Link to="/signup">Get Started Free <ArrowRight className="w-4 h-4 ml-2" /></Link>
            </Button>
          </div>
        </div>
      </div>

      {/* PREV / NEXT */}
      {(prev || next) && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 grid sm:grid-cols-2 gap-4 border-t border-border pt-10">
          {prev && (
            <Link to={`/blog/${prev.slug}`} className="group flex items-start gap-3 p-4 rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all">
              <ArrowLeft className="w-5 h-5 mt-0.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Previous</p>
                <p className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">{prev.title}</p>
              </div>
            </Link>
          )}
          {next && (
            <Link to={`/blog/${next.slug}`} className="group flex items-start gap-3 p-4 rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all sm:ml-auto text-right">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Next</p>
                <p className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">{next.title}</p>
              </div>
              <ArrowRight className="w-5 h-5 mt-0.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </Link>
          )}
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-border py-8 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} TELA-ERP — Free Open Source ERP</span>
          <div className="flex gap-4">
            <Link to="/features" className="hover:text-foreground transition-colors">Features</Link>
            <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

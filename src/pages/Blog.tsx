import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, Tag, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { blogPosts } from '@/data/blog-posts';
import telaLogo from '@/assets/tela-erp-logo.png';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0, 0, 0.2, 1] as const },
  }),
};

export default function Blog() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Blog — TELA-ERP | ERP Guides, Comparisons & Small Business Tips</title>
        <meta name="description" content="ERP guides, comparisons, and how-to articles for small businesses. Learn how to manage inventory, sales, production and accounting with free open source ERP software." />
        <link rel="canonical" href="https://tela-erp.com/blog" />
        <meta property="og:title" content="TELA-ERP Blog | ERP Guides for Small Businesses" />
        <meta property="og:description" content="Practical guides on ERP software, inventory management, accounting and more for small businesses worldwide." />
        <meta property="og:url" content="https://tela-erp.com/blog" />
      </Helmet>

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={telaLogo} alt="TELA ERP" className="h-8 w-auto" />
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

      {/* HERO */}
      <section className="py-20 text-center bg-muted/30 border-b border-border">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="max-w-3xl mx-auto px-4">
          <Badge variant="secondary" className="mb-4">ERP Knowledge Base</Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            ERP Guides & Resources
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Practical articles to help small businesses manage operations, pick the right software, and grow efficiently.
          </p>
        </motion.div>
      </section>

      {/* POSTS GRID */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 gap-8">
          {blogPosts.map((post, i) => (
            <motion.div
              key={post.slug}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i}
            >
              <Link to={`/blog/${post.slug}`} className="block group h-full">
                <Card className="h-full hover:shadow-lg transition-all duration-300 border-border group-hover:border-primary/30">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="secondary" className="text-xs">{post.category}</Badge>
                    </div>
                    <h2 className="text-xl font-bold leading-snug mb-3 group-hover:text-primary transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-4">
                      {post.excerpt}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Tag className="w-3 h-3" />{tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-4">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{post.date}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.readTime}</span>
                      </div>
                      <span className="flex items-center gap-1 text-primary font-medium">
                        Read more <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-muted/30 border-t border-border text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-3">Ready to try TELA-ERP?</h2>
          <p className="text-muted-foreground mb-6">Free, open source, and ready to run your business. No credit card required.</p>
          <Button size="lg" className="gradient-primary" asChild>
            <Link to="/signup">Start Free <ArrowRight className="w-4 h-4 ml-2" /></Link>
          </Button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-8 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} TELA-ERP — Enterprise Resource Planning</span>
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

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Heart, Globe, GitBranch, Zap, Users, Shield, Cpu,
  ChevronRight, Star, Code2, Database, Layers, Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const P = 'hsl(230,65%,52%)';
const A = 'hsl(32,95%,52%)';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0, 0, 0.2, 1] as const },
  }),
};

const values = [
  {
    icon: Globe,
    title: 'Built for Africa, Built for the World',
    desc: 'TELA was designed with African business realities in mind — multi-currency, intermittent connectivity, and diverse supply chains. But its architecture scales globally.',
  },
  {
    icon: GitBranch,
    title: 'Open Source First',
    desc: 'We believe enterprise software should be accessible. TELA-ERP is open source at its core, giving teams full transparency and the freedom to self-host or extend.',
  },
  {
    icon: Heart,
    title: 'User Empathy',
    desc: "We obsess over usability. Every workflow is designed so a warehouse manager and a CFO can both find what they need without training manuals or consultants.",
  },
  {
    icon: Zap,
    title: 'Automation Over Manual Work',
    desc: 'Every module is wired to every other module. A sale deducts stock, generates an invoice, and creates accounting entries — automatically, in real time.',
  },
];

const stats = [
  { value: '15', label: 'Integrated Modules', sub: 'Inventory to AI — one platform' },
  { value: '165+', label: 'Currencies Supported', sub: 'Live exchange rates built in' },
  { value: '100%', label: 'Open Source', sub: 'MIT licensed on GitHub' },
  { value: '∞', label: 'Scalability', sub: 'From 1 user to enterprise' },
];

const techStack = [
  { icon: Code2, name: 'React + TypeScript', desc: 'Type-safe, component-driven UI with Vite for blazing-fast builds.' },
  { icon: Database, name: 'Supabase (PostgreSQL)', desc: 'Managed Postgres with Row Level Security, Realtime, and Auth out of the box.' },
  { icon: Layers, name: 'shadcn/ui + Tailwind CSS', desc: 'Accessible, customizable component library with a utility-first styling approach.' },
  { icon: Palette, name: 'Framer Motion', desc: 'Production-quality animations that enhance UX without sacrificing performance.' },
  { icon: Shield, name: 'Row Level Security', desc: 'Every query is scoped by tenant ID at the database level — no application-level filter mistakes.' },
  { icon: Zap, name: 'React Query + Zustand', desc: 'Optimistic updates, smart caching, and lightweight global state management.' },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: P }}>
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">TELA-ERP</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link to="/features" className="text-muted-foreground hover:text-foreground transition-colors">Features</Link>
            <Link to="/modules" className="text-muted-foreground hover:text-foreground transition-colors">Modules</Link>
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            <Link to="/about" style={{ color: P }}>About</Link>
            <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild><Link to="/login">Sign in</Link></Button>
            <Button size="sm" className="text-white hover:opacity-90" style={{ background: P }} asChild>
              <Link to="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* HERO — MISSION */}
      <section
        className="py-28 text-center relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${P}10 0%, transparent 55%, ${A}08 100%)` }}
      >
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="max-w-4xl mx-auto px-4">
          <Badge className="mb-5" style={{ background: `${P}18`, color: P, border: `1px solid ${P}33` }}>
            Our Mission
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
            Making Enterprise Software{' '}
            <span style={{ color: P }}>Accessible to Every Business</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            TELA-ERP exists because world-class business software should not be a luxury. We build the tools that help teams — everywhere — run smarter, leaner, and more efficiently.
          </p>
        </motion.div>
      </section>

      {/* OUR STORY */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <Badge className="mb-4" variant="secondary">Our Story</Badge>
            <h2 className="text-3xl font-extrabold mb-5 leading-snug">
              Started from a real problem. Built into a real platform.
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                TELA-ERP was born out of frustration. Existing ERP systems were either too expensive for small and mid-sized African businesses, too complex to deploy without expensive consultants, or simply not designed for how business actually works on the continent.
              </p>
              <p>
                We set out to build something different: a fully interconnected ERP that a 10-person manufacturing company could afford and deploy themselves, but that could also scale to serve a multi-country enterprise with thousands of transactions per day.
              </p>
              <p>
                Built on modern open-source technology — React, TypeScript, Supabase, and Tailwind — TELA-ERP is designed to be maintainable, extensible, and genuinely useful from day one.
              </p>
            </div>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, i) => (
                <Card key={i} className="border-border/60 hover:shadow-md transition-shadow">
                  <CardContent className="pt-6 pb-5 text-center">
                    <div className="text-3xl font-extrabold mb-1" style={{ color: i % 2 === 0 ? P : A }}>
                      {stat.value}
                    </div>
                    <div className="font-semibold text-sm mb-0.5">{stat.label}</div>
                    <div className="text-xs text-muted-foreground">{stat.sub}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* VALUES */}
      <section className="bg-muted/30 py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-center mb-14"
          >
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">What We Believe</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Four principles that guide every product decision we make.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 gap-6">
            {values.map((val, i) => {
              const Icon = val.icon;
              return (
                <motion.div
                  key={val.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={i + 1}
                >
                  <Card className="h-full border-border/60 hover:shadow-lg transition-all group">
                    <CardContent className="pt-7 pb-6">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:scale-105 transition-transform"
                        style={{ background: `${i % 2 === 0 ? P : A}15` }}
                      >
                        <Icon className="w-6 h-6" style={{ color: i % 2 === 0 ? P : A }} />
                      </div>
                      <h3 className="font-bold text-lg mb-2">{val.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{val.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* BUILT WITH */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">Built With</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            A carefully chosen open-source stack that prioritizes reliability, developer experience, and long-term maintainability.
          </p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {techStack.map((tech, i) => {
            const Icon = tech.icon;
            return (
              <motion.div
                key={tech.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i + 1}
              >
                <Card className="border-border/60 hover:shadow-md transition-all group h-full">
                  <CardContent className="pt-6 flex gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform"
                      style={{ background: `${P}12` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: P }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm mb-1">{tech.name}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{tech.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center" style={{ background: `linear-gradient(135deg, ${P}10 0%, transparent 60%)` }}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="max-w-2xl mx-auto px-4"
        >
          <Star className="w-8 h-8 mx-auto mb-4" style={{ color: A }} />
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Join the community</h2>
          <p className="text-muted-foreground mb-8">
            Whether you are a developer, business owner, or reseller — TELA-ERP is built for you. Start free, contribute on GitHub, or talk to our team.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" className="gap-2 text-white" style={{ background: P }} asChild>
              <Link to="/signup">Get started free <ChevronRight className="w-4 h-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/contact">Contact us</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/60 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} TELA-ERP. Open-source ERP for Africa.</span>
          <div className="flex gap-4">
            <Link to="/features" className="hover:text-foreground transition-colors">Features</Link>
            <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Heart, Globe, GitBranch, Zap, Shield, Cpu,
  ChevronRight, Star, Code2, Database, Layers, Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import erickPhoto from '@/assets/erick-olomi.jpg';
import telaLogo from '@/assets/tela-erp-logo.png';

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
    desc: 'We believe enterprise software should be accessible to all. TELA-ERP is open source at its core, giving teams full transparency and the freedom to self-host or extend.',
  },
  {
    icon: Heart,
    title: 'User Empathy',
    desc: "We obsess over usability. Every workflow is designed so a warehouse manager and a CFO can both find what they need without training manuals or expensive consultants.",
  },
  {
    icon: Zap,
    title: 'Automation Over Manual Work',
    desc: 'Every module is wired to every other. A sale deducts stock, generates an invoice, and creates accounting entries — automatically, in real time.',
  },
];

const stats = [
  { value: '15+', label: 'Integrated Modules', sub: 'Inventory to AI — one platform' },
  { value: '165+', label: 'Currencies Supported', sub: 'Live exchange rates built in' },
  { value: '100%', label: 'Open Source', sub: 'Free forever for SMEs' },
  { value: '∞', label: 'Scalability', sub: 'From 1 user to enterprise' },
];

const techStack = [
  { icon: Code2, name: 'React + TypeScript', desc: 'Type-safe, component-driven UI with Vite for blazing-fast builds.' },
  { icon: Database, name: 'Supabase (PostgreSQL)', desc: 'Managed Postgres with Row Level Security, Realtime, and Auth out of the box.' },
  { icon: Layers, name: 'shadcn/ui + Tailwind CSS', desc: 'Accessible, customizable component library with a utility-first styling approach.' },
  { icon: Palette, name: 'Framer Motion', desc: 'Production-quality animations that enhance UX without sacrificing performance.' },
  { icon: Shield, name: 'Row Level Security', desc: 'Every query is scoped by tenant ID at the database level — no application-level filter mistakes.' },
  { icon: Zap, name: 'React Query', desc: 'Optimistic updates, smart caching, and real-time sync across all modules.' },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>About — TELA-ERP | Built in Tanzania for SMEs Worldwide</title>
        <meta name="description" content="Meet Erick Elibariki Olomi, the founder of TELA-ERP. A tax consultant from Tanga, Tanzania who built a free, open source ERP to make enterprise software accessible to every small business." />
        <link rel="canonical" href="https://tela-erp.com/about" />
        <meta property="og:title" content="About TELA-ERP | Our Story & Mission" />
        <meta property="og:description" content="Built by a Tanzanian tax consultant, TELA-ERP exists to make world-class ERP software accessible to small businesses everywhere — free and open source." />
        <meta property="og:url" content="https://tela-erp.com/about" />
      </Helmet>
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={telaLogo} alt="TELA ERP" className="h-8 w-auto" />
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
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="max-w-4xl mx-auto px-4 relative z-10">
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

      {/* FOUNDER SECTION */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-24">
        <div className="grid md:grid-cols-5 gap-12 items-start">
          {/* Photo */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="md:col-span-2 flex flex-col items-center md:items-start"
          >
            <div className="relative">
              <div
                className="absolute -inset-1 rounded-2xl opacity-30 blur-sm"
                style={{ background: `linear-gradient(135deg, ${P}, ${A})` }}
              />
              <img
                src={erickPhoto}
                alt="Erick Elibariki Olomi — Founder of TELA-ERP"
                className="relative w-64 h-72 object-cover object-top rounded-2xl shadow-xl border-2 border-white/20"
              />
            </div>
            <div className="mt-5 text-center md:text-left">
              <p className="font-bold text-xl">Erick Elibariki Olomi</p>
              <p className="text-sm mt-0.5" style={{ color: P }}>Developer &amp; Founder</p>
              <p className="text-xs text-muted-foreground mt-1">Tax Consultant &amp; Finance Professional</p>
              <p className="text-xs text-muted-foreground">Prime Auditors — Tanga, Tanzania</p>
              <div className="flex flex-col gap-1 mt-3">
                <a
                  href="mailto:olomierik@gmail.com"
                  className="text-xs text-muted-foreground hover:underline"
                >
                  olomierik@gmail.com
                </a>
                <a
                  href="tel:+255752401012"
                  className="text-xs text-muted-foreground hover:underline"
                >
                  +255 752 401 012
                </a>
              </div>
            </div>
          </motion.div>

          {/* Story */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={1}
            className="md:col-span-3"
          >
            <Badge className="mb-4" variant="secondary">The Story Behind TELA-ERP</Badge>
            <h2 className="text-3xl font-extrabold mb-6 leading-snug">
              Built from Real Experience. Driven by a Real Problem.
            </h2>
            <div className="space-y-5 text-muted-foreground leading-relaxed">
              <p>
                Erick Elibariki Olomi is a tax consultant and finance professional with years of experience at a reputable auditing firm in Tanga, Tanzania. Working closely with small and medium enterprises every day, he witnessed first-hand the challenges business owners face — not just with taxes, but with managing their operations.
              </p>
              <p>
                Again and again, he encountered the same complaint from clients: <strong className="text-foreground">"Business software is too expensive."</strong> Most of the powerful ERP solutions available required large upfront licensing fees, expensive implementation consultants, and ongoing subscription costs that were simply out of reach for the small businesses that needed them most.
              </p>
              <p>
                Erick decided something had to change. Drawing on his deep understanding of finance, tax compliance, and how African SMEs actually operate, he designed and built TELA-ERP from the ground up — fully open source, free for anyone to use, and powerful enough to handle everything from production and inventory to accounting and payroll.
              </p>
              <p>
                He knows that maintaining a platform of this scale is not without cost — servers, cloud infrastructure, AI integrations, and continuous development all require real resources. But he believes in the goodness of people and the power of community. He is confident that businesses and individuals who benefit from TELA-ERP will be willing to contribute — even small donations — to keep the platform alive and growing.
              </p>
              <p className="font-medium text-foreground border-l-4 pl-4" style={{ borderColor: P }}>
                "I built this because I believe every business, regardless of size or location, deserves access to tools that help them succeed. Good software should not be a privilege."
                <br />
                <span className="text-sm font-normal text-muted-foreground">— Erick Elibariki Olomi, Founder of TELA-ERP</span>
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* STATS */}
      <section className="bg-muted/30 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
              >
                <Card className="border-border/60 hover:shadow-md transition-shadow">
                  <CardContent className="pt-6 pb-5 text-center">
                    <div className="text-3xl font-extrabold mb-1" style={{ color: i % 2 === 0 ? P : A }}>
                      {stat.value}
                    </div>
                    <div className="font-semibold text-sm mb-0.5">{stat.label}</div>
                    <div className="text-xs text-muted-foreground">{stat.sub}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="py-24">
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
        </div>
      </section>

      {/* SUPPORT CTA */}
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
            Whether you are a developer, business owner, or reseller — TELA-ERP is built for you. Start free, or reach out to Erick directly.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" className="gap-2 text-white" style={{ background: P }} asChild>
              <Link to="/signup">Get started free <ChevronRight className="w-4 h-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/contact">Contact Erick</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/60 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>© 2026 Erick Elibariki Olomi — +255 752 401 012 | Erick.olomi@primeauditors.co.tz</span>
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

import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Mail, MapPin, Clock, Send, Cpu, ChevronRight, Loader2,
  MessageSquare, Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

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

const contactInfo = [
  {
    icon: Mail,
    label: 'Email',
    value: 'olomierik@gmail.com',
    sub: 'Erick.olomi@primeauditors.co.tz',
    color: P,
  },
  {
    icon: MapPin,
    label: 'Location',
    value: 'Tanga, Tanzania',
    sub: 'Building for Africa and beyond.',
    color: A,
  },
  {
    icon: Clock,
    label: 'Support Hours',
    value: 'Mon – Fri, 8am – 6pm EAT',
    sub: 'Reach us via WhatsApp anytime.',
    color: P,
  },
  {
    icon: Phone,
    label: 'Sales Line',
    value: '+255 752 401 012',
    sub: 'WhatsApp: +255 752 401 012',
    color: A,
  },
];

interface FormState {
  name: string;
  email: string;
  company: string;
  message: string;
}

export default function Contact() {
  const [form, setForm] = useState<FormState>({ name: '', email: '', company: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill in your name, email, and message.');
      return;
    }
    setLoading(true);
    await new Promise((res) => setTimeout(res, 600));

    const subject = encodeURIComponent(`TELA-ERP Enquiry from ${form.name}${form.company ? ` (${form.company})` : ''}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}${form.company ? `\nCompany: ${form.company}` : ''}\n\nMessage:\n${form.message}`
    );
    window.open(`mailto:olomierik@gmail.com?subject=${subject}&body=${body}`, '_blank');

    setLoading(false);
    setForm({ name: '', email: '', company: '', message: '' });
    toast.success("Your email client has opened — please send the pre-filled message!");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Contact — TELA-ERP | Get in Touch</title>
        <meta name="description" content="Contact TELA-ERP founder Erick Elibariki Olomi. Reach us by email at olomierik@gmail.com or WhatsApp +255 752 401 012. Based in Tanga, Tanzania." />
        <link rel="canonical" href="https://tela-erp.com/contact" />
        <meta property="og:title" content="Contact TELA-ERP | We'd Love to Hear from You" />
        <meta property="og:description" content="Have a question about TELA-ERP? Reach out to our team. We reply within 24 hours." />
        <meta property="og:url" content="https://tela-erp.com/contact" />
      </Helmet>
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
            <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</Link>
            <Link to="/contact" style={{ color: P }}>Contact</Link>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild><Link to="/login">Sign in</Link></Button>
            <Button size="sm" className="text-white hover:opacity-90" style={{ background: P }} asChild>
              <Link to="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section
        className="py-20 text-center relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${P}10 0%, transparent 55%, ${A}08 100%)` }}
      >
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="max-w-2xl mx-auto px-4">
          <Badge className="mb-4" style={{ background: `${P}18`, color: P, border: `1px solid ${P}33` }}>
            Get in Touch
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-4">
            We'd Love to{' '}
            <span style={{ color: P }}>Hear from You</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Have a question, feedback, or want to explore what TELA-ERP can do for your team? Send us a message and we'll get back to you.
          </p>
        </motion.div>
      </section>

      {/* MAIN CONTENT — Two Columns */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="grid lg:grid-cols-5 gap-10">
          {/* LEFT: Contact Form */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={1}
            className="lg:col-span-3"
          >
            <Card className="border-border/60 shadow-lg">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${P}12` }}>
                    <MessageSquare className="w-5 h-5" style={{ color: P }} />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Send a Message</CardTitle>
                    <p className="text-sm text-muted-foreground">Fill in the form and we'll reply within 24 hours.</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5 mt-2">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="name" className="text-sm font-medium">
                        Full Name <span style={{ color: A }}>*</span>
                      </label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="Jane Doe"
                        value={form.name}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="email" className="text-sm font-medium">
                        Email Address <span style={{ color: A }}>*</span>
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="jane@company.com"
                        value={form.email}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="company" className="text-sm font-medium">
                      Company <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <Input
                      id="company"
                      name="company"
                      placeholder="Acme Ltd."
                      value={form.company}
                      onChange={handleChange}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="message" className="text-sm font-medium">
                      Message <span style={{ color: A }}>*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={6}
                      placeholder="Tell us what you're working on, what questions you have, or how we can help..."
                      value={form.message}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full gap-2 text-white"
                    style={{ background: P }}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* RIGHT: Contact Info Cards */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={2}
            className="lg:col-span-2 flex flex-col gap-4"
          >
            <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              Contact Details
            </p>
            {contactInfo.map((info, i) => {
              const Icon = info.icon;
              return (
                <motion.div
                  key={info.label}
                  initial="hidden"
                  animate="visible"
                  variants={fadeUp}
                  custom={i + 3}
                >
                  <Card className="border-border/60 hover:shadow-md transition-all">
                    <CardContent className="py-5 flex gap-4 items-start">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${info.color}15` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: info.color }} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
                          {info.label}
                        </p>
                        <p className="font-semibold text-sm">{info.value}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{info.sub}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}

            {/* Quick CTA */}
            <Card className="border-dashed border-border/60 mt-2" style={{ background: `${P}06` }}>
              <CardContent className="py-5 text-center">
                <p className="text-sm font-semibold mb-1">Ready to get started?</p>
                <p className="text-xs text-muted-foreground mb-3">Create a free account in 2 minutes.</p>
                <Button size="sm" className="gap-2 text-white w-full" style={{ background: P }} asChild>
                  <Link to="/signup">
                    Sign up free <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/60 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>© 2026 Erick Elibariki Olomi — +255 752 401 012 | Erick.olomi@primeauditors.co.tz</span>
          <div className="flex gap-4">
            <Link to="/features" className="hover:text-foreground transition-colors">Features</Link>
            <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

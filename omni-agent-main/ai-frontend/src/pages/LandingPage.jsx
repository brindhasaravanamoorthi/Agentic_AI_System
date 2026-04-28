import { Link } from 'react-router-dom';
import {
  Bot,
  Mic,
  MessageSquare,
  BarChart3,
  Zap,
  Shield,
  ArrowRight,
  Package,
  ShoppingCart,
  TrendingUp,
  Eye,
  Wallet,
  Users,
  FileCheck,
} from 'lucide-react';
import aiOrb from '../assets/ai-orb.gif';

const AGENTS = [
  {
    name: 'Warden',
    icon: Eye,
    role: 'Monitoring & Detection',
    desc: 'Watches inventory, detects anomalies, and flags critical issues before they impact sales.',
    color: 'from-violet-500/20 to-violet-600/5',
    border: 'border-violet-500/30',
    iconColor: 'text-violet-400',
  },
  {
    name: 'Finance',
    icon: Wallet,
    role: 'Budget & Approval',
    desc: 'Evaluates costs, ROI, and budget impact for every proposed action.',
    color: 'from-emerald-500/20 to-emerald-600/5',
    border: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
  },
  {
    name: 'Consensus',
    icon: Users,
    role: 'Orchestration',
    desc: 'Coordinates agents, synthesizes recommendations, and proposes the best course of action.',
    color: 'from-blue-500/20 to-blue-600/5',
    border: 'border-blue-500/30',
    iconColor: 'text-blue-400',
  },
  {
    name: 'Proposal',
    icon: FileCheck,
    role: 'Action Execution',
    desc: 'Drafts and executes approved actions—restocking, adding products, updating inventory.',
    color: 'from-amber-500/20 to-amber-600/5',
    border: 'border-amber-500/30',
    iconColor: 'text-amber-400',
  },
];

const CAPABILITIES = [
  { icon: Package, label: 'Inventory Management', desc: 'Stock levels, reorder alerts, restocking' },
  { icon: ShoppingCart, label: 'Abandoned Carts', desc: 'Recovery opportunities & follow-ups' },
  { icon: TrendingUp, label: 'Sales Analytics', desc: 'Revenue, trends, performance metrics' },
  { icon: BarChart3, label: 'Live Dashboard', desc: 'Real-time agent activity & business KPIs' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#070b14] text-white font-outfit antialiased">
      {/* Subtle grid background */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />
      <div
        className="absolute inset-0 z-0"
        style={{
          background: "#020617",
          backgroundImage: `
        linear-gradient(to right, rgba(71,85,105,0.3) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(71,85,105,0.3) 1px, transparent 1px),
        radial-gradient(circle at 50% 50%, rgba(139,92,246,0.15) 0%, transparent 70%)
      `,
          backgroundSize: "32px 32px, 32px 32px, 100% 100%",
        }}
      />

      {/* Hero — fits viewport */}
      <section className="relative z-10 min-h-[100dvh] flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center flex flex-col items-center">

            {/* AI Orb — compact for viewport fit */}
            <div className="flex justify-center border-blue-600 border-0 border-t-2 drop-shadow-[0_0_50px_rgba(59,130,246,0.2)]  w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-full">
              <img
                src={aiOrb}
                alt="OmniAgent AI"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <h1 className="text-transparent bg-clip-text bg-linear-to-r from-blue-200 via-white to-blue-200 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-16 mb-4 sm:mb-6">
              Your store. <br />Managed by AI.
            </h1>

            <p className="text-base sm:text-lg text-slate-400 max-w-xl sm:max-w-2xl mx-auto mb-6 sm:mb-8 font-light">
              OmniAgent coordinates a team of specialized AI agents to handle inventory, analytics, and operations—so you can focus on growth.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-6 sm:mb-8">
              <Link
                to="/chat"
                className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold text-sm sm:text-base transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5"
              >
                <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
                Start free trial
              </Link>
              <Link
                to="/analytics"
                className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-sm sm:text-base transition-all duration-200"
              >
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
                View demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why OmniAgent */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              Why OmniAgent?
            </h2>
            <p className="text-2xl sm:text-3xl font-semibold text-slate-300 mb-4 max-w-3xl mx-auto">
              Your personal ecommerce management team in one place.
            </p>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              You can rest while they take the job.
            </p>
          </div>

          {/* Agents grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {AGENTS.map(({ name, icon: Icon, role, desc, color, border, iconColor }) => (
              <div
                key={name}
                className={`group relative p-6 rounded-2xl bg-gradient-to-b ${color} border ${border} hover:border-opacity-60 transition-all duration-300`}
              >
                <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 ${iconColor}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{name}</h3>
                <p className="text-sm font-medium text-slate-400 mb-2">{role}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Capabilities — what's inside */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-8 sm:p-10">
            <h3 className="text-lg font-semibold text-slate-400 uppercase tracking-wider mb-6 text-center">
              What&apos;s inside
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {CAPABILITIES.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-slate-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{label}</p>
                    <p className="text-sm text-slate-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">How it works</h2>
          <p className="text-slate-500 text-center max-w-xl mx-auto mb-16">
            Three steps. No setup. Start in seconds.
          </p>

          <div className="space-y-8">
            {[
              { step: '01', title: 'Ask in plain English', desc: '"Check inventory", "Show abandoned carts", "Analyze today\'s sales"—OmniAgent understands.', icon: MessageSquare },
              { step: '02', title: 'Agents collaborate', desc: 'Warden, Finance, and Consensus analyze in real time. You see their reasoning before any action.', icon: Zap },
              { step: '03', title: 'Approve & execute', desc: 'One-click approve or reject. Changes apply immediately. Every decision is logged.', icon: Shield },
            ].map(({ step, title, desc, icon: Icon }) => (
              <div
                key={step}
                className="flex items-start gap-6 p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
              >
                <span className="text-2xl font-bold text-slate-600">{step}</span>
                <div className="w-12 h-12 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center shrink-0">
                  <Icon className="w-6 h-6 text-[#3b82f6]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
                  <p className="text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to automate?</h2>
          <p className="text-slate-500 mb-8">
            Join merchants who let OmniAgent handle the heavy lifting.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/chat"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold transition-colors"
            >
              <Bot className="w-5 h-5" />
              Get started free
            </Link>
            <Link
              to="/analytics"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-white/10 hover:bg-white/5 text-white font-medium transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
              See analytics
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-4 border-t border-white/5">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-[#3b82f6]" />
            <span className="font-semibold">OmniAgent</span>
          </div>
          <div className="flex gap-8 text-sm text-slate-500">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <Link to="/chat" className="hover:text-white transition-colors">Chat</Link>
            <Link to="/analytics" className="hover:text-white transition-colors">Analytics</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

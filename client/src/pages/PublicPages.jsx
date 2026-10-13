import React from 'react';
import {
  Shield,
  Zap,
  MapPin,
  Clock,
  Sparkles,
  Award,
  Users,
  CheckCircle2,
  ArrowRight,
  Target,
  ShoppingCart,
  Lock,
  Globe
} from 'lucide-react';

export function PublicNavbar({ onNavigate, currentPage }) {
  return (
    <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-900 px-6 py-4 flex items-center justify-between text-white">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('landing')}>
        <img src="/favicon.svg" alt="Logo" className="w-8 h-8" />
        <div>
          <span className="font-black text-sm text-white tracking-tight">EDGE<span className="text-orange-500">W</span>FORCE</span>
          <span className="hidden sm:block text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Experiential Edge</span>
        </div>
      </div>

      <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-zinc-400">
        <button onClick={() => onNavigate('landing')} className={`hover:text-white transition ${currentPage === 'landing' ? 'text-orange-500' : ''}`}>Overview</button>
        <button onClick={() => onNavigate('features')} className={`hover:text-white transition ${currentPage === 'features' ? 'text-orange-500' : ''}`}>Features</button>
        <button onClick={() => onNavigate('about')} className={`hover:text-white transition ${currentPage === 'about' ? 'text-orange-500' : ''}`}>About</button>
        <button onClick={() => onNavigate('privacy')} className={`hover:text-white transition ${currentPage === 'privacy' ? 'text-orange-500' : ''}`}>Privacy & Ethics</button>
        <button onClick={() => onNavigate('terms')} className={`hover:text-white transition ${currentPage === 'terms' ? 'text-orange-500' : ''}`}>Terms</button>
      </nav>

      <button
        onClick={() => onNavigate('login')}
        className="btn-primary text-xs py-2 px-4 shadow-md shadow-orange-500/20"
      >
        <span>Enter Platform</span>
        <ArrowRight size={14} />
      </button>
    </header>
  );
}

export function PublicFooter({ onNavigate }) {
  return (
    <footer className="bg-zinc-950 border-t border-zinc-900 text-zinc-400 text-xs py-12 px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
        <div className="space-y-2 col-span-2 md:col-span-1">
          <div className="font-black text-white text-base tracking-tight">EDGE<span className="text-orange-500">W</span>FORCE</div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Enterprise Workforce & Commercial Sales Operating System. Powered by Experiential Edge Limited.
          </p>
        </div>
        <div className="space-y-1.5">
          <div className="font-bold text-zinc-200 uppercase text-[10px] tracking-wider mb-2">Platform</div>
          <div><button onClick={() => onNavigate('features')} className="hover:text-white">Commercial Sales</button></div>
          <div><button onClick={() => onNavigate('features')} className="hover:text-white">Field Operations</button></div>
          <div><button onClick={() => onNavigate('features')} className="hover:text-white">HR & Telemetry</button></div>
        </div>
        <div className="space-y-1.5">
          <div className="font-bold text-zinc-200 uppercase text-[10px] tracking-wider mb-2">Company</div>
          <div><button onClick={() => onNavigate('about')} className="hover:text-white">About Experiential Edge</button></div>
          <div><button onClick={() => onNavigate('privacy')} className="hover:text-white">Privacy & Ethics</button></div>
          <div><button onClick={() => onNavigate('terms')} className="hover:text-white">Terms of Service</button></div>
        </div>
        <div className="space-y-1.5">
          <div className="font-bold text-zinc-200 uppercase text-[10px] tracking-wider mb-2">Headquarters</div>
          <div className="text-[11px] text-zinc-400">15 Atiba Osborne, Mende, Maryland, Lagos, Nigeria</div>
          <div className="text-[11px] text-orange-400 font-mono mt-1">+234 (0) 1 234 5678</div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto pt-6 border-t border-zinc-900 flex flex-col sm:flex-row justify-between text-zinc-500 text-[11px]">
        <div>Corporate Operations Center • Mende, Maryland, Lagos.</div>
      </div>
    </footer>
  );
}

export function LandingPage({ onNavigate }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white sunburst-bg">
      <PublicNavbar onNavigate={onNavigate} currentPage="landing" />

      {/* Hero Section */}
      <section className="py-20 px-6 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold shadow-xs">
          <Sparkles size={14} />
          <span>Experiential Edge • Workforce Intelligence Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
          Workforce Operating System for <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500">Commercial & Field Operations</span>
        </h1>

        <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Unifying Commercial POS Sales, 150m Strict GPS Field Audits, Employee Self-Service, Non-Invasive Idle Monitoring, and AI Sales Coaching.
        </p>

        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <button onClick={() => onNavigate('login')} className="btn-primary text-sm py-3 px-6 shadow-xl shadow-orange-500/25 font-bold">
            <span>Sign In to Workspace</span>
            <ArrowRight size={16} />
          </button>
          <button onClick={() => onNavigate('features')} className="btn-secondary text-sm py-3 px-6 bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800">
            Explore Capabilities
          </button>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-16 px-6 max-w-6xl mx-auto border-t border-zinc-900">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <div className="p-3 w-fit rounded-xl bg-orange-500/10 text-orange-500"><ShoppingCart size={24} /></div>
            <h3 className="text-lg font-bold text-white">Commercial Sales POS</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Full POS order booking, 7.5% Nigerian VAT calculations, merchant credit limits, instant receipt printing, and 5% automated commission engine.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <div className="p-3 w-fit rounded-xl bg-amber-500/10 text-amber-500"><MapPin size={24} /></div>
            <h3 className="text-lg font-bold text-white">150m Strict Geofencing</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Mathematical Haversine GPS verification ensures field audits, photo evidence, and customer signatures happen strictly on-site.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <div className="p-3 w-fit rounded-xl bg-emerald-500/10 text-emerald-500"><Clock size={24} /></div>
            <h3 className="text-lg font-bold text-white">Workforce Intelligence</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              10-minute non-invasive inactivity telemetry, GPS timesheet clock-in, leave approval workflow with working days logic, and payslip generation.
            </p>
          </div>
        </div>
      </section>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}

export function FeaturesPage({ onNavigate }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white sunburst-bg">
      <PublicNavbar onNavigate={onNavigate} currentPage="features" />
      <div className="py-16 px-6 max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-black">Complete Platform Capabilities</h1>
          <p className="text-xs text-zinc-400 max-w-xl mx-auto">
            Engineered for enterprise scale, operational compliance, and offline reliability.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-3">
            <h3 className="text-base font-bold text-orange-400">Commercial Sales Cockpit</h3>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-orange-500" /> 12-Section Sales Cockpit with live KPI cards</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-orange-500" /> 5% Commission engine with milestone tracking</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-orange-500" /> POS terminal with stock verification & 7.5% VAT</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-orange-500" /> Sales AI Copilot with objection handling & coaching</li>
            </ul>
          </div>

          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-3">
            <h3 className="text-base font-bold text-amber-400">Field Operations & Geofencing</h3>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-amber-500" /> Mobile-first route execution manifest</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-amber-500" /> Strict 150-meter Haversine GPS geofence verification</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-amber-500" /> Store audit checklist, shelf share slider & signature canvas</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-amber-500" /> Emergency SOS panic beacon with GPS broadcast</li>
            </ul>
          </div>
        </div>
      </div>
      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}

export function AboutPage({ onNavigate }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white sunburst-bg">
      <PublicNavbar onNavigate={onNavigate} currentPage="about" />
      <div className="py-16 px-6 max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-black">About Experiential Edge</h1>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Experiential Edge / Integrated Marketing Solutions is a premier commercial execution, retail distribution, and field marketing agency operating across Nigeria.
        </p>
        <p className="text-sm text-zinc-400 leading-relaxed">
          EdgeWForce was conceived and developed as our in-house enterprise workforce operating system to solve the challenges of distributed sales accountability, verifiable store audits, transparent commission structures, and fair workforce productivity.
        </p>
      </div>
      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}

export function PrivacyPage({ onNavigate }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white sunburst-bg">
      <PublicNavbar onNavigate={onNavigate} currentPage="privacy" />
      <div className="py-16 px-6 max-w-4xl mx-auto space-y-6 text-xs text-zinc-400 leading-relaxed">
        <h1 className="text-3xl font-black text-white">Privacy & Ethics Policy</h1>
        <p>
          At Experiential Edge, we believe in transparent, respectful, and non-invasive employee telemetry.
        </p>
        <h3 className="text-base font-bold text-white">1. Inactivity Tracking Philosophy</h3>
        <p>
          Our 10-minute idle tracker does not log keystrokes, capture screen screenshots, or record video. It merely prompts the employee for a brief reason when the browser has been inactive, fostering two-way accountability.
        </p>
        <h3 className="text-base font-bold text-white">2. GPS Telemetry Scope</h3>
        <p>
          GPS coordinates are captured exclusively during active work shifts and visit check-ins to verify proximity within the 150-meter perimeter of retail outlets.
        </p>
      </div>
      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}

export function TermsPage({ onNavigate }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white sunburst-bg">
      <PublicNavbar onNavigate={onNavigate} currentPage="terms" />
      <div className="py-16 px-6 max-w-4xl mx-auto space-y-6 text-xs text-zinc-400 leading-relaxed">
        <h1 className="text-3xl font-black text-white">Terms of Service</h1>
        <p>
          Use of the EdgeWForce platform is governed by corporate compliance agreements between Experiential Edge Nigeria Limited and authorized staff members.
        </p>
      </div>
      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}

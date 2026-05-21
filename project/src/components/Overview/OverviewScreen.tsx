import React, { useState, useEffect } from 'react';
import {
  Target,
  Timer,
  Trophy,
  Zap,
  Brain,
  Users,
  Play,
  ArrowRight,
  CheckCircle,
  Award,
  Flame,
  ShoppingBag
} from 'lucide-react';

interface OverviewScreenProps {
  onGetStarted: () => void;
}

const features = [
  {
    icon: Timer,
    title: 'Focus Sessions',
    description: 'Customizable focus sessions from 15–60 minutes with real-time progress tracking',
    color: 'from-blue-500 to-blue-600',
    benefits: ['Pomodoro technique', 'Distraction tracking', 'Session analytics']
  },
  {
    icon: Trophy,
    title: 'Gamification',
    description: 'Earn XP, level up, and unlock achievements to stay motivated',
    color: 'from-violet-500 to-purple-600',
    benefits: ['XP system', 'Level progression', 'Achievement badges']
  },
  {
    icon: Flame,
    title: 'Streak Tracking',
    description: 'Build daily focus habits and maintain consistency streaks',
    color: 'from-orange-500 to-red-500',
    benefits: ['Daily streaks', 'Milestone rewards', 'Habit building']
  },
  {
    icon: Brain,
    title: 'MoMo AI Focus Coach',
    description: 'Get personalized insights and recommendations from your AI focus coach',
    color: 'from-emerald-500 to-green-600',
    benefits: ['Pattern analysis', 'Personalized tips', 'Behavioral insights']
  },
  {
    icon: ShoppingBag,
    title: 'XP Marketplace',
    description: 'Spend earned XP on avatars, backgrounds, and customizations',
    color: 'from-pink-500 to-rose-500',
    benefits: ['Custom avatars', 'Premium backgrounds', 'Personalization']
  },
  {
    icon: Users,
    title: 'Community',
    description: 'Compete with other focus warriors on global leaderboards',
    color: 'from-indigo-500 to-violet-600',
    benefits: ['Global leaderboards', 'Social features', 'Friendly competition']
  }
];

export function OverviewScreen({ onGetStarted }: OverviewScreenProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  return (
    <div
      className={`min-h-screen transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{ background: 'linear-gradient(135deg, #0d0118 0%, #1a0533 40%, #2d1060 70%, #1a0533 100%)' }}
    >
      {/* Ambient glow orbs — pure CSS, no external images */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #9333ea 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10">
        {/* ── Hero ── */}
        <section className="min-h-screen flex items-center justify-center px-4 py-12">
          <div className="max-w-5xl mx-auto text-center">
            <div className={`transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
              <div className="flex items-center justify-center gap-4 mb-8">
                <img
                  src="/icon16.png"
                  alt="Focus Path™ Logo"
                  className="h-20 w-20 rounded-3xl shadow-2xl"
                />
                <h1 className="text-6xl md:text-8xl font-bold text-white tracking-tight">
                  Focus Path™
                </h1>
              </div>

              <p className="text-2xl md:text-3xl font-medium mb-6 leading-relaxed"
                style={{ color: '#c4b5fd' }}>
                Master your focus, unlock your potential
              </p>

              <p className="text-lg text-purple-200/70 mb-12 max-w-2xl mx-auto leading-relaxed">
                The gamified productivity platform that transforms your focus sessions into an
                engaging journey of growth, achievement, and personal mastery.
              </p>
            </div>

            <div className={`transition-all duration-1000 delay-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
              <button
                onClick={onGetStarted}
                className="group inline-flex items-center gap-3 px-10 py-5 rounded-2xl text-lg font-bold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-violet-500/40"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}
              >
                <Play className="h-6 w-6" />
                Start Your Focus Journey
                <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
              </button>

              <p className="text-purple-300/60 mt-5 text-sm">
                Free to start • Start building better focus habits today • Best use on laptop
              </p>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="py-24 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Everything You Need to Master Focus
              </h2>
              <p className="text-lg text-purple-200/70 max-w-2xl mx-auto">
                Proven productivity techniques combined with modern gamification.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={i}
                    className={`rounded-2xl p-7 border transition-all duration-500 hover:scale-[1.03] hover:border-purple-500/50 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      borderColor: 'rgba(139,92,246,0.2)',
                      transitionDelay: `${i * 80}ms`,
                      backdropFilter: 'blur(12px)'
                    }}
                  >
                    <div className={`bg-gradient-to-br ${feature.color} p-3 rounded-xl mb-5 w-fit`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-purple-200/60 text-sm mb-5 leading-relaxed">{feature.description}</p>
                    <div className="space-y-1.5">
                      {feature.benefits.map((b, bi) => (
                        <div key={bi} className="flex items-center gap-2">
                          <CheckCircle className="h-3.5 w-3.5 text-violet-400 flex-shrink-0" />
                          <span className="text-purple-200/70 text-sm">{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section className="py-24 px-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                How Focus Path™ Works
              </h2>
              <p className="text-lg text-purple-200/70 max-w-2xl mx-auto">
                Three simple steps to build lasting focus habits
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  step: '1', title: 'Choose Your Session',
                  description: 'Select Easy (15 min), Medium (30 min), Hard (45 min), or Extreme (60 min) based on your current ability.',
                  icon: Target, color: 'from-blue-500 to-blue-600'
                },
                {
                  step: '2', title: 'Focus & Earn XP',
                  description: 'Complete sessions to earn XP. Build streaks for bonus rewards and stay consistent.',
                  icon: Zap, color: 'from-violet-500 to-purple-600'
                },
                {
                  step: '3', title: 'Level Up & Customize',
                  description: 'Spend XP to unlock avatars, backgrounds, and power-ups. Rise through focus mastery levels.',
                  icon: Award, color: 'from-emerald-500 to-green-600'
                }
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="text-center">
                    <div className={`bg-gradient-to-br ${s.color} w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <div className="rounded-2xl p-6 border"
                      style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(139,92,246,0.2)' }}>
                      <div className="text-sm font-semibold text-violet-400 mb-2 uppercase tracking-widest">Step {s.step}</div>
                      <h3 className="text-xl font-bold text-white mb-3">{s.title}</h3>
                      <p className="text-purple-200/60 text-sm leading-relaxed">{s.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Benefits ── */}
        <section className="py-24 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Why Choose Focus Path™?</h2>
              <p className="text-lg text-purple-200/70 max-w-2xl mx-auto">
                Unlike traditional apps, Focus Path™ makes building focus habits genuinely rewarding.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div className="space-y-7">
                {[
                  { icon: '🎮', title: 'Gamified Experience', description: 'Turn productivity into a game with XP, levels, achievements, and rewards that keep you coming back.' },
                  { icon: '🧠', title: 'Science-Based', description: 'Built on proven focus techniques like Pomodoro, with AI insights to optimize your personal patterns.' },
                  { icon: '📈', title: 'Track Your Growth', description: 'Detailed analytics show your focus improvement over time so you can optimize your workflow.' },
                  { icon: '🎨', title: 'Personalized', description: 'Customize with avatars, backgrounds, and themes that reflect your personality and goals.' }
                ].map((b, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <span className="text-3xl">{b.icon}</span>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">{b.title}</h3>
                      <p className="text-purple-200/60 text-sm leading-relaxed">{b.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-3xl p-8 border relative overflow-hidden"
                style={{ background: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.25)' }}>
                <div className="text-center">
                  <div className="text-5xl mb-5">🚀</div>
                  <h3 className="text-2xl font-bold text-white mb-3">Ready to Transform?</h3>
                  <p className="text-purple-200/60 text-sm mb-7 leading-relaxed">
                    Join users who have already improved their productivity with Focus Path™.
                  </p>
                  <div className="space-y-3">
                    {['Free to start', 'No credit card required', 'Start earning XP immediately'].map((item) => (
                      <div key={item} className="flex items-center gap-3 text-emerald-300 text-sm">
                        <CheckCircle className="h-4 w-4 flex-shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-24 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="rounded-3xl p-12 border"
              style={{
                background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(79,70,229,0.15) 100%)',
                borderColor: 'rgba(139,92,246,0.3)'
              }}>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Start Your Focus Journey Today
              </h2>
              <p className="text-purple-200/70 mb-8 leading-relaxed">
                Your future focused self is waiting. Best experienced on a laptop.
              </p>

              <button
                onClick={onGetStarted}
                className="group inline-flex items-center gap-3 px-10 py-5 rounded-2xl text-lg font-bold text-white shadow-2xl transition-all duration-300 hover:scale-105 mb-8"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}
              >
                <Play className="h-5 w-5" />
                Get Started Free
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>

              <div className="flex items-center justify-center gap-6 text-purple-300/60 text-sm">
                {['Free forever', 'Privacy focused', 'Start immediately'].map((item) => (
                  <div key={item} className="flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="py-12 px-4" style={{ borderTop: '1px solid rgba(139,92,246,0.15)' }}>
          <div className="max-w-6xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <img src="/icon16.png" alt="Focus Path™ Logo" className="h-10 w-10 rounded-xl" />
              <span className="text-xl font-bold text-white">Focus Path™</span>
            </div>
            <p className="text-purple-300/50 text-sm mb-4">Master your focus, unlock your potential</p>
            <div className="text-xs text-purple-300/30 space-y-1">
              <div>© 2025 Focus Path™. All rights reserved.</div>
              <div>
                Licensed to{' '}
                <span className="text-purple-200/60">Hemisphir Technologies</span>,{' '}
                <span className="text-purple-200/60">Hemisphir LLC</span>
              </div>
              <div className="flex items-center justify-center gap-3 mt-3 text-purple-300/40">
                <span>Privacy Policy</span>
                <span>•</span>
                <span>Terms of Service</span>
                <span>•</span>
                <span>Support</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

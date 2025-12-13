'use client';

import { BottomNav } from '@/components/bottom-nav';
import { useRouter } from 'next/navigation';

export default function PricingPage() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden pb-24" style={{ background: '#09140f' }}>
      <header className="pt-12 pb-2 px-6 flex items-center justify-between z-10">
        <button
          onClick={() => router.back()}
          className="text-white hover:text-[#f9f506] transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Pricing
        </h1>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 px-4 space-y-6 overflow-y-auto no-scrollbar pb-10">
        <div className="text-center py-8">
          <h2 className="text-3xl font-bold text-white mb-2">Choose Your Plan</h2>
          <p className="text-gray-400">Simple pricing for powerful AI decisions</p>
        </div>

        <div className="space-y-4">
          {/* Free Plan */}
          <div className="border rounded-3xl p-6" style={{
            backgroundColor: '#121e18',
            borderColor: 'rgba(255, 255, 255, 0.05)'
          }}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Free</h3>
                <p className="text-sm text-gray-400">Perfect to get started</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-white">$0</p>
                <p className="text-sm text-gray-400">/month</p>
              </div>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-gray-300">
                <span className="material-symbols-outlined text-[#f9f506]">check_circle</span>
                <span className="text-sm">10 AI decisions/month</span>
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <span className="material-symbols-outlined text-[#f9f506]">check_circle</span>
                <span className="text-sm">Basic voice commands</span>
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <span className="material-symbols-outlined text-[#f9f506]">check_circle</span>
                <span className="text-sm">Task management</span>
              </li>
            </ul>
            <button className="w-full px-4 py-3 rounded-2xl border text-white font-semibold transition-colors hover:bg-white/5" style={{
              borderColor: 'rgba(255, 255, 255, 0.1)'
            }}>
              Current Plan
            </button>
          </div>

          {/* Pro Plan */}
          <div className="border rounded-3xl p-6 relative overflow-hidden" style={{
            backgroundColor: '#121e18',
            borderColor: 'rgba(249, 245, 6, 0.3)'
          }}>
            <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold" style={{
              backgroundColor: '#f9f506',
              color: '#000'
            }}>
              POPULAR
            </div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Pro</h3>
                <p className="text-sm text-gray-400">For power users</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-white">$19</p>
                <p className="text-sm text-gray-400">/month</p>
              </div>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-gray-300">
                <span className="material-symbols-outlined text-[#f9f506]">check_circle</span>
                <span className="text-sm">Unlimited AI decisions</span>
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <span className="material-symbols-outlined text-[#f9f506]">check_circle</span>
                <span className="text-sm">Advanced voice AI</span>
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <span className="material-symbols-outlined text-[#f9f506]">check_circle</span>
                <span className="text-sm">Email & WhatsApp automation</span>
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <span className="material-symbols-outlined text-[#f9f506]">check_circle</span>
                <span className="text-sm">Calendar integration</span>
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <span className="material-symbols-outlined text-[#f9f506]">check_circle</span>
                <span className="text-sm">Priority support</span>
              </li>
            </ul>
            <button className="w-full px-4 py-3 rounded-2xl font-bold text-black transition-all hover:opacity-90" style={{
              backgroundColor: '#f9f506',
              boxShadow: '0 0 20px rgba(249, 245, 6, 0.25)'
            }}>
              Upgrade to Pro
            </button>
          </div>

          {/* Enterprise Plan */}
          <div className="border rounded-3xl p-6" style={{
            backgroundColor: '#121e18',
            borderColor: 'rgba(255, 255, 255, 0.05)'
          }}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Enterprise</h3>
                <p className="text-sm text-gray-400">For teams</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-white">Custom</p>
                <p className="text-sm text-gray-400">pricing</p>
              </div>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-gray-300">
                <span className="material-symbols-outlined text-[#f9f506]">check_circle</span>
                <span className="text-sm">Everything in Pro</span>
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <span className="material-symbols-outlined text-[#f9f506]">check_circle</span>
                <span className="text-sm">Team collaboration</span>
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <span className="material-symbols-outlined text-[#f9f506]">check_circle</span>
                <span className="text-sm">Advanced analytics</span>
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <span className="material-symbols-outlined text-[#f9f506]">check_circle</span>
                <span className="text-sm">Dedicated support</span>
              </li>
            </ul>
            <button className="w-full px-4 py-3 rounded-2xl border text-white font-semibold transition-colors hover:bg-white/5" style={{
              borderColor: 'rgba(255, 255, 255, 0.1)'
            }}>
              Contact Sales
            </button>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

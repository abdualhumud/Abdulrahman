'use client';

import { useJourney } from '@/lib/journey-context';
import { useLang } from '@/lib/language-context';
import { Icons } from '@/lib/icons';

interface Props {
  onNavigate: (page: string) => void;
}

const STEP_PAGES = ['onboarding', 'properties', 'channels', 'overview'] as const;

export default function JourneyBanner({ onNavigate }: Props) {
  const { completed, currentGuide, setGuide } = useJourney();
  const { t, lang } = useLang();
  const tj = t.journey;

  // Hide after all 4 steps done
  if (completed.size >= 4) return null;

  const steps = [
    { num: 1 as const, label: tj.step1, page: 'onboarding', icon: Icons.user     },
    { num: 2 as const, label: tj.step2, page: 'properties', icon: Icons.properties },
    { num: 3 as const, label: tj.step3, page: 'channels',   icon: Icons.channels   },
    { num: 4 as const, label: tj.step4, page: 'overview',   icon: Icons.flag       },
  ];

  const firstPending = steps.find(s => !completed.has(s.num));

  return (
    <div
      className="bg-gradient-to-r from-blue-600 to-indigo-600 flex-shrink-0"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="px-5 py-2.5 flex items-center gap-4">
        {/* Title */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Icons.flag size={14} className="text-blue-200" />
          <span className="text-xs font-bold text-white/80 uppercase tracking-wider">{tj.title}</span>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-white/20 flex-shrink-0" />

        {/* Steps */}
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {steps.map((step, i) => {
            const done    = completed.has(step.num);
            const active  = !done && step.num === (firstPending?.num ?? null);
            const Icon    = step.icon;

            return (
              <div key={step.num} className="flex items-center gap-1">
                <button
                  onClick={() => { onNavigate(step.page); setGuide(step.num); }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all
                    ${done
                      ? 'bg-white/20 text-white/70 line-through'
                      : active
                        ? 'bg-white text-blue-700 shadow-md font-bold'
                        : 'text-white/50 hover:text-white/80'
                    }`}
                >
                  {done ? (
                    <Icons.sparkles size={11} className="text-white/70 no-underline" />
                  ) : (
                    <span className={`w-4 h-4 rounded-full text-[10px] font-extrabold flex items-center justify-center flex-shrink-0
                      ${active ? 'bg-blue-600 text-white' : 'border border-white/30 text-white/50'}`}>
                      {step.num}
                    </span>
                  )}
                  <span className="hidden sm:inline">{step.label}</span>
                </button>

                {/* Arrow between steps */}
                {i < steps.length - 1 && (
                  <Icons.arrowRight size={10} className="text-white/30 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Next step CTA */}
        {firstPending && (
          <button
            onClick={() => { onNavigate(firstPending.page); setGuide(firstPending.num); }}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-xs text-white font-bold transition-all border border-white/20"
          >
            {tj.nextStep}: {firstPending.label}
            <Icons.arrowRight size={11} />
          </button>
        )}
      </div>
    </div>
  );
}

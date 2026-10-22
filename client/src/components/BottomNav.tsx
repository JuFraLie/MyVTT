export type TabId = 'map' | 'dice' | 'character' | 'log';

interface BottomNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  {
    id: 'map',
    label: 'Peta',
    icon: 'M9 4 3 6.5v13.5L9 17.5l6 2.5 6-2.5V4l-6 2.5L9 4Zm0 0v13.5M15 6.5V20',
  },
  {
    id: 'dice',
    label: 'Dadu',
    icon: 'M4 4h16v16H4V4Zm4.5 4.5h.01M15.5 15.5h.01M12 12h.01M15.5 8.5h.01M8.5 15.5h.01',
  },
  {
    id: 'character',
    label: 'Karakter',
    icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 8c0-3.5 3.6-5.5 8-5.5s8 2 8 5.5',
  },
  {
    id: 'log',
    label: 'Log',
    icon: 'M4 6h16M4 12h16M4 18h16',
  },
];

/**
 * Navigasi: bawah di HP (zona jempol, target sentuh >= 44 px),
 * rel kiri di layar lebar (md+) — tetap mobile-first, desktop sekunder (AGENTS.md §7).
 */
export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="order-last border-t border-slate-800 bg-slate-900 pb-[env(safe-area-inset-bottom)] md:order-first md:h-full md:w-20 md:shrink-0 md:border-t-0 md:border-r md:pb-0 md:pt-2">
      <ul className="grid grid-cols-4 md:grid-cols-1">
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <li key={tab.id}>
              <button
                type="button"
                onClick={() => onChange(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex h-16 w-full flex-col items-center justify-center gap-1 text-xs transition-colors ${
                  isActive ? 'text-indigo-400' : 'text-slate-400'
                }`}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={tab.icon} />
                </svg>
                <span>{tab.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

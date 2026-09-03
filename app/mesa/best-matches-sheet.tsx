'use client';

import { AnimatePresence, motion } from 'framer-motion';

interface MatchItem {
  id: string;
  name: string;
  company: string;
  offers: string[];
  needs: string[];
  affinity: number;
  reasons: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  matches: MatchItem[];
}

export function BestMatchesSheet({ open, onClose, matches }: Props) {
  function getInitials(name: string): string {
    const parts = (name ?? '').split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return (parts[0]?.[0] ?? '').toUpperCase();
    return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-40"
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl max-h-[85vh] overflow-y-auto"
          >
            <div className="p-6">
              {/* Drag handle */}
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6" />
              <h3 className="font-serif text-2xl font-bold text-foreground">Fale primeiro com</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Quem mais se encaixa no seu perfil nesta mesa.
              </p>

              <div className="mt-6 space-y-4">
                {(matches ?? []).map((match: MatchItem, idx: number) => (
                  <div key={match?.id ?? `match-${idx}`} className="bg-cream-light rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-full bg-cream-dark flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-wine">{getInitials(match?.name ?? '')}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-foreground text-sm">{match?.name ?? ''}</p>
                            <p className="text-xs text-muted-foreground">{match?.company ?? ''}</p>
                          </div>
                          <span className="font-serif text-2xl font-bold text-wine">{match?.affinity ?? 0}%</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {(match?.reasons ?? []).map((reason: string, i: number) => (
                            <span key={i} className="text-xs px-3 py-1 rounded-full bg-[#E3EDEC] text-wine font-medium">
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full mt-6 py-4 rounded-lg bg-card border border-gray-200 text-foreground font-semibold hover:bg-gray-50 transition-colors"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

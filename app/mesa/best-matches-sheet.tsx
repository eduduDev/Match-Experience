'use client';

import { AnimatePresence, motion } from 'framer-motion';

interface Reason {
  text: string;
  type: 'their-offer' | 'my-offer';
}

interface MatchItem {
  id: string;
  name: string;
  company: string;
  offers: string[];
  needs: string[];
  affinity: number;
  reasons: Reason[];
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
            animate={{ opacity: 0.55 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brown-dark z-40"
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl max-h-[85vh] overflow-y-auto shadow-lg"
          >
            <div className="p-6">
              {/* Drag handle */}
              <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-6" />

              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-amber">Suas conexões</p>
              <h3 className="font-serif text-2xl font-bold text-foreground mt-1">Com quem falar</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Todo mundo da sua mesa, do maior ao menor encaixe.
              </p>

              <div className="mt-6 space-y-4">
                {(matches ?? []).map((match: MatchItem, idx: number) => (
                  <div
                    key={match?.id ?? `match-${idx}`}
                    className="bg-cream-light rounded-xl p-4 border border-border"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-full bg-cream-dark text-brown-dark flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold">{getInitials(match?.name ?? '')}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-foreground text-sm truncate">{match?.name ?? ''}</p>
                            <p className="text-xs text-muted-foreground truncate">{match?.company ?? ''}</p>
                          </div>
                          <span className="font-serif text-2xl font-bold text-wine flex-shrink-0">{match?.affinity ?? 0}%</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {(match?.reasons ?? []).map((reason: Reason, i: number) => (
                            <span
                              key={i}
                              className={
                                reason?.type === 'my-offer'
                                  ? 'text-xs px-3 py-1 rounded-full bg-[#F7E9D8] text-[#7A4A20] font-medium'
                                  : 'text-xs px-3 py-1 rounded-full bg-[#E3EDEC] text-wine font-medium'
                              }
                            >
                              {reason?.text ?? ''}
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
                className="w-full mt-6 py-4 rounded-lg bg-card border border-border text-foreground font-semibold hover:bg-muted transition-colors"
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

export const CATEGORIES = [
  'Jurídico',
  'Gestão',
  'Marketing',
  'Finanças',
  'Tecnologia',
  'RH',
  'Design',
  'Logística',
  'Investimento',
] as const;

export type Category = (typeof CATEGORIES)[number];

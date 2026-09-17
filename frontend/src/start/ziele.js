import { ShoppingCart, PackageCheck, ClipboardCheck, Settings, Tv, Users } from 'lucide-react';

export const ZIELE = [
  { id: 'kasse', pfad: '/kasse', Icon: ShoppingCart },
  { id: 'belegen', pfad: '/belegen', Icon: PackageCheck },
  { id: 'ausgabe', pfad: '/ausgabe', Icon: ClipboardCheck },
  { id: 'verwaltung', pfad: '/admin', Icon: Settings },
  { id: 'tvAnzeige', pfad: '/tv', Icon: Tv },
  { id: 'kundenanzeige', pfad: '/kunde', Icon: Users },
];

import { ShoppingCart, PackageCheck, ClipboardCheck, Settings, Tv, Users } from 'lucide-react';

export const ZIELE = [
  { beschriftung: 'Kasse', pfad: '/kasse', Icon: ShoppingCart },
  { beschriftung: 'Belegen', pfad: '/belegen', Icon: PackageCheck },
  { beschriftung: 'Ausgabe', pfad: '/ausgabe', Icon: ClipboardCheck },
  { beschriftung: 'Verwaltung', pfad: '/admin', Icon: Settings },
  { beschriftung: 'TV-Anzeige', pfad: '/tv', Icon: Tv },
  { beschriftung: 'Kundenanzeige', pfad: '/kunde', Icon: Users },
];

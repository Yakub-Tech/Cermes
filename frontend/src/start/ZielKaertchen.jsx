import { useNavigate } from 'react-router-dom';

export default function ZielKaertchen({ label, Icon, pfad }) {
  const navigiere = useNavigate();

  return (
    <button
      onClick={() => navigiere(pfad)}
      className="putz-textur-hell flex w-64 cursor-pointer flex-col items-center gap-4 rounded-[24px] border border-linie bg-flaeche p-8 text-center shadow-[0_2px_5px_rgba(0,0,0,0.18)] active:scale-[0.98]"
    >
      <Icon className="h-12 w-12 text-navy" strokeWidth={1.5} />
      <span className="font-display text-2xl text-navy">{label}</span>
    </button>
  );
}

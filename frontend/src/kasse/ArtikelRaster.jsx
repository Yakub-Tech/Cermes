import ArtikelKachel from './ArtikelKachel.jsx';

export default function ArtikelRaster({ artikelListe, sprache, texte, laeuft, ladefehler, onTippen, onSonderwunsch, onAusverkauft }) {
  return (
    <div className="grid min-w-0 flex-1 auto-rows-min grid-cols-2 gap-4 overflow-y-auto p-4 md:grid-cols-3 xl:grid-cols-4">
      {artikelListe.map((artikel) => (
        <ArtikelKachel key={artikel.id} artikel={artikel} sprache={sprache} texte={texte} laeuft={laeuft}
          onTippen={onTippen} onSonderwunsch={onSonderwunsch} onAusverkauft={onAusverkauft} />
      ))}
      {artikelListe.length === 0 && !ladefehler && (
        <p className="col-span-full p-4 text-schrift-gedimmt">
          {texte.keineArtikel}
        </p>
      )}
    </div>
  );
}

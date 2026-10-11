export default function WerbeSlot({ bild }) {
  return (
    <div className="flex flex-1 items-center justify-center p-2">
      <img key={bild.id} src={bild.url} alt="Werbung"
        className="einblenden max-h-full max-w-full rounded-xl border border-schrift/25 object-contain" />
    </div>
  );
}

export default function Flagge({ land }) {
  if (land === 'tr') {
    return (
      <svg viewBox="0 0 30 20" className="h-4 w-6 rounded-sm" aria-hidden="true">
        <rect width="30" height="20" fill="#e30a17" />
        <circle cx="11" cy="10" r="5" fill="#fff" />
        <circle cx="12.5" cy="10" r="4" fill="#e30a17" />
        <polygon fill="#fff" points="17.5,6.5 18.4,9.2 21.2,9.2 19,10.9 19.8,13.6 17.5,11.9 15.2,13.6 16,10.9 13.8,9.2 16.6,9.2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 30 20" className="h-4 w-6 rounded-sm" aria-hidden="true">
      <rect width="30" height="6.67" y="0" fill="#000000" />
      <rect width="30" height="6.67" y="6.67" fill="#dd0000" />
      <rect width="30" height="6.67" y="13.33" fill="#ffce00" />
    </svg>
  );
}

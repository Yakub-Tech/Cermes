import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import './design/theme.css';
import { apiGet } from './api.js';
import LoginSeite from './anmeldung/LoginSeite.jsx';
import Ersteinrichtung from './anmeldung/Ersteinrichtung.jsx';
import KasseSeite from './kasse/KasseSeite.jsx';
import AusgabeSeite from './ausgabe/AusgabeSeite.jsx';
import BelegenSeite from './belegen/BelegenSeite.jsx';
import TvSeite from './tv/TvSeite.jsx';
import KundeSeite from './kunde/KundeSeite.jsx';
import AdminLayout from './admin/AdminLayout.jsx';
import StartSeite from './start/StartSeite.jsx';

function App() {
  const [laedt, setLaedt] = useState(true);
  const standort = useLocation();
  const navigiere = useNavigate();

  useEffect(() => {
    apiGet('/api/ersteinrichtung').then(({ noetig }) => {
      if (noetig && standort.pathname !== '/einrichtung') {
        navigiere('/einrichtung', { replace: true });
      }
      setLaedt(false);
    }).catch(() => setLaedt(false));
  }, []);

  if (laedt) return null;

  return (
    <>
      <Routes>
        <Route path="/" element={<StartSeite />} />
        <Route path="/einrichtung" element={<Ersteinrichtung />} />
        <Route path="/login/:ansicht" element={<LoginSeite />} />
        <Route path="/kasse" element={<KasseSeite />} />
        <Route path="/ausgabe" element={<AusgabeSeite />} />
        <Route path="/belegen" element={<BelegenSeite />} />
        <Route path="/tv" element={<TvSeite />} />
        <Route path="/kunde" element={<KundeSeite />} />
        <Route path="/admin/*" element={<AdminLayout />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

createRoot(document.getElementById('wurzel')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

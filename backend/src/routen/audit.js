import express from 'express';
import { oeffneDatenbank } from '../db.js';
import { brauchtRolle } from '../auth.js';
import { leseAuditSeite, leseBenutzerListe } from '../auditLesen.js';

const router = express.Router();

router.get('/api/audit', brauchtRolle('admin'), (anfrage, antwort) => {
  try {
    antwort.json(leseAuditSeite(oeffneDatenbank(), anfrage.query));
  } catch (fehler) {
    antwort.status(fehler.status || 500).json({ fehler: fehler.message });
  }
});

router.get('/api/audit/benutzer', brauchtRolle('admin'), (_anfrage, antwort) => {
  antwort.json(leseBenutzerListe(oeffneDatenbank()));
});

export default router;

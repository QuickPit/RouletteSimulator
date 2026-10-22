# Roulette

Ein europäischer Roulette-Kessel als Webseite. Nach einem Tipp auf **Start** dreht sich der
Teller, die Kugel wird eingeworfen und fällt nach einigen Sekunden in ein Fach. Die
gezogene Zahl erscheint groß in ihrer Farbe; die letzten 20 Ziehungen stehen auf einer
Anzeigetafel wie im Casino (Rot links, Zero Mitte, Schwarz rechts).

Optimiert für das iPad im Querformat. Über „Teilen → Zum Home-Bildschirm“ läuft die Seite
im Vollbild.

## Zufall

Die Gewinnzahl wird beim Druck auf „Start“ mit `crypto.getRandomValues()` gezogen, dem
kryptografisch sicheren Zufallsgenerator des Browsers. Rejection Sampling verhindert
einen Modulo-Bias, sodass jede der 37 Zahlen exakt gleich wahrscheinlich ist. Die
Animation wird anschließend so berechnet, dass die Kugel genau im gezogenen Fach landet –
die Optik hat keinen Einfluss auf das Ergebnis.

## Einstellungen (Zahnrad)

- **Drehdauer:** 4–15 Sekunden (Standard 8 s)
- **Geräusche:** Rollen und Klacken der Kugel (Standard aus)
- **Ansage:** „Rien ne va plus“ und die Gewinnzahl per Sprachausgabe (Standard aus)

Die Einstellungen merkt sich der Browser; die Ziehungen werden nicht gespeichert.

## Entwicklung

Reines HTML, CSS und JavaScript (ES-Module) – ohne Build-Schritt und ohne Abhängigkeiten.

```sh
npm start   # lokaler Server auf http://localhost:8000
npm test    # Unit-Tests mit node --test (Node ≥ 20)
```

| Datei | Inhalt |
| --- | --- |
| `js/numbers.js` | Kessel-Reihenfolge, Farben, Begriffe |
| `js/rng.js` | sichere, gleichverteilte Ziehung |
| `js/motion.js` | Bewegungsmodell von Teller und Kugel (ohne DOM, getestet) |
| `js/wheel.js` | SVG-Kessel und Darstellung |
| `js/sound.js` | optionale Geräusche (Web Audio) und Ansage |
| `js/main.js` | Ablauf, Ergebnis, Verlauf, Einstellungen |

## Veröffentlichung

Der Workflow `.github/workflows/pages.yml` testet bei jedem Push auf `main` und
veröffentlicht die Seite auf GitHub Pages. Einmalig nötig: in den Repository-Einstellungen
unter **Settings → Pages → Build and deployment → Source** „GitHub Actions“ auswählen.

Die Schrift *Playfair Display* steht unter der SIL Open Font License (`assets/fonts/OFL.txt`).

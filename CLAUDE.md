# CLAUDE.md – NHF Regelverk App

## Prosjektoversikt

Dette er en HTML-portal for å vise offisielle regler og konkurranseregler for NHF (Norges Hesteskokasterforbund).

## Teknisk stack

- Ren HTML5 + vanilla JavaScript + CSS
- CSS custom properties for theming og dark mode
- Responsivt design, mobilvennlig
- Fonter: Playfair Display (overskrifter) + Source Sans 3 (brødtekst)

## Hovedfiler

| Fil | Innhold |
|-----|---------|
| `index.html` | HTML-portal for regelverk |
| `reglar.json` | Offisielt regeldokument (konvertert frå word) |
| `edit.html` | Med redigeringsfunksjonalitet |

## Generelle retningslinjer

- Ikke legg til funksjonalitet som ikke er etterspurt
- Foretrekk å redigere eksisterende filer fremfor å lage nye
- Spør før du gjør destruktive endringer

## Kodekvalitet
- Skriv DRY-kode (Don't Repeat Yourself) — trekk ut gjenbrukbar logikk i funksjonar/modular
- Kvar funksjon skal ha éitt ansvar (Single Responsibility Principle)
- Gjenbruk eksisterande hjelpefunksjonar framfor å skrive ny kode som gjer det same
- Før du skriv ny kode: sjekk om tilsvarande logikk allereie finst i kodebasen

## Struktur
- Legg delt logikk i `src/utils/` eller tilsvarande delt modul
- Bruk arv/komposisjon/mixins framfor copy-paste av åtferd

# ADR 0002 — Socle technique

Date : 2026-11-23 · État : acceptée

## Décision

TypeScript strict partout ; React pour l’interface ; PixiJS pour la cellule et la carte ; Supabase pour la base, les comptes et les fonctions serveur ; Cloudflare Pages pour l’hébergement ; pnpm en espaces de travail ; Vitest, fast-check, Playwright pour les tests.

## Pourquoi

React est ce que les agents maîtrisent le mieux ; PixiJS est fluide sur téléphone ; Supabase évite de construire comptes et temps réel ; Cloudflare Pages donne une préversion par PR.

## Conséquences

Toute autre bibliothèque demande une nouvelle ADR. Supabase est gratuit au départ ; le passage au payant demande l’accord du propriétaire.

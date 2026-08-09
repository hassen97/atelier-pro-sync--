# RepairPro Tn

Crée une application web complète, professionnelle et intelligente pour un atelier de réparation de téléphones en Tunisie.

L’application doit être entièrement fonctionnelle, sécurisée, responsive (mobile + desktop) et en langue française.

La monnaie doit être TND (Dinar Tunisien).

Le système doit supporter un mode hybride avec sauvegarde locale + cloud via Supabase.

🔐 Admin Panel & Super Admin

Tableau de bord administrateur

Gestion complète des utilisateurs (créer, modifier, supprimer)

Rôles : Super Admin, Admin, Employé, Manager

Contrôle des accès par module

Historique des connexions

Journal d’activité (audit log)

Paramètres système :

Nom du magasin

Logo

Devise (TND)

Taxes

Seuils d’alerte stock

Sauvegarde et restauration des données

💾 Sauvegarde Hybride (Local + Supabase)
Sauvegarde Locale

Export complet de la base de données en local

Formats : SQL, JSON ou ZIP

Bouton manuel “Sauvegarder maintenant”

Sauvegardes locales automatiques planifiées

Restauration depuis fichier local

Sauvegarde Cloud (Supabase)

Synchronisation automatique avec Supabase

Sauvegardes cloud programmées

Historique des sauvegardes cloud

Restauration depuis Supabase

Sécurité & Mode Hybride

Chiffrement des sauvegardes

Accès réservé au Super Admin

Logs backup/restauration

Fonctionnement hors ligne

Synchronisation automatique quand internet revient

Gestion des conflits de données

🧾 Point de Vente (POS)

Interface POS rapide

Recherche produits

Panier

Calcul automatique

Paiement (espèces, autres)

Génération de reçu

Déduction automatique du stock

📦 Gestion du Stock (Inventory)

Produits, pièces, téléphones, accessoires

Quantité

Coût d’achat

Prix de vente

Catégories

Alertes stock faible

Historique des mouvements

🏭 Fournisseurs & Dettes Fournisseurs

Fiches fournisseurs

Historique des achats

Montants dus

Paiements partiels

État des comptes fournisseurs

Suivi des dettes fournisseurs

👥 Gestion des Clients

Fiches clients

Nom, téléphone, email (optionnel)

Historique des réparations

Historique des achats

Solde client

💳 Dettes Clients (Crédit Client)

Ventes à crédit

Réparations à crédit

Montant dû par client

Paiements partiels

Historique des paiements

Liste des clients débiteurs

🛠 Gestion des Réparations (Repair Tracking Avancé)

Création de fiches réparation

Infos client

Modèle téléphone + IMEI (optionnel)

Problème déclaré

Diagnostic

Pièces utilisées (liées au stock)

Main d’œuvre

Statuts : En attente, En cours, Terminé, Livré

Dates dépôt / livraison

Coût total réparation

Paiement complet ou partiel

Lien avec dette client si non payé

💸 Dépenses

Dépenses fixes & variables

Catégories

Fournisseur lié

Date & montant

📊 Profit & Comptabilité Simplifiée

Chiffre d’affaires

Dépenses totales

Bénéfice net

Marge par produit

Marge par réparation

🏆 Meilleures Ventes & Statistiques

Produit le plus vendu

Top produits

Filtres par période personnalisée

Graphiques dynamiques

🧾 Factures & Exports

Factures clients

Export PDF

Export Excel

Historique des factures

📈 Tableau de Bord (Dashboard)

KPIs :

Ventes

Réparations

Dépenses

Profit

Dettes clients

Dettes fournisseurs

Alertes importantes

🎨 Design & UX

Moderne et professionnel

Facile pour atelier

Mobile friendly (Android)

Mode clair + sombre

🎯 Objectif Business

Créer un système intelligent tout-en-un pour gérer un atelier de réparation de téléphones : stock, ventes, réparations, clients, fournisseurs, dettes, dépenses, profit, facturation, sauvegarde hybride et statistiques, afin d’augmenter la rentabilité et d’avoir un contrôle total sur l’activité.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://atelier-pro-syncc.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/79108524-59b0-41fb-97e6-66bc6988a520).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

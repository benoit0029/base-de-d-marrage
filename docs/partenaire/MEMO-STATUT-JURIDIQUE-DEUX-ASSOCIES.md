# Kerbooth 360° — Statut à deux : mémo (à réactiver plus tard)

> Ne s'applique pas aujourd'hui : tu démarres seul sur ta micro-entreprise —
> tant que c'est le cas, aucune société de fait n'est possible et aucun
> choix de statut n'est à faire. Ce mémo redevient utile **le jour où le
> partenaire crée sa propre micro-entreprise**, pas avant.
>
> Ne remplace pas un avis professionnel (comptable, juriste) — voir la
> checklist en bas.

Version en ligne (mise en forme) : https://claude.ai/artifact/Jgeg2YHCeS8fCbABKZqE9T

---

## 1. Avis sur le document juridique/TVA reçu le 22/09/2026

Le document tient la route. Les sources citées (Legalstart, LegalPlace,
impots.gouv.fr, Bpifrance Création) sont fiables, les taux et seuils
correspondent au droit français actuel (IS à 15 % jusqu'à 42 500 €,
franchise TVA à 37 500 € pour les prestations de service, engagement de
2 ans pour l'option TVA), et le raisonnement est cohérent d'une section à
l'autre. Rien à corriger sur le fond.

## 2. Le point le plus important : deux risques distincts

- **Société créée de fait** — si vous vous comportez comme des associés
  (moyens communs, partage des bénéfices), vos deux micro-entreprises
  peuvent être requalifiées collectivement : responsabilité illimitée et
  solidaire pour tous les deux, y compris sur les dettes de l'autre.
- **Facture de complaisance** — plus grave : si l'un facture une
  prestation réellement réalisée par l'autre (ex. alterner "pour équilibrer
  le CA en fin d'année"), c'est une fausse facture au sens pénal. Ce n'est
  plus un risque de statut, c'est un risque de fraude fiscale.

**Conséquence pour l'appli compta** : qui facture une réservation doit être
qui l'a réellement réalisée — jamais une rotation ou un calcul
d'équilibrage. L'assignation d'une réservation suit la réalité
opérationnelle (qui est dispo, qui installe le matériel ce jour-là), et
l'appli du bon partenaire facture en conséquence.

## 3. 2 micro-BIC vs SAS — l'essentiel

| Critère | 2 micro-BIC séparées | SAS commune |
|---|---|---|
| Responsabilité | Illimitée sur son activité propre — risque croisé si requalification | Limitée aux apports |
| Impôt | IR, sur son propre CA | IS : 15 % jusqu'à 42 500 €, puis 25 % |
| Rémunération | 21,2 % du CA encaissé | Salaire : ~75-82 % de charges. Dividendes : ~30 % flat tax, mais aucune retraite validée |
| Coût comptable | Quasi nul | Bilan + liasse fiscale — à chiffrer avec Cerfrance |
| Partage du CA | Chacun garde ce qu'il facture | Réparti par les statuts (parts sociales) |

## 4. TVA — l'arbitrage

Option volontaire possible dès sous les seuils, engagement 2 ans minimum.
Sur l'investissement matériel (~4 818 € TTC), ~800 € de TVA récupérable.
Mais côté clients particuliers (mariages, anniversaires) qui ne récupèrent
pas la TVA, facturer avec TVA les rend 20 % plus chers — seuls les clients
pro (MSA, grande distribution) sont neutres à la TVA.

**À chiffrer avec Cerfrance** : la proportion réelle particuliers /
professionnels dans le CA prévisionnel des 2 premières années détermine si
le gain sur le matériel compense la perte de compétitivité pendant 2 ans.

## 5. Infrastructure — décisions déjà prises

- **Même VPS possible, jamais la même appli/base de données.** Deux stacks
  Docker totalement séparées, même si hébergées sur la même machine —
  voir `GUIDE-DEPLOIEMENT-PARTENAIRE.md` dans ce zip. Mélanger vos deux
  comptabilités dans le même outil serait justement le genre de "mise en
  commun de moyens" qui nourrit le risque de société de fait (section 2).
- **Boîte mail du partenaire sur `kerbooth360.fr`** (domaine partagé de la
  marque, géré par Benoît sur Hostinger), jamais sur `kalonia.fr` (domaine
  personnel de Benoît). **Abonnement mail indépendant côté partenaire**
  (son propre compte/sa propre facturation) — Benoît ajoute seulement les
  enregistrements DNS (MX/SPF/DKIM) dans la zone DNS qu'il administre,
  sans jamais avoir accès à la boîte mail elle-même.
- **Code prêt** : archive du code actuel (commit bd2911c, 23/09/2026)
  incluse dans ce même zip (`code-source/`), avec son guide de déploiement.

## 6. Ce qu'il reste à faire — seulement quand le partenaire crée sa micro

- [ ] Rendez-vous Cerfrance + idéalement un juriste, pour valider le
      montage exact (2 micro-BIC vs SAS vs SEP) avant toute décision.
- [ ] Faire chiffrer par Cerfrance le coût comptable réel d'une SAS à votre
      échelle de CA (20-40 k€/an visés).
- [ ] Clarifier la situation du partenaire : emploi actuel, couverture
      sociale par ailleurs.
- [ ] Estimer la proportion clients particuliers vs professionnels
      attendue, pour trancher l'option TVA.
- [ ] Écrire une convention de répartition des rôles (qui facture quoi,
      sur quels critères réels — jamais une rotation d'équilibrage).
- [ ] Déployer l'appli compta du partenaire (voir
      `GUIDE-DEPLOIEMENT-PARTENAIRE.md`), lui ouvrir sa boîte mail
      `kerbooth360.fr`, dupliquer les workflows n8n Kerbooth avec ses
      propres accès Stripe/Yousign.

## Sources (document original du 22/09/2026)

- Société créée de fait : legalstart.fr, legalplace.fr, creerentreprise.fr, gdroit.fr
- Régime social président SAS : swim.legal, legalplace.fr, bpifrance-creation.fr
- Taux IS 2026 : legalstart.fr, compta-online.com
- TVA micro-entreprise et option volontaire : impots.gouv.fr, l-expert-comptable.com, socic.fr

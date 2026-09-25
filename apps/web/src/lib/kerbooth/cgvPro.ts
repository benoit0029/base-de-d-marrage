// Conditions générales de location aux PROFESSIONNELS — Kerbooth 360°
// (D-161, D-163). Annexées au contrat de location envoyé avec chaque devis
// entreprise. Rédigées le 25/09/2026 à la demande de Benoît, chaque règle
// sourcée (sites secondaires citant Légifrance — voir la copie lisible
// kerbooth360/documents/cgv-professionnels.md, à garder identique).
// Passer CGV_PRO_VALIDATED à false remet la mention « PROJET » sur le PDF.
//
// Les CGV du site kerbooth360.fr (particuliers) ne sont pas modifiées.

export const CGV_PRO_VALIDATED = true;

export const CGV_PRO_TITLE = "Conditions générales de location — clients professionnels";

export const CGV_PRO_ARTICLES: Array<{ title: string; text: string }> = [
  {
    title: "Article 1 — Objet et champ d'application",
    text:
      "Les présentes conditions régissent la location, sans animation ni présence du Loueur pendant l'usage, " +
      "d'un ou plusieurs photobooths 360° à des clients professionnels (entreprises, associations, collectivités) " +
      "agissant pour les besoins de leur activité. Elles prévalent sur les conditions d'achat du Client, sauf " +
      "accord écrit contraire. Les conditions générales de vente du site kerbooth360.fr, réservées aux " +
      "particuliers, ne s'appliquent pas.",
  },
  {
    title: "Article 2 — Devis et commande",
    text:
      "Chaque location fait l'objet d'un devis personnalisé, valable 15 jours à compter de son envoi. Le matériel " +
      "est réservé pour le Client pendant cette durée. La commande devient ferme à la signature électronique " +
      "(Yousign) du devis et du contrat de location. Sans signature dans le délai de validité, le devis devient " +
      "caduc et la réservation du matériel est libérée.",
  },
  {
    title: "Article 3 — Prix",
    text:
      "Les prix sont ceux du devis signé, en euros. Tant que le Loueur bénéficie de la franchise en base, la TVA " +
      "n'est pas applicable (art. 293 B du CGI). Les frais de livraison hors zone, s'il y en a, figurent sur le devis. " +
      "Aucune remise, ristourne ou réduction n'est accordée en dehors de celles figurant sur le devis.",
  },
  {
    title: "Article 4 — Facturation et paiement",
    text:
      "La facture est émise à la signature du devis et du contrat. Elle est payable par virement sur le compte " +
      "indiqué sur la facture, au plus tard à la date d'échéance qui y figure. Aucun escompte n'est accordé pour " +
      "paiement anticipé. Tout retard de paiement entraîne de plein droit, dès le lendemain de l'échéance et sans " +
      "rappel préalable, des pénalités de retard égales à trois fois le taux d'intérêt légal en vigueur, ainsi " +
      "qu'une indemnité forfaitaire pour frais de recouvrement de 40 € par facture (art. L441-10 et D441-5 du Code " +
      "de commerce) ; une " +
      "indemnité complémentaire peut être demandée sur justificatif si les frais de recouvrement exposés sont " +
      "supérieurs. En cas d'impayé, le Loueur peut suspendre toute autre prestation prévue pour le Client.",
  },
  {
    title: "Article 5 — Annulation et report",
    text:
      "Après signature, une annulation par le Client ne donne lieu à aucun remboursement : le prix reste dû en " +
      "totalité, quelle que soit la date d'annulation. Un report de date peut être accepté par le Loueur, sous " +
      "réserve de disponibilité du matériel. En cas d'annulation à l'initiative du Loueur (panne, indisponibilité " +
      "imprévue), les sommes versées par le Client lui sont intégralement remboursées, sans autre indemnité.",
  },
  {
    title: "Article 6 — Livraison, installation et récupération",
    text:
      "Le Loueur livre et installe le matériel au lieu indiqué au contrat avant le début de chaque prestation, " +
      "et le récupère à la fin. Le Client garantit un accès praticable pour le transport du matériel, un espace " +
      "adapté et une prise électrique à proximité. Le Client ou son représentant est présent à la livraison et à " +
      "la récupération pour l'état des lieux contradictoire.",
  },
  {
    title: "Article 7 — Dépôt de garantie et nettoyage",
    text:
      "Un chèque de caution de 1 500 € par photobooth est remis au Loueur à la livraison et restitué à la " +
      "récupération du matériel en bon état. En cas de dégradation, de perte ou de vol constaté à l'état des " +
      "lieux de sortie, le Loueur peut encaisser la caution à hauteur du coût de réparation ou de remplacement, " +
      "sur justificatif. Un nettoyage anormal est facturé 150 € minimum, dans la limite du montant de la caution.",
  },
  {
    title: "Article 8 — Garde du matériel, responsabilité et assurance",
    text:
      "De la livraison à la récupération, le Client a la garde du matériel et répond des dégradations et pertes " +
      "survenues pendant la location, sauf à prouver qu'elles ont eu lieu sans sa faute (art. 1732 du Code civil). " +
      "Le Client assure le matériel confié et sa responsabilité de locataire, y compris l'usage par ses invités. " +
      "Le Loueur est couvert par une assurance responsabilité civile professionnelle. Sauf faute lourde ou " +
      "dolosive, la responsabilité du Loueur est limitée au prix de la prestation concernée et exclut les " +
      "dommages indirects (perte d'exploitation, atteinte à l'image).",
  },
  {
    title: "Article 9 — Utilisation",
    text:
      "Le matériel est utilisé conformément aux consignes remises à l'installation. Il ne doit pas être déplacé, " +
      "démonté ni exposé à la pluie ou à l'humidité. Toute panne est signalée sans délai au Loueur.",
  },
  {
    title: "Article 10 — Images et données personnelles",
    text:
      "En tant qu'organisateur de l'événement, le Client informe ses invités de la prise de photos et vidéos et " +
      "de leur utilisation, à l'aide de l'affichage fourni par le Loueur. Les données sont traitées conformément " +
      "à la politique de confidentialité de Kerbooth 360° (kerbooth360.fr).",
  },
  {
    title: "Article 11 — Force majeure",
    text:
      "Aucune des parties n'est responsable d'un manquement causé par un cas de force majeure au sens de " +
      "l'article 1218 du Code civil. La prestation empêchée est reportée d'un commun accord ou, à défaut, " +
      "annulée et les sommes versées remboursées.",
  },
  {
    title: "Article 12 — Droit applicable et litiges",
    text:
      "Les présentes conditions sont soumises au droit français. Les parties recherchent une solution amiable " +
      "avant toute action. À défaut, le litige est porté devant la juridiction compétente selon les règles de " +
      "droit commun.",
  },
];

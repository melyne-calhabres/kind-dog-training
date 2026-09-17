// Auteur et publisher centralisés — utilisés par le JSON-LD des articles
// pour renforcer les signaux E-E-A-T (identité auteur reliée à l'organisation
// et à des profils tiers vérifiables).

export function getPublisherOrganization(siteUrl: string) {
  return {
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: 'Kind Dog Training',
    url: siteUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${siteUrl}/images/logo.png`,
    },
    sameAs: [
      'https://www.instagram.com/kind_dog_training/',
      'https://share.google/poUDnO7iW9wDW4Om7',
    ],
  };
}

export function getAuthorPerson(siteUrl: string) {
  return {
    '@type': 'Person',
    '@id': `${siteUrl}/qui-suis-je/#person`,
    name: 'Mélyne',
    url: `${siteUrl}/qui-suis-je/`,
    image: `${siteUrl}/images/melyne-auteur.webp`,
    jobTitle: 'Éducatrice & comportementaliste canin',
    description:
      "Passionnée par la relation entre l'humain et le chien, j'accompagne les propriétaires dans l'éducation et la rééducation de leur chien, quelle que soit la problématique.",
    knowsAbout: [
      'Éducation canine',
      'Comportement canin',
      'Réactivité canine',
      'Agressivité canine',
      'Éducation du chiot',
      'Gestion des émotions du chien',
      'Rééducation comportementale',
      'Socialisation canine',
    ],
    hasCredential: {
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'certification',
      name: 'ACACED (Attestation de Connaissances pour les Animaux de Compagnie d\'Espèces Domestiques)',
    },
    sameAs: [
      'https://www.instagram.com/kind_dog_training/',
      'https://share.google/poUDnO7iW9wDW4Om7',
    ],
    worksFor: { '@id': `${siteUrl}/#organization` },
    areaServed: {
      '@type': 'AdministrativeArea',
      name: 'Bordeaux Métropole',
    },
  };
}

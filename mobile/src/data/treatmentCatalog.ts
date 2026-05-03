export type TreatmentCatalogSection = {
  category: string;
  icon: string;
  treatments: string[];
};

export const treatmentCatalog: TreatmentCatalogSection[] = [
  {
    category: 'MANICURE',
    icon: 'hand-left-outline',
    treatments: [
      'Manicure dry con smalto',
      'Manicure dry con trattamento SPA',
      'Semipermanente',
      'Copertura in gel',
      'Ricostruzione',
    ],
  },
  {
    category: 'PEDICURE',
    icon: 'footsteps-outline',
    treatments: [
      'Pedicure estetico',
      'Pedicure curativo',
      'Trattamento SPA Pedicure',
    ],
  },
  {
    category: 'EPILAZIONE',
    icon: 'sparkles-outline',
    treatments: [
      'Ceretta completa',
      'Ceretta zona piccola',
      'Ceretta zona grande',
      'Filo arabo',
      'Cera brasiliana',
    ],
  },
  {
    category: 'LAMINAZIONE',
    icon: 'eye-outline',
    treatments: [
      'Laminazione ciglia',
      'Laminazione sopracciglia',
      'Combo',
    ],
  },
  {
    category: 'SOPRACCIGLIA',
    icon: 'color-wand-outline',
    treatments: ['Tinta', 'Henne', 'Microblading'],
  },
  {
    category: 'TRATTAMENTI VISO',
    icon: 'happy-outline',
    treatments: [
      'Massaggio',
      'Tratt. Viso base',
      'Pulizia viso base',
      'Tratt. avanzati',
    ],
  },
  {
    category: 'TRATTAMENTI CORPO',
    icon: 'body-outline',
    treatments: [
      'Tratt. Corpo base',
      'Massaggio (Rilassante, Decontratturante, Linfodrenante, Anticellulite)',
      'Scrub corpo total',
      'Peeling corpo acidi',
    ],
  },
  {
    category: 'MACCHINARI',
    icon: 'radio-outline',
    treatments: [
      'Laser',
      'Radiofrequenza viso/corpo',
      'Pressoterapia',
      'Ultrasuoni',
      'Microdermoabrasione',
      'Ossigenoterapia',
    ],
  },
];

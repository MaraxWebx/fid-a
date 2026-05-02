export const upcomingBooking = {
  service: 'Hydra Glow Facial',
  specialist: 'Martina',
  dateLabel: 'Sabato 3 Maggio',
  timeLabel: '14:30',
};

export const clientCenters = [
  {
    id: 'center-1',
    name: 'Fidèa Beauty Studio',
    area: 'Milano Centro',
    distance: '0.8 km',
    tag: 'Glow and skincare',
  },
  {
    id: 'center-2',
    name: 'Maison Nude Lab',
    area: 'Porta Romana',
    distance: '1.9 km',
    tag: 'Nails and brows',
  },
  {
    id: 'center-3',
    name: 'Atelier Soft Skin',
    area: 'Brera',
    distance: '2.4 km',
    tag: 'Trattamenti premium',
  },
];

export const featuredServices = [
  {
    id: 'service-1',
    name: 'Hydra Glow Facial',
    duration: '50 min',
    price: 'EUR 75',
    description: 'Pulizia profonda, glow immediato e trattamento idratante premium.',
  },
  {
    id: 'service-2',
    name: 'Manicure Premium',
    duration: '45 min',
    price: 'EUR 38',
    description: 'Rituale mani completo con definizione forma, cuticole e finish gloss.',
  },
  {
    id: 'service-3',
    name: 'Brow Design',
    duration: '30 min',
    price: 'EUR 28',
    description: 'Analisi sopracciglia, definizione arco e styling naturale.',
  },
];

export const todayOverview = [
  {
    id: 'metric-1',
    label: 'Appuntamenti oggi',
    value: '12',
  },
  {
    id: 'metric-2',
    label: 'Slot liberi',
    value: '5',
  },
  {
    id: 'metric-3',
    label: 'Clienti nuovi',
    value: '3',
  },
];

export const clientHomeStats = [
  {
    id: 'client-metric-1',
    label: 'Prenotazioni attive',
    value: '2',
  },
  {
    id: 'client-metric-2',
    label: 'Centri salvati',
    value: '3',
  },
  {
    id: 'client-metric-3',
    label: 'Trattamenti fatti',
    value: '14',
  },
];

export const loyaltyOverview = {
  points: 240,
  reward: 'un trattamento express sbloccabile',
};

export const bookingOperators = [
  {
    id: 'operator-1',
    name: 'Martina',
    skill: 'Skincare specialist',
  },
  {
    id: 'operator-2',
    name: 'Elisa',
    skill: 'Nails and beauty routine',
  },
  {
    id: 'operator-3',
    name: 'Sara',
    skill: 'Brows and finishing touch',
  },
];

export const bookingSlots = [
  {
    id: 'slot-1',
    dateLabel: 'Sabato 3 Maggio',
    timeLabel: '14:30',
    availabilityLabel: 'Disponibile ora',
  },
  {
    id: 'slot-2',
    dateLabel: 'Sabato 3 Maggio',
    timeLabel: '16:00',
    availabilityLabel: 'Ultimo slot',
  },
  {
    id: 'slot-3',
    dateLabel: 'Domenica 4 Maggio',
    timeLabel: '10:15',
    availabilityLabel: 'Operatore preferito disponibile',
  },
];

export const demoAppointments = [
  {
    id: 'booking-1',
    service: 'Hydra Glow Facial',
    operator: 'Martina',
    dateLabel: 'Sabato 3 Maggio',
    timeLabel: '14:30',
    statusLabel: 'Confermato',
    price: 'EUR 75',
  },
  {
    id: 'booking-2',
    service: 'Manicure Premium',
    operator: 'Elisa',
    dateLabel: 'Martedi 6 Maggio',
    timeLabel: '11:00',
    statusLabel: 'Confermato',
    price: 'EUR 38',
  },
  {
    id: 'booking-3',
    service: 'Brow Design',
    operator: 'Sara',
    dateLabel: 'Giovedi 24 Aprile',
    timeLabel: '18:15',
    statusLabel: 'Completato',
    price: 'EUR 28',
  },
];

export const clientProfile = {
  name: 'Giulia Rossi',
  phone: '+39 333 111 2222',
  email: 'giulia.rossi@example.com',
  preferredCenter: 'Fidèa Beauty Studio',
  beautyNotes: 'Predilige trattamenti viso il sabato pomeriggio.',
};

export const centerSchedule = [
  {
    id: 'schedule-1',
    timeLabel: '09:30',
    clientName: 'Giulia R.',
    operatorName: 'Martina',
    service: 'Hydra Glow Facial',
    statusLabel: 'in arrivo',
  },
  {
    id: 'schedule-2',
    timeLabel: '11:00',
    clientName: 'Alessia P.',
    operatorName: 'Elisa',
    service: 'Manicure Premium',
    statusLabel: 'confermato',
  },
  {
    id: 'schedule-3',
    timeLabel: '15:45',
    clientName: 'Marta L.',
    operatorName: 'Sara',
    service: 'Brow Design',
    statusLabel: 'slot premium',
  },
];

export const centerCalendarDays = [
  { id: 'day-1', label: 'Lun 5', booked: 6, free: 4 },
  { id: 'day-2', label: 'Mar 6', booked: 8, free: 2 },
  { id: 'day-3', label: 'Mer 7', booked: 5, free: 5 },
  { id: 'day-4', label: 'Gio 8', booked: 7, free: 3 },
];

export const slotTemplates = [
  {
    id: 'template-1',
    label: '09:00 - 12:00',
    operator: 'Martina',
    type: 'Trattamenti viso',
    status: 'attivo',
  },
  {
    id: 'template-2',
    label: '13:00 - 17:00',
    operator: 'Elisa',
    type: 'Nails',
    status: '2 slot liberi',
  },
  {
    id: 'template-3',
    label: '17:00 - 19:00',
    operator: 'Sara',
    type: 'Brows express',
    status: 'manuale',
  },
];

export const crmPreview = [
  {
    id: 'client-1',
    name: 'Giulia Rossi',
    phone: '+39 333 111 2222',
    lastVisit: 'Ultima visita: 21 Apr',
    notes: 'Predilige fascia mattina e trattamenti viso.',
    bookings: 8,
  },
  {
    id: 'client-2',
    name: 'Alessia Pini',
    phone: '+39 333 555 9898',
    lastVisit: 'Ultima visita: 28 Apr',
    notes: 'Cliente ricorrente manicure premium.',
    bookings: 11,
  },
  {
    id: 'client-3',
    name: 'Marta Lodi',
    phone: '+39 334 222 8181',
    lastVisit: 'Ultima visita: 30 Apr',
    notes: 'Richiede reminder il giorno prima.',
    bookings: 4,
  },
];

export const centerSettings = {
  brandName: 'Fidèa Beauty Studio',
  location: 'Via Roma 18, Milano',
  coordinates: '45.4642, 9.1900',
  phone: '+39 02 5555 1000',
  logoStatus: 'Logo principale caricato',
  primaryColor: '#2F5D8C',
};

export const treatmentCatalogSections = [
  {
    id: 'catalog-1',
    title: 'Viso',
    detail: '3 trattamenti attivi',
  },
  {
    id: 'catalog-2',
    title: 'Mani',
    detail: '2 trattamenti attivi',
  },
  {
    id: 'catalog-3',
    title: 'Brows',
    detail: '1 trattamento attivo',
  },
];

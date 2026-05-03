import { MongoClient, ObjectId } from 'mongodb';

const mongoUri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'fidea';

if (!mongoUri) {
  console.error('Missing MONGODB_URI in environment.');
  process.exit(1);
}

const centerSeed = {
  email: 'centro@fidea.app',
  name: 'Fidea Beauty Studio',
  branding: {
    logo: 'https://placehold.co/512x512/png?text=Fidea',
  },
  opening_hours: {
    mon: { start: '09:00', end: '18:00' },
    tue: { start: '09:00', end: '18:00' },
    wed: { start: '09:00', end: '18:00' },
    thu: { start: '09:00', end: '19:00' },
    fri: { start: '09:00', end: '19:00' },
    sat: { start: '09:30', end: '17:00' },
    sun: { start: null, end: null },
  },
};

const serviceSeeds = [
  { name: 'Pulizia viso base', category: 'viso', subcategory: 'pulizia e base', duration: 60, price: 50, description: 'Trattamento base per detersione, riequilibrio e freschezza della pelle.', visibility: 'active' },
  { name: 'Pulizia viso profonda', category: 'viso', subcategory: 'pulizia e base', duration: 75, price: 65, description: 'Pulizia viso intensiva con focus su impurita e grana della pelle.', visibility: 'active' },
  { name: 'Trattamento idratante', category: 'viso', subcategory: 'pulizia e base', duration: 60, price: 60, description: 'Trattamento viso idratante per comfort, elasticita e luminosita.', visibility: 'active' },
  { name: 'Trattamento purificante', category: 'viso', subcategory: 'pulizia e base', duration: 60, price: 60, description: 'Protocollo purificante per pelli miste, lucide o impure.', visibility: 'active' },
  { name: 'Anti-age lifting', category: 'viso', subcategory: 'trattamenti specifici', duration: 75, price: 80, description: 'Trattamento viso rassodante con focus su tono e compattezza.', visibility: 'active' },
  { name: 'Trattamento illuminante', category: 'viso', subcategory: 'trattamenti specifici', duration: 60, price: 70, description: 'Percorso glow per uniformare l incarnato e ravvivare la pelle.', visibility: 'active' },
  { name: 'Trattamento pelli sensibili', category: 'viso', subcategory: 'trattamenti specifici', duration: 60, price: 65, description: 'Protocollo delicato per pelli sensibili, arrossate o reattive.', visibility: 'active' },
  { name: 'Radiofrequenza viso', category: 'viso', subcategory: 'tecnologie avanzate', duration: 45, price: 70, description: 'Tecnologia viso per tono, definizione e compattezza.', visibility: 'active' },
  { name: 'Microdermoabrasione', category: 'viso', subcategory: 'tecnologie avanzate', duration: 45, price: 65, description: 'Esfoliazione tecnologica per rinnovare la superficie cutanea.', visibility: 'active' },
  { name: 'Ossigenoterapia', category: 'viso', subcategory: 'tecnologie avanzate', duration: 60, price: 85, description: 'Trattamento viso ossigenante ad effetto luminosita immediata.', visibility: 'active' },
  { name: 'Massaggio rilassante', category: 'corpo', subcategory: 'massaggi', duration: 50, price: 60, description: 'Massaggio distensivo per relax generale e benessere profondo.', visibility: 'active' },
  { name: 'Massaggio decontratturante', category: 'corpo', subcategory: 'massaggi', duration: 50, price: 65, description: 'Massaggio mirato per sciogliere tensioni e rigidita muscolari.', visibility: 'active' },
  { name: 'Massaggio drenante', category: 'corpo', subcategory: 'massaggi', duration: 50, price: 65, description: 'Massaggio corpo orientato a drenaggio e leggerezza.', visibility: 'active' },
  { name: 'Trattamento anticellulite', category: 'corpo', subcategory: 'trattamenti corpo', duration: 60, price: 75, description: 'Trattamento corpo mirato agli inestetismi della cellulite.', visibility: 'active' },
  { name: 'Trattamento tonificante', category: 'corpo', subcategory: 'trattamenti corpo', duration: 60, price: 70, description: 'Protocollo tonificante per migliorare compattezza e texture.', visibility: 'active' },
  { name: 'Bendaggi drenanti', category: 'corpo', subcategory: 'trattamenti corpo', duration: 45, price: 55, description: 'Bendaggi corpo per drenaggio, leggerezza e comfort.', visibility: 'active' },
  { name: 'Pressoterapia', category: 'corpo', subcategory: 'tecnologie corpo', duration: 30, price: 40, description: 'Seduta di pressoterapia per drenaggio e benessere circolatorio.', visibility: 'active' },
  { name: 'Radiofrequenza corpo', category: 'corpo', subcategory: 'tecnologie corpo', duration: 60, price: 80, description: 'Tecnologia corpo per tono, compattezza e texture.', visibility: 'active' },
  { name: 'Manicure base', category: 'mani e piedi', subcategory: 'mani', duration: 30, price: 25, description: 'Manicure essenziale per ordine, pulizia e cura della mano.', visibility: 'active' },
  { name: 'Manicure con smalto', category: 'mani e piedi', subcategory: 'mani', duration: 45, price: 30, description: 'Manicure completa con applicazione smalto classico.', visibility: 'active' },
  { name: 'Semipermanente mani', category: 'mani e piedi', subcategory: 'mani', duration: 60, price: 40, description: 'Trattamento mani con colore semipermanente a lunga tenuta.', visibility: 'active' },
  { name: 'Ricostruzione unghie', category: 'mani e piedi', subcategory: 'mani', duration: 90, price: 70, description: 'Ricostruzione unghie con definizione forma e struttura.', visibility: 'active' },
  { name: 'Pedicure estetico', category: 'mani e piedi', subcategory: 'piedi', duration: 40, price: 35, description: 'Pedicure estetico per piedi curati e ordinati.', visibility: 'active' },
  { name: 'Pedicure curativo', category: 'mani e piedi', subcategory: 'piedi', duration: 60, price: 45, description: 'Pedicure approfondito con focus su comfort e benessere.', visibility: 'active' },
  { name: 'Semipermanente piedi', category: 'mani e piedi', subcategory: 'piedi', duration: 45, price: 40, description: 'Pedicure con colore semipermanente e finish duraturo.', visibility: 'active' },
  { name: 'Gambe complete', category: 'epilazione', subcategory: 'ceretta', duration: null, price: 40, description: 'Epilazione completa gambe.', visibility: 'active' },
  { name: 'Mezza gamba', category: 'epilazione', subcategory: 'ceretta', duration: null, price: 25, description: 'Epilazione mezza gamba.', visibility: 'active' },
  { name: 'Inguine', category: 'epilazione', subcategory: 'ceretta', duration: null, price: 15, description: 'Epilazione inguine.', visibility: 'active' },
  { name: 'Ascelle', category: 'epilazione', subcategory: 'ceretta', duration: null, price: 10, description: 'Epilazione ascelle.', visibility: 'active' },
  { name: 'Braccia', category: 'epilazione', subcategory: 'ceretta', duration: null, price: 20, description: 'Epilazione braccia.', visibility: 'active' },
  { name: 'Laser diodo (zone piccole)', category: 'epilazione', subcategory: 'epilazione avanzata', duration: null, price: 30, description: 'Seduta laser diodo per zone piccole.', visibility: 'active' },
  { name: 'Laser diodo (zone medie)', category: 'epilazione', subcategory: 'epilazione avanzata', duration: null, price: 50, description: 'Seduta laser diodo per zone medie.', visibility: 'active' },
  { name: 'Laser diodo (zone grandi)', category: 'epilazione', subcategory: 'epilazione avanzata', duration: null, price: 80, description: 'Seduta laser diodo per zone grandi.', visibility: 'active' },
  { name: '5 trattamenti viso', category: 'pacchetti', subcategory: 'viso', duration: null, price: 250, description: 'Pacchetto 5 trattamenti viso con valore promozionale.', visibility: 'active' },
  { name: '10 trattamenti viso', category: 'pacchetti', subcategory: 'viso', duration: null, price: 450, description: 'Pacchetto 10 trattamenti viso a prezzo agevolato.', visibility: 'active' },
  { name: '10 massaggi drenanti', category: 'pacchetti', subcategory: 'corpo', duration: null, price: 550, description: 'Pacchetto da 10 massaggi drenanti.', visibility: 'active' },
  { name: '10 pressoterapia', category: 'pacchetti', subcategory: 'corpo', duration: null, price: 350, description: 'Pacchetto da 10 sedute di pressoterapia.', visibility: 'active' },
  { name: 'Pacchetto laser 6 sedute', category: 'pacchetti', subcategory: 'epilazione', duration: null, price: null, description: 'Pacchetto epilazione laser 6 sedute con sconto 20%.', visibility: 'active' },
  { name: 'Gift card personalizzata', category: 'extra', subcategory: 'gift card', duration: null, price: null, description: 'Gift card personalizzata acquistabile in centro.', visibility: 'active' },
  { name: 'Consulenza gratuita', category: 'extra', subcategory: 'prima visita', duration: null, price: 0, description: 'Consulenza gratuita dedicata alla prima visita.', visibility: 'active' },
];

const userSeed = {
  email: 'anotniomarettax@gmail.com',
  name: 'Tony Maretta',
  role: 'client',
  phone: '+39 333 111 2222',
};

const bookingSeeds = [
  {
    service_name: 'Pulizia viso profonda',
    operator_name: 'Martina',
    start_time: '2026-05-03T14:30:00.000Z',
    status: 'confirmed',
  },
  {
    service_name: 'Massaggio rilassante',
    operator_name: 'Sara',
    start_time: '2026-05-06T11:00:00.000Z',
    status: 'confirmed',
  },
  {
    service_name: 'Semipermanente mani',
    operator_name: 'Elisa',
    start_time: '2026-04-24T18:15:00.000Z',
    status: 'completed',
  },
];

async function seed() {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();

    const db = client.db(dbName);
    const centers = db.collection('centers');
    const services = db.collection('services');
    const users = db.collection('users');
    const bookings = db.collection('bookings');

    const now = new Date();

    const center = await centers.findOneAndUpdate(
      { email: centerSeed.email },
      {
        $set: {
          email: centerSeed.email,
          mail: centerSeed.email,
          name: centerSeed.name,
          branding: centerSeed.branding,
          opening_hours: centerSeed.opening_hours,
          updated_at: now,
        },
        $setOnInsert: { created_at: now },
      },
      { upsert: true, returnDocument: 'after' }
    );

    if (!center?._id) {
      throw new Error('Failed to create or load center document.');
    }

    const centerId = center._id instanceof ObjectId ? center._id : new ObjectId(center._id);
    const seedNames = serviceSeeds.map((service) => service.name);

    for (const service of serviceSeeds) {
      await services.updateOne(
        { center_id: centerId, name: service.name },
        {
          $set: {
            ...service,
            center_id: centerId,
            updated_at: now,
          },
          $setOnInsert: { created_at: now },
        },
        { upsert: true }
      );
    }

    await services.deleteMany({ center_id: centerId, name: { $nin: seedNames } });

    const user = await users.findOneAndUpdate(
      { email: userSeed.email },
      {
        $set: {
          email: userSeed.email,
          name: userSeed.name,
          role: userSeed.role,
          phone: userSeed.phone,
          center_id: null,
          updated_at: now,
        },
        $setOnInsert: { created_at: now },
      },
      { upsert: true, returnDocument: 'after' }
    );

    if (!user?._id) {
      throw new Error('Failed to create or load user document.');
    }

    const userId = user._id instanceof ObjectId ? user._id : new ObjectId(user._id);
    const serviceDocuments = await services.find({ center_id: centerId }).toArray();
    const servicesByName = new Map(serviceDocuments.map((service) => [service.name, service]));

    for (const bookingSeed of bookingSeeds) {
      const service = servicesByName.get(bookingSeed.service_name);

      if (!service) {
        continue;
      }

      const startTime = new Date(bookingSeed.start_time);
      const duration = typeof service.duration === 'number' ? service.duration : 60;
      const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

      await bookings.updateOne(
        {
          user_id: userId,
          center_id: centerId,
          service_id: service._id,
          start_time: startTime,
        },
        {
          $set: {
            user_id: userId,
            center_id: centerId,
            service_id: service._id,
            operator_name: bookingSeed.operator_name,
            service_name: service.name,
            start_time: startTime,
            end_time: endTime,
            status: bookingSeed.status,
            updated_at: now,
          },
          $setOnInsert: { created_at: now },
        },
        { upsert: true }
      );
    }

    const insertedServices = await services.find({ center_id: centerId }).toArray();
    const insertedBookings = await bookings
      .find({ center_id: centerId, user_id: userId })
      .sort({ start_time: 1 })
      .toArray();

    console.log(
      JSON.stringify(
        {
          database: dbName,
          center: {
            _id: centerId.toString(),
            name: center.name,
            email: center.email || center.mail,
          },
          services_count: insertedServices.length,
          bookings_count: insertedBookings.length,
          user: {
            id: userId.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
          },
        },
        null,
        2
      )
    );
  } finally {
    await client.close();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});

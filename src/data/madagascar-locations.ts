export interface Quartier {
  name: string;
  lat?: number;
  lng?: number;
}

export interface Arrondissement {
  name: string;
  quartiers: Quartier[];
}

export interface Ville {
  name: string;
  region: string;
  lat: number;
  lng: number;
  image: string;
  description: string;
  arrondissements: Arrondissement[];
}

export const villes: Ville[] = [
  {
    name: "Antananarivo",
    region: "Analamanga",
    lat: -18.8792,
    lng: 47.5079,
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800",
    description: "Capitale économique et politique",
    arrondissements: [
      {
        name: "1er Arrondissement (Centre)",
        quartiers: [
          { name: "Analakely", lat: -18.9107, lng: 47.5236 },
          { name: "Soarano", lat: -18.9078, lng: 47.5236 },
          { name: "Ambondrona", lat: -18.9120, lng: 47.5200 },
          { name: "Antaninarenina", lat: -18.9150, lng: 47.5220 },
          { name: "Tsaralalàna", lat: -18.9090, lng: 47.5250 },
          { name: "Behoririka", lat: -18.9060, lng: 47.5260 },
          { name: "Ambatovinaky", lat: -18.9040, lng: 47.5230 },
          { name: "Antohomadinika", lat: -18.9170, lng: 47.5180 },
          { name: "Andohatapenaka", lat: -18.9100, lng: 47.5130 },
          { name: "Isotry", lat: -18.9130, lng: 47.5170 },
          { name: "67ha", lat: -18.9080, lng: 47.5150 },
          { name: "Ampefiloha", lat: -18.9050, lng: 47.5190 },
          { name: "Anosy", lat: -18.9170, lng: 47.5230 },
          { name: "Mahamasina", lat: -18.9200, lng: 47.5210 },
          { name: "Ambatomena", lat: -18.9160, lng: 47.5260 },
          { name: "Ampandrana", lat: -18.9020, lng: 47.5310 },
        ],
      },
      {
        name: "2ème Arrondissement (Sud-Est)",
        quartiers: [
          { name: "Ambohipo", lat: -18.9350, lng: 47.5380 },
          { name: "Ankatso", lat: -18.9300, lng: 47.5200 },
          { name: "Mandroseza", lat: -18.9400, lng: 47.5350 },
          { name: "Ambanidia", lat: -18.9250, lng: 47.5280 },
          { name: "Ambohijatovo", lat: -18.9180, lng: 47.5280 },
          { name: "Faravohitra", lat: -18.9130, lng: 47.5300 },
          { name: "Ankadifotsy", lat: -18.9200, lng: 47.5330 },
          { name: "Ambohimitsimbina", lat: -18.9230, lng: 47.5350 },
          { name: "Manjakamiadana", lat: -18.9220, lng: 47.5250 },
          { name: "Androhibe", lat: -18.9270, lng: 47.5420 },
          { name: "Ampasanimalo", lat: -18.9300, lng: 47.5300 },
          { name: "Androndrakely", lat: -18.9250, lng: 47.5350 },
        ],
      },
      {
        name: "3ème Arrondissement (Centre-Est)",
        quartiers: [
          { name: "Andravoahangy", lat: -18.9050, lng: 47.5350 },
          { name: "Ankorondrano", lat: -18.8950, lng: 47.5250 },
          { name: "Besarety", lat: -18.9020, lng: 47.5280 },
          { name: "Antanimena", lat: -18.9000, lng: 47.5300 },
          { name: "Ankadivato", lat: -18.9070, lng: 47.5320 },
          { name: "Amparibe", lat: -18.9100, lng: 47.5290 },
          { name: "Ambodivona", lat: -18.9080, lng: 47.5340 },
          { name: "Soavimbahoaka", lat: -18.8980, lng: 47.5380 },
          { name: "Andraharo", lat: -18.8900, lng: 47.5300 },
          { name: "Ampandrianomby", lat: -18.8920, lng: 47.5350 },
          { name: "Andrefan'Ambohijanahary", lat: -18.9000, lng: 47.5200 },
        ],
      },
      {
        name: "4ème Arrondissement (Nord)",
        quartiers: [
          { name: "Ivandry", lat: -18.8850, lng: 47.5420 },
          { name: "Ambatobe", lat: -18.8800, lng: 47.5480 },
          { name: "Ankerana", lat: -18.8830, lng: 47.5450 },
          { name: "Alarobia", lat: -18.8870, lng: 47.5380 },
          { name: "Nanisana", lat: -18.8900, lng: 47.5400 },
          { name: "Ankadikely Ilafy", lat: -18.8700, lng: 47.5500 },
          { name: "Ambohitrarahaba", lat: -18.8750, lng: 47.5350 },
          { name: "Antanimora", lat: -18.8950, lng: 47.5420 },
          { name: "Ambohimanarina", lat: -18.8880, lng: 47.5150 },
          { name: "Mahatony", lat: -18.8650, lng: 47.5300 },
          { name: "Sabotsy Namehana", lat: -18.8550, lng: 47.5250 },
          { name: "Ilafy", lat: -18.8600, lng: 47.5450 },
        ],
      },
      {
        name: "5ème Arrondissement (Nord-Ouest)",
        quartiers: [
          { name: "Ivato", lat: -18.8000, lng: 47.4800 },
          { name: "Talatamaty", lat: -18.8400, lng: 47.4900 },
          { name: "Antehiroka", lat: -18.8350, lng: 47.4850 },
          { name: "Ambohibao", lat: -18.8500, lng: 47.4950 },
          { name: "Andranoro", lat: -18.8450, lng: 47.5050 },
          { name: "Ambodimita", lat: -18.8550, lng: 47.5000 },
          { name: "Ankazomanga", lat: -18.8980, lng: 47.5100 },
          { name: "Manjakaray", lat: -18.9000, lng: 47.5150 },
          { name: "Analamahitsy", lat: -18.8750, lng: 47.5500 },
          { name: "Ampanotokana", lat: -18.8300, lng: 47.4800 },
        ],
      },
      {
        name: "6ème Arrondissement (Sud)",
        quartiers: [
          { name: "Andoharanofotsy", lat: -18.9700, lng: 47.5200 },
          { name: "Tanjombato", lat: -18.9500, lng: 47.5150 },
          { name: "Ankadimbahoaka", lat: -18.9450, lng: 47.5100 },
          { name: "Anosizato", lat: -18.9200, lng: 47.5000 },
          { name: "Ambohimanambola", lat: -18.9600, lng: 47.5250 },
          { name: "Soanierana", lat: -18.9150, lng: 47.5050 },
          { name: "Ankaraobato", lat: -18.9350, lng: 47.4950 },
          { name: "Itaosy", lat: -18.9250, lng: 47.4900 },
          { name: "Ampitatafika", lat: -18.9400, lng: 47.4850 },
          { name: "Bemasoandro", lat: -18.9550, lng: 47.5100 },
          { name: "Andranonahoatra", lat: -18.9500, lng: 47.5050 },
        ],
      },
    ],
  },
  {
    name: "Nosy Be",
    region: "Diana",
    lat: -13.32,
    lng: 48.27,
    image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800",
    description: "Île aux parfums, joyau touristique",
    arrondissements: [
      {
        name: "Hell-Ville (Andoany)",
        quartiers: [
          { name: "Centre Hell-Ville", lat: -13.4000, lng: 48.2800 },
          { name: "Ambondrona", lat: -13.3950, lng: 48.2750 },
          { name: "Tanambao", lat: -13.4050, lng: 48.2850 },
          { name: "Dar es Salam", lat: -13.3900, lng: 48.2900 },
          { name: "Ambatozavavy", lat: -13.3700, lng: 48.2700 },
          { name: "Marodoka", lat: -13.3600, lng: 48.2650 },
        ],
      },
      {
        name: "Côte Ouest (plages)",
        quartiers: [
          { name: "Ambatoloaka", lat: -13.4000, lng: 48.2200 },
          { name: "Madirokely", lat: -13.3950, lng: 48.2250 },
          { name: "Andilana", lat: -13.2200, lng: 48.2100 },
          { name: "Befotaka", lat: -13.3800, lng: 48.3000 },
          { name: "Chanty Beach", lat: -13.3850, lng: 48.2150 },
          { name: "Ampangorinana", lat: -13.3500, lng: 48.2400 },
        ],
      },
      {
        name: "Nord & Est",
        quartiers: [
          { name: "Dzamandzar", lat: -13.3000, lng: 48.2400 },
          { name: "Djabala", lat: -13.2800, lng: 48.2500 },
          { name: "Lokobe", lat: -13.4200, lng: 48.3100 },
          { name: "Mont Passot", lat: -13.2900, lng: 48.2300 },
          { name: "Befotaka Sud", lat: -13.4100, lng: 48.3200 },
        ],
      },
    ],
  },
  {
    name: "Toamasina",
    region: "Atsinanana",
    lat: -18.1443,
    lng: 49.3958,
    image: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800",
    description: "Premier port de Madagascar",
    arrondissements: [
      {
        name: "Centre-ville",
        quartiers: [
          { name: "Bazar Be", lat: -18.1440, lng: 49.3960 },
          { name: "Bazar Kely", lat: -18.1420, lng: 49.3940 },
          { name: "Tanambao V", lat: -18.1500, lng: 49.3980 },
          { name: "Anjoma", lat: -18.1460, lng: 49.4000 },
          { name: "Ambodimanga", lat: -18.1480, lng: 49.3920 },
          { name: "Salazamay", lat: -18.1400, lng: 49.3900 },
        ],
      },
      {
        name: "Périphérie",
        quartiers: [
          { name: "Tanambao", lat: -18.1550, lng: 49.3850 },
          { name: "Ankirihiry", lat: -18.1380, lng: 49.3880 },
          { name: "Mangarivotra", lat: -18.1350, lng: 49.3950 },
          { name: "Andranomadio", lat: -18.1600, lng: 49.4050 },
          { name: "Manangareza", lat: -18.1300, lng: 49.4000 },
        ],
      },
    ],
  },
  {
    name: "Mahajanga",
    region: "Boeny",
    lat: -15.7167,
    lng: 46.3167,
    image: "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800",
    description: "Cité des Fleurs sur la côte ouest",
    arrondissements: [
      {
        name: "Centre & Bord de mer",
        quartiers: [
          { name: "Mahajanga Be", lat: -15.7170, lng: 46.3170 },
          { name: "Aranta", lat: -15.7200, lng: 46.3200 },
          { name: "Tsaramandroso", lat: -15.7150, lng: 46.3100 },
          { name: "Mahabibo", lat: -15.7180, lng: 46.3220 },
          { name: "Mangarivotra", lat: -15.7130, lng: 46.3150 },
        ],
      },
      {
        name: "Périphérie",
        quartiers: [
          { name: "Amborovy", lat: -15.7300, lng: 46.3500 },
          { name: "Manga", lat: -15.7250, lng: 46.3050 },
          { name: "Tsararano", lat: -15.7100, lng: 46.3000 },
          { name: "Antanimasaja", lat: -15.7050, lng: 46.3250 },
        ],
      },
    ],
  },
  {
    name: "Toliara",
    region: "Atsimo-Andrefana",
    lat: -23.3516,
    lng: 43.6854,
    image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800",
    description: "Porte du Sud-Ouest",
    arrondissements: [
      {
        name: "Centre-ville",
        quartiers: [
          { name: "Sanfily", lat: -23.3520, lng: 43.6850 },
          { name: "Tsimenatse", lat: -23.3500, lng: 43.6880 },
          { name: "Mahavatse I", lat: -23.3540, lng: 43.6870 },
          { name: "Mahavatse II", lat: -23.3560, lng: 43.6830 },
          { name: "Betania", lat: -23.3480, lng: 43.6900 },
          { name: "Tsongobory", lat: -23.3600, lng: 43.6800 },
        ],
      },
      {
        name: "Périphérie",
        quartiers: [
          { name: "Ankilibe", lat: -23.3700, lng: 43.6700 },
          { name: "Ifaty", lat: -23.1500, lng: 43.6200 },
          { name: "Andranomena", lat: -23.3400, lng: 43.6750 },
        ],
      },
    ],
  },
  {
    name: "Antsiranana",
    region: "Diana",
    lat: -12.2787,
    lng: 49.2917,
    image: "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=800",
    description: "Diego-Suarez, baie spectaculaire",
    arrondissements: [
      {
        name: "Centre-ville",
        quartiers: [
          { name: "Centre", lat: -12.2790, lng: 49.2920 },
          { name: "Tanambao", lat: -12.2810, lng: 49.2950 },
          { name: "Scama", lat: -12.2770, lng: 49.2880 },
          { name: "Cité Ouvrière", lat: -12.2830, lng: 49.2900 },
          { name: "Place Foch", lat: -12.2780, lng: 49.2910 },
          { name: "Ambohimitsinjo", lat: -12.2750, lng: 49.2870 },
        ],
      },
      {
        name: "Côte & périphérie",
        quartiers: [
          { name: "Ramena", lat: -12.2300, lng: 49.3600 },
          { name: "Sakaramy", lat: -12.3100, lng: 49.2600 },
          { name: "Antsahampano", lat: -12.2650, lng: 49.3000 },
        ],
      },
    ],
  },
  {
    name: "Antsirabe",
    region: "Vakinankaratra",
    lat: -19.8659,
    lng: 47.0333,
    image: "https://images.unsplash.com/photo-1596005554384-d293674c91d7?w=800",
    description: "Ville d'eau, capitale thermale",
    arrondissements: [
      {
        name: "Antsirabe I",
        quartiers: [
          { name: "Avaratsena", lat: -19.8600, lng: 47.0350 },
          { name: "Atsimotsena", lat: -19.8700, lng: 47.0300 },
          { name: "Mahazoarivo Nord", lat: -19.8620, lng: 47.0380 },
          { name: "Mahazoarivo Sud", lat: -19.8680, lng: 47.0370 },
          { name: "Antsongo", lat: -19.8650, lng: 47.0280 },
          { name: "Tsarasaotra", lat: -19.8630, lng: 47.0320 },
          { name: "Antsenakely", lat: -19.8670, lng: 47.0340 },
          { name: "Andranomadio", lat: -19.8580, lng: 47.0310 },
        ],
      },
      {
        name: "Antsirabe II",
        quartiers: [
          { name: "Vinaninkarena", lat: -19.8800, lng: 47.0500 },
          { name: "Andranobe", lat: -19.8750, lng: 47.0450 },
          { name: "Belazao", lat: -19.8900, lng: 47.0400 },
        ],
      },
    ],
  },
  {
    name: "Fianarantsoa",
    region: "Haute Matsiatra",
    lat: -21.4425,
    lng: 47.0856,
    image: "https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=800",
    description: "Capitale du Sud, ville universitaire",
    arrondissements: [
      {
        name: "Tanàna Ambony (Ville Haute)",
        quartiers: [
          { name: "Tanàna Ambony", lat: -21.4400, lng: 47.0850 },
          { name: "Antarandolo", lat: -21.4380, lng: 47.0880 },
          { name: "Ampasambazaha", lat: -21.4420, lng: 47.0830 },
        ],
      },
      {
        name: "Ville Basse",
        quartiers: [
          { name: "Isada", lat: -21.4450, lng: 47.0870 },
          { name: "Tsianolondroa", lat: -21.4470, lng: 47.0840 },
          { name: "Mahamanina", lat: -21.4440, lng: 47.0900 },
          { name: "Andrainjato", lat: -21.4490, lng: 47.0860 },
          { name: "Ambalakisoa", lat: -21.4460, lng: 47.0820 },
        ],
      },
    ],
  },
  {
    name: "Sainte-Marie",
    region: "Analanjirofo",
    lat: -16.83,
    lng: 49.92,
    image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800",
    description: "Île paradisiaque, observation des baleines",
    arrondissements: [
      {
        name: "Sud (centre)",
        quartiers: [
          { name: "Ambodifotatra", lat: -17.0800, lng: 49.8500 },
          { name: "Lonkintsy", lat: -17.0700, lng: 49.8600 },
          { name: "Belle Vue", lat: -17.0850, lng: 49.8450 },
        ],
      },
      {
        name: "Nord",
        quartiers: [
          { name: "Ambodiforaha", lat: -16.8500, lng: 49.9200 },
          { name: "Lokintsy", lat: -16.8300, lng: 49.9300 },
          { name: "Ilot Madame", lat: -17.0900, lng: 49.8400 },
        ],
      },
    ],
  },
  {
    name: "Morondava",
    region: "Menabe",
    lat: -20.2833,
    lng: 44.2833,
    image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800",
    description: "Allée des Baobabs",
    arrondissements: [
      {
        name: "Centre",
        quartiers: [
          { name: "Centre-ville", lat: -20.2830, lng: 44.2830 },
          { name: "Nosy Kely", lat: -20.2800, lng: 44.2800 },
          { name: "Namahora Nord", lat: -20.2780, lng: 44.2850 },
          { name: "Namahora Sud", lat: -20.2870, lng: 44.2810 },
          { name: "Andakabe", lat: -20.2900, lng: 44.2780 },
        ],
      },
    ],
  },
  {
    name: "Tôlanaro",
    region: "Anosy",
    lat: -25.0314,
    lng: 46.9825,
    image: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800",
    description: "Fort-Dauphin, sud sauvage et plages préservées",
    arrondissements: [
      {
        name: "Centre",
        quartiers: [
          { name: "Centre-ville", lat: -25.0310, lng: 46.9820 },
          { name: "Tanambao", lat: -25.0330, lng: 46.9850 },
          { name: "Amparihy", lat: -25.0290, lng: 46.9800 },
          { name: "Bazarikely", lat: -25.0350, lng: 46.9830 },
          { name: "Ankoba", lat: -25.0280, lng: 46.9870 },
        ],
      },
    ],
  },
  {
    name: "Manakara",
    region: "Fitovinany",
    lat: -22.15,
    lng: 48.01,
    image: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800",
    description: "Terminus du train FCE, côte est",
    arrondissements: [
      {
        name: "Centre",
        quartiers: [
          { name: "Manakara Be", lat: -22.1500, lng: 48.0100 },
          { name: "Tanambao", lat: -22.1480, lng: 48.0130 },
          { name: "Ambalavato", lat: -22.1520, lng: 48.0080 },
          { name: "Andranomavo", lat: -22.1450, lng: 48.0150 },
        ],
      },
    ],
  },
];

export const getVille = (name: string) => villes.find((v) => v.name === name);

/** Default map pin for publish / suggestions: quartier → ville center. */
export function getSuggestedListingCoordinates(
  villeName: string,
  arrName?: string,
  quartierName?: string
): { lat: number; lng: number } | null {
  const v = getVille(villeName);
  if (!v) return null;
  if (arrName && quartierName) {
    const arr = v.arrondissements.find((a) => a.name === arrName);
    const q = arr?.quartiers.find((x) => x.name === quartierName);
    if (q?.lat != null && q.lng != null) {
      return { lat: q.lat, lng: q.lng };
    }
  }
  return { lat: v.lat, lng: v.lng };
}
export const getAllQuartiers = (villeName: string) =>
  getVille(villeName)?.arrondissements.flatMap((a) => a.quartiers) ?? [];
export const villeNames = villes.map((v) => v.name);
export const getRegionForVille = (villeName: string) =>
  getVille(villeName)?.region ?? "";

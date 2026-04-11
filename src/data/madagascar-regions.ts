export interface Region {
  name: string;
  capital: string;
  cities: string[];
  lat: number;
  lng: number;
  image: string;
}

export const regions: Region[] = [
  { name: "Analamanga", capital: "Antananarivo", cities: ["Antananarivo", "Ambohidratrimo", "Ankazobe", "Anjozorobe", "Manjakandriana"], lat: -18.9137, lng: 47.5361, image: "https://images.unsplash.com/photo-1580746738099-78d6833b3a85?w=600" },
  { name: "Vakinankaratra", capital: "Antsirabe", cities: ["Antsirabe", "Ambatolampy", "Betafo", "Faratsiho"], lat: -19.8659, lng: 47.0333, image: "https://images.unsplash.com/photo-1596005554384-d293674c91d7?w=600" },
  { name: "Itasy", capital: "Miarinarivo", cities: ["Miarinarivo", "Arivonimamo", "Soavinandriana"], lat: -19.0, lng: 46.9, image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600" },
  { name: "Bongolava", capital: "Tsiroanomandidy", cities: ["Tsiroanomandidy", "Fenoarivobe"], lat: -18.77, lng: 46.05, image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600" },
  { name: "Haute Matsiatra", capital: "Fianarantsoa", cities: ["Fianarantsoa", "Ambohimahasoa", "Ambalavao"], lat: -21.4425, lng: 47.0856, image: "https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=600" },
  { name: "Amoron'i Mania", capital: "Ambositra", cities: ["Ambositra", "Fandriana", "Manandriana"], lat: -20.53, lng: 47.24, image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600" },
  { name: "Vatovavy", capital: "Mananjary", cities: ["Mananjary", "Nosy Varika", "Ifanadiana"], lat: -21.22, lng: 48.34, image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600" },
  { name: "Fitovinany", capital: "Manakara", cities: ["Manakara", "Vohipeno", "Ikongo"], lat: -22.15, lng: 48.01, image: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=600" },
  { name: "Atsimo-Atsinanana", capital: "Farafangana", cities: ["Farafangana", "Vangaindrano", "Midongy du Sud"], lat: -22.82, lng: 47.83, image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600" },
  { name: "Ihorombe", capital: "Ihosy", cities: ["Ihosy", "Iakora", "Ivohibe"], lat: -22.4, lng: 46.12, image: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600" },
  { name: "Menabe", capital: "Morondava", cities: ["Morondava", "Belo sur Tsiribihina", "Miandrivazo"], lat: -20.2833, lng: 44.2833, image: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=600" },
  { name: "Atsimo-Andrefana", capital: "Toliara", cities: ["Toliara", "Sakaraha", "Ankazoabo", "Betioky"], lat: -23.3516, lng: 43.6854, image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600" },
  { name: "Androy", capital: "Ambovombe", cities: ["Ambovombe", "Bekily", "Tsihombe"], lat: -25.17, lng: 46.08, image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600" },
  { name: "Anosy", capital: "Tôlanaro", cities: ["Tôlanaro (Fort-Dauphin)", "Amboasary", "Betroka"], lat: -25.0314, lng: 46.9825, image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600" },
  { name: "Boeny", capital: "Mahajanga", cities: ["Mahajanga", "Marovoay", "Ambato-Boeny", "Soalala"], lat: -15.7167, lng: 46.3167, image: "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=600" },
  { name: "Sofia", capital: "Antsohihy", cities: ["Antsohihy", "Mandritsara", "Bealanana", "Port-Bergé"], lat: -14.88, lng: 47.99, image: "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=600" },
  { name: "Betsiboka", capital: "Maevatanana", cities: ["Maevatanana", "Kandreho", "Tsaratanana"], lat: -16.95, lng: 46.83, image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600" },
  { name: "Melaky", capital: "Maintirano", cities: ["Maintirano", "Antsalova", "Besalampy", "Ambatomainty"], lat: -18.05, lng: 44.03, image: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=600" },
  { name: "Alaotra-Mangoro", capital: "Ambatondrazaka", cities: ["Ambatondrazaka", "Moramanga", "Andilamena", "Amparafaravola"], lat: -17.83, lng: 48.42, image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600" },
  { name: "Atsinanana", capital: "Toamasina", cities: ["Toamasina", "Brickaville", "Vatomandry", "Mahanoro"], lat: -18.1443, lng: 49.3958, image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600" },
  { name: "Analanjirofo", capital: "Fenoarivo Atsinanana", cities: ["Fenoarivo Atsinanana", "Sainte-Marie", "Maroantsetra", "Mananara Nord"], lat: -17.38, lng: 49.41, image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600" },
  { name: "SAVA", capital: "Antsirananana", cities: ["Antsirananana (Diego Suarez)", "Sambava", "Antalaha", "Vohémar"], lat: -12.2795, lng: 49.2913, image: "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=600" },
  { name: "DIANA", capital: "Antsiranana", cities: ["Antsiranana", "Nosy Be", "Ambanja", "Ambilobe"], lat: -12.28, lng: 49.29, image: "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=600" },
];

export const allCities = regions.flatMap(r => r.cities);
export const regionNames = regions.map(r => r.name);

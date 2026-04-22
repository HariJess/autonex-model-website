export type FeaturedMake = {
  name: string;
  slug: string;
  logo: string;
  wrapperClassName?: string;
  logoClassName?: string;
};

export const FEATURED_MAKES: FeaturedMake[] = [
  {
    name: "Toyota",
    slug: "toyota",
    logo: "/featured-makes/toyota.png",
    logoClassName: "md:h-[3.45rem] md:max-w-[168px]",
  },
  {
    name: "Haval",
    slug: "haval",
    logo: "/featured-makes/haval.png",
    wrapperClassName: "w-[152px] md:w-[176px]",
    logoClassName: "md:h-[3.3rem] md:max-w-[176px]",
  },
  {
    name: "Mazda",
    slug: "mazda",
    logo: "/featured-makes/mazda.png",
    logoClassName: "md:h-[3.4rem] md:max-w-[166px]",
  },
  {
    name: "Isuzu",
    slug: "isuzu",
    logo: "/featured-makes/isuzu.png",
    wrapperClassName: "w-[150px] md:w-[174px]",
    logoClassName: "md:h-[3.25rem] md:max-w-[174px]",
  },
  {
    name: "Suzuki",
    slug: "suzuki",
    logo: "/featured-makes/suzuki.png",
    logoClassName: "md:h-[3.35rem] md:max-w-[166px]",
  },
  {
    name: "Hyundai",
    slug: "hyundai",
    logo: "/featured-makes/hyundai.png",
    logoClassName: "md:h-[3.35rem] md:max-w-[168px]",
  },
  {
    name: "Volkswagen",
    slug: "volkswagen",
    logo: "/featured-makes/volkswagen.png",
    logoClassName: "md:h-[3.5rem] md:max-w-[170px]",
  },
  {
    name: "Audi",
    slug: "audi",
    logo: "/featured-makes/audi.png",
  },
  {
    name: "BMW",
    slug: "bmw",
    logo: "/featured-makes/bmw.png",
  },
  {
    name: "Changan",
    slug: "changan",
    logo: "/featured-makes/changan.png",
  },
  {
    name: "Ford",
    slug: "ford",
    logo: "/featured-makes/ford.png",
  },
  {
    name: "GWM",
    slug: "gwm",
    logo: "/featured-makes/gwm.png",
  },
  {
    name: "Mercedes-Benz",
    slug: "mercedes-benz",
    logo: "/featured-makes/mercedes.png",
  },
  {
    name: "Nissan",
    slug: "nissan",
    logo: "/featured-makes/nissan.png",
  },
  {
    name: "Peugeot",
    slug: "peugeot",
    logo: "/featured-makes/peugeot.png",
  },
];

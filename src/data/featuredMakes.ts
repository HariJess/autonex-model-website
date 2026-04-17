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
    logo: "/featured-makes/toyota.svg",
    logoClassName: "md:h-[3.45rem] md:max-w-[168px]",
  },
  {
    name: "Haval",
    slug: "haval",
    logo: "/featured-makes/haval.svg",
    wrapperClassName: "w-[152px] md:w-[176px]",
    logoClassName: "md:h-[3.3rem] md:max-w-[176px]",
  },
  {
    name: "Mazda",
    slug: "mazda",
    logo: "/featured-makes/mazda.svg",
    logoClassName: "md:h-[3.4rem] md:max-w-[166px]",
  },
  {
    name: "Isuzu",
    slug: "isuzu",
    logo: "/featured-makes/isuzu.svg",
    wrapperClassName: "w-[150px] md:w-[174px]",
    logoClassName: "md:h-[3.25rem] md:max-w-[174px]",
  },
  {
    name: "Suzuki",
    slug: "suzuki",
    logo: "/featured-makes/suzuki.svg",
    logoClassName: "md:h-[3.35rem] md:max-w-[166px]",
  },
  {
    name: "Hyundai",
    slug: "hyundai",
    logo: "/featured-makes/hyundai.svg",
    logoClassName: "md:h-[3.35rem] md:max-w-[168px]",
  },
  {
    name: "Volkswagen",
    slug: "volkswagen",
    logo: "/featured-makes/volkswagen.svg",
    logoClassName: "md:h-[3.5rem] md:max-w-[170px]",
  },
];

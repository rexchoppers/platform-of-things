export interface PlanetConfig {
  name: string;
  section: string;
  groundColor: number;
  skyColor: number;
  ambientColor: number;
  lightColor: number;
  lightIntensity: number;
  fogDensity: number;
  description: string;
}

export const planets: Record<string, PlanetConfig> = {
  home: {
    name: 'Hearth',
    section: 'Welcome',
    groundColor: 0x3d5c3d,
    skyColor: 0x12131f,
    ambientColor: 0x404060,
    lightColor: 0xffffff,
    lightIntensity: 0.42,
    fogDensity: 0.008,
    description: 'My stuff.',
  },
  story: {
    name: 'Chronicle',
    section: 'My Story',
    groundColor: 0x4a3728,
    skyColor: 0x1d1233,
    ambientColor: 0x5a4266,
    lightColor: 0xffccaa,
    lightIntensity: 0.7,
    fogDensity: 0.01,
    description: 'How I got here.',
  },
  skills: {
    name: 'Grove',
    section: 'Skills',
    groundColor: 0x1a3a4a,
    skyColor: 0x0a1628,
    ambientColor: 0x16637c,
    lightColor: 0x80dfff,
    lightIntensity: 0.8,
    fogDensity: 0.006,
    description: 'Stuff I use.',
  },
  education: {
    name: 'Haven',
    section: 'Education',
    groundColor: 0x4a4a3a,
    skyColor: 0x1e1e28,
    ambientColor: 0x8080a0,
    lightColor: 0xffffee,
    lightIntensity: 1,
    fogDensity: 0.007,
    description: 'Stuff I learnt.',
  },
  articles: {
    name: 'Inkwell',
    section: 'Articles',
    groundColor: 0x2a2a3a,
    skyColor: 0x0f0f1a,
    ambientColor: 0x6060a0,
    lightColor: 0xaaaaff,
    lightIntensity: 0.9,
    fogDensity: 0.012,
    description: 'Stuff I wrote.',
  },
  projects: {
    name: 'Workshop',
    section: 'Projects',
    groundColor: 0x3a2020,
    skyColor: 0x1a0a0a,
    ambientColor: 0xa06040,
    lightColor: 0xffaa66,
    lightIntensity: 1.1,
    fogDensity: 0.009,
    description: 'Stuff I made.',
  },
};

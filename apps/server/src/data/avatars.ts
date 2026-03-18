// apps/server/src/data/avatars.ts
const AVATAR_CDN = "https://cdn.jsdelivr.net/gh/adcanoardev/mythara-assets@8788a27ffc7fdfbb47b3379de8219f24117be8aa/avatars";

export const AVATARS = [
    { id: "avatar_male_1",   gender: "male",   name: "Kael",  url: `${AVATAR_CDN}/avatar_male_1.webp`   },
    { id: "avatar_male_2",   gender: "male",   name: "Ryn",   url: `${AVATAR_CDN}/avatar_male_2.webp`   },
    { id: "avatar_male_3",   gender: "male",   name: "Zeph",  url: `${AVATAR_CDN}/avatar_male_3.webp`   },
    { id: "avatar_male_4",   gender: "male",   name: "Voss",  url: `${AVATAR_CDN}/avatar_male_4.webp`   },
    { id: "avatar_female_1", gender: "female", name: "Lyra",  url: `${AVATAR_CDN}/avatar_female_1.webp` },
    { id: "avatar_female_2", gender: "female", name: "Mira",  url: `${AVATAR_CDN}/avatar_female_2.webp` },
    { id: "avatar_female_3", gender: "female", name: "Sable", url: `${AVATAR_CDN}/avatar_female_3.webp` },
    { id: "avatar_female_4", gender: "female", name: "Nyx",   url: `${AVATAR_CDN}/avatar_female_4.webp` },
];

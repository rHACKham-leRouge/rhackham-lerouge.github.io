export const SITE = {
  website: "https://rhackham.github.io/",
  author: "rHACKham-leRouge",
  profile: "https://github.com/rHACKham-leRouge",
  desc: "Cybersécurité, CTF, bug bounty et projets perso.",
  title: "rHACKham-le-Rouge",
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: true,
  postPerIndex: 4,
  postPerPage: 4,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true,
  editPost: {
    enabled: true,
    text: "Edit page",
    url: "https://github.com/rHACKham-leRouge/rhackham.github.io/edit/main/",
  },
  dynamicOgImage: true,
  dir: "ltr",
  lang: "en",
  timezone: "Europe/Paris",
} as const;
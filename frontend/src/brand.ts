// Single source of truth for the brand. AIMVERSE is the portfolio; NEDVERSE is its campus-exploration Quest Mode.
// (Server code has its own copy in api/_lib/brand.ts because the serverless functions are bundled separately.)
export const BRAND = {
  name: 'AIMVERSE',
  tagline: 'Beyond the Portfolio. Into the Experience.',
  owner: 'Syeda Aiman Munawar',
  assistant: 'AIM AI', // the chatbot's name
  quest: 'NEDVERSE',
  questTagline: 'Explore the Campus. Discover the Journey.',
  // Honest labelling required for the campus experience (not affiliated with the university).
  questDisclaimer: 'NEDVERSE is an unofficial, student-created digital exploration experience. It is not affiliated with or endorsed by NED University of Engineering & Technology.',
  promoFile: '/media/AIMVERSE_Promo.mp4',
  siteUrl: 'https://frontend-opal-six-64.vercel.app',
  // localStorage keys. `legacy` keys (from the AIMANVERSE era) are read once so no visitor loses progress or sound choice.
  storage: {
    quest: 'aimverse:quest:v1', questLegacy: 'aimanverse:quest:v1',
    hud: 'aimverse:quest:hud', hudLegacy: 'aimanverse:quest:hud',
    sound: 'aimverse:sound', soundLegacy: 'aimanverse:sound',
  },
} as const

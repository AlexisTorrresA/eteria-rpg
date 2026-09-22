export const WEAPONS = [
  {
    id: 'aether-blade',
    name: 'Hoja de Éter',
    icon: '⚔',
    damage: 28,
    cooldown: 0.42,
    range: 2.8,
    crit: 0.08,
    color: 0xcbd5e1,
    glow: 0x38bdf8,
    unlock: { level: 1, kills: 0, crystals: 0 },
    lore: 'Espada ceremonial de los Viajeros del Umbral.'
  },
  {
    id: 'ember-axe',
    name: 'Hacha de Brasa',
    icon: '🪓',
    damage: 42,
    cooldown: 0.66,
    range: 2.65,
    crit: 0.12,
    color: 0x9ca3af,
    glow: 0xf97316,
    unlock: { level: 1, kills: 2, crystals: 0 },
    lore: 'Pesada, lenta y devastadora contra guardianes.'
  },
  {
    id: 'moon-spear',
    name: 'Lanza Lunar',
    icon: '✦',
    damage: 34,
    cooldown: 0.5,
    range: 3.65,
    crit: 0.1,
    color: 0xdbeafe,
    glow: 0xa78bfa,
    unlock: { level: 2, kills: 3, crystals: 2 },
    lore: 'Mantiene a las criaturas del Eclipse a distancia.'
  },
  {
    id: 'rift-daggers',
    name: 'Dagas de la Grieta',
    icon: '✣',
    damage: 23,
    cooldown: 0.25,
    range: 2.35,
    crit: 0.24,
    color: 0xe2e8f0,
    glow: 0x22d3ee,
    unlock: { level: 2, kills: 5, crystals: 2 },
    lore: 'Dos hojas rápidas forjadas con cristal fracturado.'
  },
  {
    id: 'sun-hammer',
    name: 'Martillo Solar',
    icon: '◆',
    damage: 58,
    cooldown: 0.9,
    range: 2.75,
    crit: 0.08,
    color: 0xfef3c7,
    glow: 0xfbbf24,
    unlock: { level: 3, kills: 6, crystals: 4 },
    lore: 'Un arma de los antiguos centinelas de Eteria.'
  },
  {
    id: 'eclipse-glaive',
    name: 'Guja del Eclipse',
    icon: '☾',
    damage: 52,
    cooldown: 0.48,
    range: 3.55,
    crit: 0.2,
    color: 0xe9d5ff,
    glow: 0xc026d3,
    unlock: { level: 3, kills: 8, crystals: 6 },
    lore: 'Combina luz y sombra sin pertenecer a ninguna.'
  }
];

export const ENEMY_ARCHETYPES = {
  shade: {
    id: 'shade',
    name: 'Sombra Errante',
    hp: 48,
    hpPerLevel: 6,
    speed: [2.05, 2.55],
    damage: 7,
    damagePerLevel: 1.2,
    cooldown: [1.05, 1.35],
    xp: 22,
    gold: [8, 15],
    body: 0x24153d,
    glow: 0xff174a,
    scale: 0.94
  },
  marauder: {
    id: 'marauder',
    name: 'Saqueador del Umbral',
    hp: 68,
    hpPerLevel: 8,
    speed: [1.75, 2.15],
    damage: 10,
    damagePerLevel: 1.35,
    cooldown: [1.15, 1.55],
    xp: 30,
    gold: [12, 20],
    body: 0x3f2d2d,
    glow: 0xfb923c,
    scale: 1.02
  },
  guardian: {
    id: 'guardian',
    name: 'Guardián Caído',
    hp: 105,
    hpPerLevel: 10,
    speed: [1.2, 1.55],
    damage: 15,
    damagePerLevel: 1.55,
    cooldown: [1.45, 1.85],
    xp: 42,
    gold: [18, 28],
    body: 0x263449,
    glow: 0x8b5cf6,
    scale: 1.16
  },
  ashArcher: {
    id: 'ashArcher',
    name: 'Arquero de Ceniza',
    hp: 76,
    hpPerLevel: 8,
    speed: [1.45, 1.8],
    damage: 12,
    damagePerLevel: 1.25,
    cooldown: [1.55, 2.05],
    xp: 36,
    gold: [16, 25],
    body: 0x3b2f2f,
    glow: 0xf97316,
    scale: 1.02,
    ranged: true,
    region: 'ashen-wastes'
  },
  ashHound: {
    id: 'ashHound',
    name: 'Sabueso de Escoria',
    hp: 88,
    hpPerLevel: 9,
    speed: [2.35, 2.75],
    damage: 13,
    damagePerLevel: 1.35,
    cooldown: [1.0, 1.3],
    xp: 38,
    gold: [14, 23],
    body: 0x2b1b18,
    glow: 0xef4444,
    scale: 0.96,
    region: 'ashen-wastes'
  }
};

export const BOSS = {
  id: 'eclipse-warden',
  name: 'Vharok, Guardián del Eclipse',
  hp: 540,
  hpPerLevel: 32,
  speed: 1.75,
  damage: 20,
  damagePerLevel: 2.1,
  cooldown: 1.15,
  xp: 180,
  gold: 120,
  body: 0x160d2a,
  glow: 0xd946ef,
  scale: 1.72
};

export const STORY = {
  intro: {
    chapter: 'CAPÍTULO I · EL DESPERTAR',
    title: 'Ecos en el valle',
    status: 'Liora te pide recuperar los primeros fragmentos.'
  },
  shadows: {
    chapter: 'CAPÍTULO II · LOS CAÍDOS',
    title: 'Guardianes sin juramento',
    status: 'Las Sombras obedecen a algo más antiguo.'
  },
  truth: {
    chapter: 'CAPÍTULO III · EL CORAZÓN ROTO',
    title: 'La verdad del Eclipse',
    status: 'Reúne poder suficiente para despertar al Guardián.'
  },
  boss: {
    chapter: 'CAPÍTULO IV · VHAROK',
    title: 'El último sello',
    status: 'Derrota al Guardián del Eclipse junto al portal.'
  },
  finale: {
    chapter: 'CAPÍTULO V · TRAS EL UMBRAL',
    title: 'Las Tierras de Ceniza',
    status: 'Vharok ha caído. Cruza el portal hacia las Tierras de Ceniza.'
  },
  wastes: {
    chapter: 'CAPÍTULO V · LAS TIERRAS DE CENIZA',
    title: 'Un mundo más allá del valle',
    status: 'Derrota 6 criaturas de Ceniza y alcanza el faro oriental.'
  }
};

export function weaponUnlocked(weapon, state) {
  return state.level >= weapon.unlock.level
    && state.kills >= weapon.unlock.kills
    && state.crystals >= weapon.unlock.crystals;
}

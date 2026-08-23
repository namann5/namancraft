// Central content for the NamanCraft menu sections.
// Edit here to update INVENTORY / MY JOURNEY / ACHIEVEMENTS / CONNECT.

export const SPLASHES = [
  'Explore. Build. Create.',
  '100% handcrafted!',
  'Also try /classic!',
  'Powered by coffee!',
  'Punching bugs since day one!',
  'Now with touch support!',
]

export const LINKS = {
  github: 'https://github.com/namann5',
  email: 'mailto:naman.2002.as@gmail.com',
  linkedin: '#', // TODO: add LinkedIn profile URL
  resume: '#', // TODO: link a resume PDF from /public
}

// Inventory: tech as Minecraft-style items (original voxel icons, no MC assets).
export const INVENTORY = [
  { name: 'Java', icon: 'sword', rarity: '#d8d8d8', note: 'Iron Sword — first language forged' },
  { name: 'JavaScript', icon: 'redstone', rarity: '#ff5b4d', note: 'Redstone — makes everything move' },
  { name: 'React', icon: 'diamond', rarity: '#5decf5', note: 'Diamond — UI gem' },
  { name: 'Node.js', icon: 'emerald', rarity: '#3ddc84', note: 'Emerald — server-side currency' },
  { name: 'Python', icon: 'book', rarity: '#c78aff', note: 'Enchanted Book — AI & ML spells' },
  { name: 'MongoDB', icon: 'chest', rarity: '#c98d4b', note: 'Chest — stores all the loot' },
  { name: 'Git / GitHub', icon: 'compass', rarity: '#ffd9a0', note: 'Compass — never loses track' },
  { name: 'Docker', icon: 'obsidian', rarity: '#8b5cf6', note: 'Obsidian — container-grade tough' },
  { name: 'Blender', icon: 'command', rarity: '#e79b5a', note: 'Command Block — voxel world builder' },
  { name: 'SQL', icon: 'bucket', rarity: '#9ecbff', note: 'Bucket — pours structured data' },
  { name: 'C/C++', icon: 'anvil', rarity: '#b9c2cc', note: 'Anvil — heavy systems work' },
  { name: 'AI / ML', icon: 'star', rarity: '#ffe066', note: 'Nether Star — rare drops only' },
]

export const JOURNEY = [
  {
    year: 'Spawn',
    title: 'Agra, Uttar Pradesh, India',
    text: 'Creative developer building AI that spots deepfakes, software that drives cars, and interfaces people actually use.',
  },
  {
    year: '2025',
    title: 'GitHub journey begins',
    text: 'Started pushing real projects publicly at github.com/namann5 — every repo is a room in this world.',
  },
  {
    year: 'Quest',
    title: 'AI Deepfake Detection',
    text: 'Built an AI system that catches synthetic media. The flagship boss fight of the portfolio.',
  },
  {
    year: 'Quest',
    title: 'Autonomous Driving Systems',
    text: 'Engineered a clean-architecture autonomous driving project — perception, planning, control.',
  },
  {
    year: 'Quest',
    title: 'AI Customer Service Platform',
    text: 'Shipped a full-stack AI support platform: conversations, context, and follow-through.',
  },
  {
    year: 'Guild',
    title: 'Open-source contributor',
    text: 'Contributions merged in Rocket.Chat, MergeShip, SecuScan and UltimateHealth.',
  },
  {
    year: 'Grind',
    title: 'LeetCode dungeon',
    text: '380+ problems cleared across easy, medium and hard — the daily mining routine.',
  },
]

export const ACHIEVEMENTS = [
  {
    icon: 'compass',
    title: 'Getting Wood',
    text: 'Joined GitHub and pushed the first public repositories',
    rarity: 'common',
  },
  {
    icon: 'diamond',
    title: 'Deepfake Hunter',
    text: 'Built an AI deepfake detection system end to end',
    rarity: 'rare',
  },
  {
    icon: 'command',
    title: 'Auto-Pilot Engineer',
    text: 'Shipped an autonomous driving systems project',
    rarity: 'rare',
  },
  {
    icon: 'chest',
    title: 'Team Player',
    text: 'Open-source contributions merged in Rocket.Chat, MergeShip, SecuScan & UltimateHealth',
    rarity: 'rare',
  },
  {
    icon: 'redstone',
    title: 'Dungeon Grinder',
    text: 'Solved 386+ LeetCode problems across all difficulties',
    rarity: 'common',
  },
  {
    icon: 'emerald',
    title: 'Star Collector',
    text: 'Earned community stars across published repositories',
    rarity: 'epic',
  },
]

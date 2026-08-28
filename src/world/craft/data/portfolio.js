// Central content for the NamanCraft menu sections.
// Edit here to update INVENTORY / MY JOURNEY / ACHIEVEMENTS / CONNECT.

export const SPLASHES = [
  'Explore. Build. Bharat.',
  'Lit like Diwali!',
  'Also try /classic!',
  'Powered by chai!',
  'Now with touch support!',
  '100% handcrafted & hand-dyed!',
]

export const LINKS = {
  github: 'https://github.com/namann5',
  email: 'mailto:naman.2002.as@gmail.com',
  linkedin: 'https://www.linkedin.com/in/naman-singh-dev',
  instagram: 'https://www.instagram.com/naman5_',
  resume: '#', // TODO: link a resume PDF from /public
}

// Inventory: tech as festival-heritage items (original voxel icons, no MC assets).
export const INVENTORY = [
  { name: 'Java', icon: 'sword', rarity: '#d8d8d8', note: 'Kataar — first language forged' },
  { name: 'JavaScript', icon: 'redstone', rarity: '#ff5b4d', note: 'Saree thread — makes everything move' },
  { name: 'React', icon: 'diamond', rarity: '#5decf5', note: 'Hema — the UI gem' },
  { name: 'Node.js', icon: 'emerald', rarity: '#3ddc84', note: 'Panna — server-side gem' },
  { name: 'Python', icon: 'book', rarity: '#c78aff', note: 'Palm-leaf book — AI & ML verses' },
  { name: 'MongoDB', icon: 'chest', rarity: '#c98d4b', note: 'Pitara — stores all the treasure' },
  { name: 'Git / GitHub', icon: 'compass', rarity: '#ffd9a0', note: 'Compass — never loses the trail' },
  { name: 'Docker', icon: 'obsidian', rarity: '#8b5cf6', note: 'Black stone — container-grade tough' },
  { name: 'Blender', icon: 'command', rarity: '#e79b5a', note: 'Chisel — sculpts this whole realm' },
  { name: 'SQL', icon: 'bucket', rarity: '#9ecbff', note: 'Matka — pours structured water' },
  { name: 'C/C++', icon: 'anvil', rarity: '#b9c2cc', note: "Lohar's anvil — heavy systems work" },
  { name: 'AI / ML', icon: 'star', rarity: '#ffe066', note: 'Malaik star — rarest of the rare' },
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
    text: 'Started pushing real projects publicly at github.com/namann5 — every repo is a room in this realm.',
  },
  {
    year: 'Quest',
    title: 'AI Deepfake Detection',
    text: 'Built an AI system that catches synthetic media. The flagship of the portfolio.',
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
    title: 'LeetCode courtyard',
    text: '380+ problems cleared across easy, medium and hard — the daily routine.',
  },
]

export const ACHIEVEMENTS = [
  {
    icon: 'compass',
    title: 'First Light',
    text: 'Joined GitHub and pushed the first public repositories',
    rarity: 'common',
    date: '2025 · The Ghat',
  },
  {
    icon: 'diamond',
    title: 'Deepfake Hunter',
    text: 'Built an AI deepfake detection system end to end',
    rarity: 'rare',
    date: 'Flagship quest',
  },
  {
    icon: 'command',
    title: 'Auto-Pilot Engineer',
    text: 'Shipped an autonomous driving systems project',
    rarity: 'rare',
    date: 'Quest chain',
  },
  {
    icon: 'chest',
    title: 'Team Player',
    text: 'Open-source contributions merged in Rocket.Chat, MergeShip, SecuScan & UltimateHealth',
    rarity: 'rare',
    date: 'Guild rank',
  },
  {
    icon: 'redstone',
    title: 'Courtyard Grinder',
    text: 'Solved 386+ LeetCode problems across all difficulties',
    rarity: 'common',
    date: 'Daily routine',
  },
  {
    icon: 'emerald',
    title: 'Star Collector',
    text: 'Earned community stars across published repositories',
    rarity: 'epic',
    date: 'Legendary drop',
  },
]

// Rangoli Court stations — one structure per technology in the Skills world.
// Level is shown as voxel pips (1-5), never progress bars.
export const SKILL_STATIONS = [
  { name: 'Java', category: 'Language', level: 4, color: '#ff9d5c', built: ['AI deepfake detection services', 'Autonomous driving modules', 'Years of DSA foundations'] },
  { name: 'JavaScript', category: 'Language', level: 5, color: '#ffd23e', built: ['MergeShip & SecuScan work', 'Rocket.Chat contributions', 'Interactive web toys'] },
  { name: 'React', category: 'Frontend', level: 5, color: '#5decf5', built: ['NamanCraft — this whole world', 'AI Customer Service dashboard', 'Story Spark AI interface'] },
  { name: 'Node.js', category: 'Backend', level: 4, color: '#3ddc84', built: ['AI Customer Service API layer', 'Story Spark AI services'] },
  { name: 'Python', category: 'Language', level: 4, color: '#c78aff', built: ['AI deepfake detection system', 'Autonomous driving pipeline', 'ML experiments & tooling'] },
  { name: 'MongoDB', category: 'Database', level: 3, color: '#7fd34e', built: ['Customer-service conversation store', 'Flexible document schemas'] },
  { name: 'Git / GitHub', category: 'Tooling', level: 5, color: '#ffd9a0', built: ['Every repo in this portfolio', 'Open-source contribution workflow'] },
  { name: 'Docker', category: 'DevOps', level: 3, color: '#8b5cf6', built: ['Containerized dev environments', 'Repeatable deployment setups'] },
  { name: 'Blender', category: 'Creative', level: 3, color: '#e79b5a', built: ['The NamanCraft voxel world pipeline', 'House, clock tower & terrace geometry'] },
  { name: 'SQL', category: 'Database', level: 3, color: '#9ecbff', built: ['Structured data coursework', 'Analytics queries & reporting'] },
  { name: 'C / C++', category: 'Language', level: 3, color: '#b9c2cc', built: ['Autonomous driving perception modules', 'Systems programming practice'] },
  { name: 'AI / ML', category: 'Specialty', level: 4, color: '#ffe066', built: ['Deepfake detection models', 'Story generation features', 'Computer vision experiments'] },
]

// Temple of the Past — resume sections. Honest stubs where public data
// doesn't exist yet; edit here when adding real entries.
export const RESUME = {
  education: [
    { k: 'Focus', v: 'Computer Science — engineering coursework' },
    { k: 'Base', v: 'Agra, Uttar Pradesh, India' },
    { k: 'Note', v: 'Details landing soon — ask me directly meanwhile' },
  ],
  experience: [
    { k: 'Now', v: 'Creative developer — shipping NamanCraft & AI projects' },
    { k: '2025', v: 'Started pushing real projects publicly at github.com/namann5' },
    { k: 'Quests', v: 'Deepfake detection · Autonomous driving · AI customer service' },
  ],
  oss: [
    { k: 'Rocket.Chat', v: 'Contributions merged upstream' },
    { k: 'MergeShip', v: 'Contributions merged upstream' },
    { k: 'SecuScan', v: 'Security scanner improvements' },
    { k: 'UltimateHealth', v: 'Health-platform fixes & features' },
  ],
  projects: [
    { k: 'AI Deepfake Detection', v: 'Flagship — catches synthetic media end to end' },
    { k: 'Autonomous Driving Systems', v: 'Perception, planning and control, clean architecture' },
    { k: 'AI Customer Service', v: 'Full-stack support platform with context memory' },
    { k: 'More', v: 'Explore the Fort Quarter for the full tour' },
  ],
  certifications: [
    { k: 'Status', v: 'Vault still sealed — certifications coming soon' },
  ],
}

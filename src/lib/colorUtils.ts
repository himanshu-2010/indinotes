export type ColorPalette = {
  pen: string
  text: string
  shape: string
  grid: string
  textInputBg: string
  textInputColor: string
  name: string
}

export type StyleCollection = {
  id: string
  name: string
  bgColor: string
  palette: ColorPalette
}

export function luminance(hex: string): number {
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16) / 255
  const g = parseInt(c.substring(2, 4), 16) / 255
  const b = parseInt(c.substring(4, 6), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function isDark(hex: string): boolean {
  return luminance(hex) < 0.5
}

export function autoColors(bgColor: string): ColorPalette {
  const dark = isDark(bgColor)
  return {
    pen: dark ? '#ffffff' : '#1a1a1a',
    text: dark ? '#f0f0f0' : '#1a1a1a',
    shape: dark ? '#f0c880' : '#c89650',
    grid: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    textInputBg: dark ? '#2a2a2a' : '#ffffff',
    textInputColor: dark ? '#f0f0f0' : '#1a1a1a',
    name: dark ? 'Dark' : 'Light',
  }
}

export const STYLE_COLLECTIONS: StyleCollection[] = [
  {
    id: 'dark-charcoal',
    name: 'Dark Charcoal',
    bgColor: '#1e1e1e',
    palette: {
      pen: '#ffffff', text: '#f0f0f0', shape: '#f0c880',
      grid: 'rgba(255,255,255,0.08)', textInputBg: '#2a2a2a', textInputColor: '#f0f0f0', name: 'Dark',
    },
  },
  {
    id: 'dark-navy',
    name: 'Dark Navy',
    bgColor: '#1a1d2e',
    palette: {
      pen: '#e8edff', text: '#d0d8f0', shape: '#7eb8e0',
      grid: 'rgba(200,220,255,0.08)', textInputBg: '#22263a', textInputColor: '#d0d8f0', name: 'Dark',
    },
  },
  {
    id: 'light-paper',
    name: 'Light Paper',
    bgColor: '#f5f0e8',
    palette: {
      pen: '#1a1a1a', text: '#1a1a1a', shape: '#b8860b',
      grid: 'rgba(0,0,0,0.07)', textInputBg: '#ffffff', textInputColor: '#1a1a1a', name: 'Light',
    },
  },
  {
    id: 'clean-white',
    name: 'Clean White',
    bgColor: '#ffffff',
    palette: {
      pen: '#1a1a1a', text: '#1a1a1a', shape: '#c89650',
      grid: 'rgba(0,0,0,0.06)', textInputBg: '#f8f8f8', textInputColor: '#1a1a1a', name: 'Light',
    },
  },
  {
    id: 'sepia',
    name: 'Sepia',
    bgColor: '#c8b896',
    palette: {
      pen: '#2a2010', text: '#2a2010', shape: '#8b6508',
      grid: 'rgba(0,0,0,0.1)', textInputBg: '#e0d5c0', textInputColor: '#2a2010', name: 'Light',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    bgColor: '#0d1b2a',
    palette: {
      pen: '#b8d8f0', text: '#c8e0f8', shape: '#4a9bd9',
      grid: 'rgba(100,180,255,0.08)', textInputBg: '#142438', textInputColor: '#c8e0f8', name: 'Dark',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    bgColor: '#1a2e1a',
    palette: {
      pen: '#d0e8c8', text: '#e0f0d8', shape: '#7db86b',
      grid: 'rgba(100,200,100,0.08)', textInputBg: '#1e341e', textInputColor: '#e0f0d8', name: 'Dark',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    bgColor: '#0a0a10',
    palette: {
      pen: '#d0d0e0', text: '#c0c0d0', shape: '#8877cc',
      grid: 'rgba(150,130,255,0.07)', textInputBg: '#14141e', textInputColor: '#c0c0d0', name: 'Dark',
    },
  },
]

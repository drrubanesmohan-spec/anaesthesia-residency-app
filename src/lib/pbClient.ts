import PocketBase from 'pocketbase'

const pbUrl = import.meta.env.VITE_PB_URL as string

if (!pbUrl) {
  throw new Error('Missing VITE_PB_URL in .env.local')
}

export const pb = new PocketBase(pbUrl)

// Keep token fresh across page reloads
pb.autoCancellation(false)

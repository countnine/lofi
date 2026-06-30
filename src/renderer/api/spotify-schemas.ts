import { z } from 'zod';

// Runtime schemas for the handful of Spotify Web API responses the app actually
// reads. They are intentionally lenient — `.passthrough()` keeps unknown fields
// and most leaves are optional/nullable — so the real track/episode/ad payload
// variants never get falsely rejected. The goal is a safety net that turns a
// genuinely malformed body (e.g. an error object slipping through with a 200)
// into a graceful null instead of a downstream crash, not a strict contract.

const spotifyImageSchema = z
  .object({
    url: z.string(),
    height: z.number().nullish(),
    width: z.number().nullish(),
  })
  .passthrough();

// GET /me — only `product` (premium detection) and the display fields are read.
// Kept maximally permissive so a missing optional scope (e.g. email) or an extra
// field can never break the just-fixed login flow.
export const spotifyAccountSchema = z
  .object({
    id: z.string().optional(),
    product: z.string().optional(),
    email: z.string().optional(),
    display_name: z.string().nullish(),
    images: z.array(spotifyImageSchema).optional(),
  })
  .passthrough();

const spotifyItemSchema = z
  .object({
    album: z
      .object({
        name: z.string().optional(),
        images: z.array(spotifyImageSchema).optional(),
      })
      .passthrough()
      .nullish(),
    artists: z.array(z.object({ name: z.string() }).passthrough()).optional(),
    description: z.string().optional(),
    id: z.string().optional(),
    images: z.array(spotifyImageSchema).optional(),
    duration_ms: z.number().optional(),
    name: z.string().optional(),
    type: z.string().optional(),
  })
  .passthrough();

// GET /me/player — `device` is required because the reducer destructures
// `device.volume_percent`; if Spotify ever omits it, failing validation (→ null)
// is safer than letting the reducer throw.
export const spotifyCurrentlyPlayingSchema = z
  .object({
    device: z
      .object({
        volume_percent: z.number().nullable(),
      })
      .passthrough(),
    progress_ms: z.number().nullish(),
    item: spotifyItemSchema.nullable(),
    is_playing: z.boolean(),
  })
  .passthrough();

// GET /me/tracks/contains — a flat boolean array.
export const likedTracksSchema = z.array(z.boolean());

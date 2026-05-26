-- 2026-05-26: Add `attachments` JSONB column to profile_messages.
--
-- Hermes weixin.py now uploads each ingested media file (image/voice/video/file)
-- to the `peer-media` Supabase Storage bucket and records a structured row in
-- MessageEvent.media_attachments.  profile_sync.py forwards that field to
-- profile_messages.attachments so the /peer/u/<profile> UI can render real
-- thumbnails + lightbox via /api/peer?action=media&path=...
--
-- Structure (JSON array of objects):
--   [
--     {
--       "type": "image" | "voice" | "video" | "file",
--       "storage_path": "media/<profile>/<YYYY-MM>/<uuid>.<ext>",
--       "mime": "image/jpeg",
--       "size_bytes": 12345
--     },
--     ...
--   ]
--
-- Run this once in Supabase Dashboard → SQL Editor.  Idempotent.

ALTER TABLE profile_messages
  ADD COLUMN IF NOT EXISTS attachments JSONB;

-- GIN index on the non-null subset only — most messages have no attachments.
CREATE INDEX IF NOT EXISTS profile_messages_attachments_idx
  ON profile_messages USING GIN (attachments)
  WHERE attachments IS NOT NULL;

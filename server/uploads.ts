import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// ─── Upload dir: UPLOADS_PATH env var or <cwd>/uploads/quotes ─────────────────
// Lives next to chassis.db so a single directory backup captures the whole app.
export const quotesUploadDir =
  process.env.UPLOADS_PATH ?? path.join(process.cwd(), "uploads", "quotes");

fs.mkdirSync(quotesUploadDir, { recursive: true });

// Document types manufacturers actually send: PDFs, Office docs, and photos.
const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt",
  ".png", ".jpg", ".jpeg", ".gif", ".webp",
]);

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB per file
const MAX_FILES = 10;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, quotesUploadDir),
  filename: (_req, file, cb) => {
    // Random stored name; the original name lives in the DB and is used on download
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

export const quoteUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error(`File type "${ext}" is not allowed`));
    }
    cb(null, true);
  },
});

// Browsers encode multipart filenames as latin1; recover the UTF-8 original.
export function decodeOriginalName(name: string): string {
  try { return Buffer.from(name, "latin1").toString("utf8"); } catch { return name; }
}

export function deleteStoredFile(fileName: string): void {
  // Stored names are server-generated UUIDs, but guard against traversal anyway
  const resolved = path.resolve(quotesUploadDir, path.basename(fileName));
  fs.rm(resolved, { force: true }, () => {});
}

export function storedFilePath(fileName: string): string {
  return path.resolve(quotesUploadDir, path.basename(fileName));
}

import dotenv from "dotenv";
import ImageKit from "imagekit";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", "..", ".env"), override: false });

const publicKey = String(process.env.IMAGEKIT_PUBLIC_KEY || "").trim();
const privateKey = String(process.env.IMAGEKIT_PRIVATE_KEY || "").trim();
const urlEndpoint = String(process.env.IMAGEKIT_URL_ENDPOINT || "").trim().replace(/\/+$/, "");

const hasImageKitConfig = Boolean(publicKey && privateKey && urlEndpoint);

if (!hasImageKitConfig) {
  console.warn(
    "[imagekit] Missing IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, or IMAGEKIT_URL_ENDPOINT."
  );
}

const imagekit = hasImageKitConfig
  ? new ImageKit({
      publicKey,
      privateKey,
      urlEndpoint,
    })
  : null;

export { hasImageKitConfig, publicKey, privateKey, urlEndpoint };
export default imagekit;

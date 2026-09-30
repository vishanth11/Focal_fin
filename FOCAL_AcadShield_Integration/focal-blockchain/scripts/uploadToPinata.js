/**
 * FOCAL Pinata Upload Helper
 *
 * Uploads the badge image and the verified metadata JSON to Pinata/IPFS.
 * Uses Node.js native fetch and FormData (Node 18+).
 *
 * Required .env variables:
 *   PINATA_JWT - Pinata JWT (recommended)
 *   or
 *   PINATA_API_KEY + PINATA_SECRET_API_KEY - legacy key pair
 *
 * Run:
 *   node scripts/uploadToPinata.js
 *
 * Output:
 *   - Image CID
 *   - Metadata CID
 *   - Final tokenURI to use with updateBadgeURI()
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");

const ASSETS_DIR = path.join(__dirname, "..", "assets");
const METADATA_DIR = path.join(__dirname, "..", "metadata");

function getAuthHeaders() {
  if (process.env.PINATA_JWT) {
    return { Authorization: `Bearer ${process.env.PINATA_JWT}` };
  }
  if (process.env.PINATA_API_KEY && process.env.PINATA_SECRET_API_KEY) {
    return {
      pinata_api_key: process.env.PINATA_API_KEY,
      pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
    };
  }
  throw new Error("Pinata credentials missing. Set PINATA_JWT or PINATA_API_KEY + PINATA_SECRET_API_KEY in .env");
}

async function uploadFile(filePath, name) {
  const fileBuffer = fs.readFileSync(filePath);
  const form = new FormData();
  form.append("file", new Blob([fileBuffer]), name);
  form.append("pinataMetadata", JSON.stringify({ name }));

  const headers = getAuthHeaders();

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      ...headers,
    },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pinata upload failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.IpfsHash;
}

async function uploadJson(data, name) {
  const jsonBuffer = Buffer.from(JSON.stringify(data));
  const form = new FormData();
  form.append("file", new Blob([jsonBuffer], { type: "application/json" }), name);
  form.append("pinataMetadata", JSON.stringify({ name }));

  const headers = getAuthHeaders();

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      ...headers,
    },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pinata upload failed: ${response.status} ${text}`);
  }

  const result = await response.json();
  return result.IpfsHash;
}

async function main() {
  // Prefer green-badge.png if available; fall back to SVG.
  const imageFileName = fs.existsSync(path.join(ASSETS_DIR, "green-badge.png"))
    ? "green-badge.png"
    : "green-badge.svg";
  const imageFilePath = path.join(ASSETS_DIR, imageFileName);
  const metadataFilePath = path.join(METADATA_DIR, "technova-pvt-ltd-verified.json");

  if (!fs.existsSync(imageFilePath)) {
    throw new Error(`Badge image not found at ${imageFilePath}`);
  }
  if (!fs.existsSync(metadataFilePath)) {
    throw new Error(`Metadata file not found at ${metadataFilePath}`);
  }

  console.log("Uploading badge image:", imageFileName);
  const imageCid = await uploadFile(imageFilePath, imageFileName);
  console.log("Image CID:", imageCid);

  // Update the metadata JSON with the real image CID before uploading metadata.
  const metadata = JSON.parse(fs.readFileSync(metadataFilePath, "utf8"));
  metadata.image = `ipfs://${imageCid}`;
  fs.writeFileSync(metadataFilePath, JSON.stringify(metadata, null, 2));
  console.log("Updated metadata image URI to:", metadata.image);

  console.log("Uploading metadata JSON...");
  const metadataCid = await uploadJson(metadata, "technova-pvt-ltd-verified.json");
  const finalTokenURI = `ipfs://${metadataCid}`;
  console.log("Metadata CID:", metadataCid);
  console.log("Final tokenURI:", finalTokenURI);

  // Save the tokenURI for the update script.
  fs.writeFileSync(path.join(__dirname, "..", ".tokenuri"), finalTokenURI);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});

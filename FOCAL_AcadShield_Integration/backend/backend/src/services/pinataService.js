const fs = require('fs');
const path = require('path');
const env = require('../config/env');

const DEFAULT_IMAGE_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'focal-blockchain',
  'assets',
  'green-badge.svg'
);

function getAuthHeaders() {
  if (env.pinataJwt) {
    return { Authorization: `Bearer ${env.pinataJwt}` };
  }
  if (env.pinataApiKey && env.pinataSecretApiKey) {
    return {
      pinata_api_key: env.pinataApiKey,
      pinata_secret_api_key: env.pinataSecretApiKey
    };
  }
  throw new Error('Pinata credentials are not configured');
}

async function parseResponse(response) {
  if (!response.ok) {
    throw new Error(`Pinata upload failed with status ${response.status}`);
  }
  return response.json();
}

async function uploadFile(filePath, name) {
  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(filePath)]), name);
  form.append('pinataMetadata', JSON.stringify({ name }));

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: form
  });
  const result = await parseResponse(response);
  if (!result.IpfsHash) {
    throw new Error('Pinata did not return an image CID');
  }
  return result.IpfsHash;
}

async function uploadJson(metadata, name) {
  const form = new FormData();
  form.append(
    'file',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' }),
    name
  );
  form.append('pinataMetadata', JSON.stringify({ name }));

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: form
  });
  const result = await parseResponse(response);
  if (!result.IpfsHash) {
    throw new Error('Pinata did not return a metadata CID');
  }
  return result.IpfsHash;
}

async function uploadBadgeMetadata(metadata, fileName) {
  const imagePath = env.badgeImagePath || DEFAULT_IMAGE_PATH;
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Badge image not found at ${imagePath}`);
  }

  const imageCid = await uploadFile(imagePath, path.basename(imagePath));
  const metadataWithImage = { ...metadata, image: `ipfs://${imageCid}` };
  const metadataCid = await uploadJson(metadataWithImage, fileName);

  return {
    imageCid,
    metadataCid,
    tokenURI: `ipfs://${metadataCid}`,
    metadata: metadataWithImage
  };
}

module.exports = { uploadBadgeMetadata };
const crypto = require("crypto");

const BIT_COUNT = 1_000_000;
const HASH_COUNT = 7;
const bits = new Uint8Array(Math.ceil(BIT_COUNT / 8));
let initialized = false;

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function indexes(value) {
  const digest = crypto.createHash("sha256").update(normalize(value)).digest();
  const first = digest.readUInt32BE(0);
  const second = digest.readUInt32BE(4) || 1;
  return Array.from({ length: HASH_COUNT }, (_, i) => (first + i * second) % BIT_COUNT);
}

function setBit(index) {
  bits[Math.floor(index / 8)] |= 1 << (index % 8);
}

function getBit(index) {
  return (bits[Math.floor(index / 8)] & (1 << (index % 8))) !== 0;
}

function add(username) {
  indexes(username).forEach(setBit);
}

function mightContain(username) {
  return indexes(username).every(getBit);
}

async function initialize(User) {
  if (initialized) return;
  const users = await User.find().select("username").lean();
  users.forEach(({ username }) => add(username));
  initialized = true;
}

function isInitialized() {
  return initialized;
}

module.exports = { add, mightContain, initialize, isInitialized, normalize };

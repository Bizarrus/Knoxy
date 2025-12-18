/*
 * @author SeBiTM
 **/
import crypto from 'node:crypto';

// DH Prime wie in Java
const DH_PRIME_HEX =
  'FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD1' +
  '29024E088A67CC74020BBEA63B139B22514A08798E3404DD' +
  'EF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245' +
  'E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7ED' +
  'EE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3D' +
  'C2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F' +
  '83655D23DCA3AD961C62F356208552BB9ED529077096966D' +
  '670C354E4ABC9804F1746C08CA237327FFFFFFFFFFFFFFFF';

const DH_P = BigInt('0x' + DH_PRIME_HEX);
const DH_G = 2n;

const IV_LEN = 12;
const AES_KEY_LEN = 16; // 16 bytes = AES-128
const HMAC_ALGO = 'sha256';

function randomBigIntBelow(maxExclusive) {
  // maxExclusive ~ p-2 (2048 Bit) -> 256 Byte
  const byteLen = Math.ceil((maxExclusive.toString(2).length) / 8);
  while (true) {
    const buf = crypto.randomBytes(byteLen);
    let bi = BigInt('0x' + buf.toString('hex'));
    if (bi > 1n && bi < maxExclusive) {
      return bi;
    }
  }
}

// modular exponentiation: base^exp mod mod
function modPow(base, exponent, modulus) {
  let result = 1n;
  base = base % modulus;
  while (exponent > 0n) {
    if (exponent & 1n) {
      result = (result * base) % modulus;
    }
    exponent >>= 1n;
    base = (base * base) % modulus;
  }
  return result;
}

// BigInteger.toByteArray() (signed magnitude) nachbauen
function bigIntToSignedBytes(bi) {
  if (bi === 0n) return Buffer.from([0]);

  let hex = bi.toString(16);
  if (hex.length % 2 === 1) hex = '0' + hex;
  let buf = Buffer.from(hex, 'hex');

  // Wenn höchstes Bit gesetzt ist → führendes 0x00 anhängen (positives Zweierkomplement)
  if (buf[0] & 0x80) {
    buf = Buffer.concat([Buffer.from([0x00]), buf]);
  }

  return buf;
}

// Java: new BigInteger(1, bytes) => positive BigInt aus unsigned Bytes
function unsignedBytesToBigInt(buf) {
  if (buf.length === 0) return 0n;
  return BigInt('0x' + buf.toString('hex'));
}

// HKDF-Expand mit HMAC-SHA256 (ohne Salt), info optional
function hkdfExpand(secretBuf, infoBuf, len) {
  let prev = Buffer.alloc(0);
  let out = Buffer.alloc(0);
  const hashLen = 32;
  const n = Math.ceil(len / hashLen);

  for (let i = 1; i <= n; i++) {
    const hmac = crypto.createHmac(HMAC_ALGO, secretBuf);
    hmac.update(prev);
    if (infoBuf) hmac.update(infoBuf);
    hmac.update(Buffer.from([i]));
    prev = hmac.digest();
    out = Buffer.concat([out, prev]);
  }

  return out.subarray(0, len);
}

export default class CryptoSession {
  constructor() {
    // Java: DHParameterSpec(DH_P, DH_G) + KeyPairGenerator("DiffieHellman")
    // Wir bauen das per Hand mit BigInt nach
    const maxPriv = DH_P - 2n;        // priv in [2, p-2]
    this.priv = randomBigIntBelow(maxPriv); // entspricht X (DHPrivateKey.getX())

    // public: Y = G^X mod P
    this.pub = modPow(DH_G, this.priv, DH_P); // DHPublicKey.getY()

    this.aesKey = null;
  }

  // Java: ((DHPublicKey) keyPair.getPublic()).getY().toByteArray()
  getPublicKey() {
    return bigIntToSignedBytes(this.pub);
  }

  hasAesKey() {
    return this.aesKey !== null;
  }

  // Java:
  // BigInteger other = new BigInteger(1, otherPub);
  // BigInteger priv  = ((DHPrivateKey) keyPair.getPrivate()).getX();
  // BigInteger shared = other.modPow(priv, DH_P);
  // sharedBytes = shared.toByteArray();
  // aesKey = hkdfExpand(sharedBytes, null, 16)
  computeSharedSecret(otherPub) {
    if (!otherPub || otherPub.length === 0 || otherPub.length > 256) {
      throw new Error('Invalid DH pubkey size: ' + (otherPub ? otherPub.length : 0));
    }

    const other = unsignedBytesToBigInt(Buffer.from(otherPub)); // BigInteger(1, otherPub)
    const shared = modPow(other, this.priv, DH_P);              // other^priv mod P

    const sharedBytes = bigIntToSignedBytes(shared);            // shared.toByteArray()

    const aesKey = hkdfExpand(sharedBytes, null, AES_KEY_LEN);  // HKDF-Expand

    this.aesKey = aesKey;
  }

  encrypt(plain) {
    if (!this.hasAesKey()) {
      throw new Error('No AES key!');
    }

    const iv = crypto.randomBytes(IV_LEN);
    const cipher = crypto.createCipheriv('aes-128-gcm', this.aesKey, iv);

    const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
    const tag = cipher.getAuthTag();

    // Java:
    // encrypted = cipher.doFinal(plain) => cipherWithTag
    // out = iv || encrypted
    const out = Buffer.concat([iv, encrypted, tag]);

    return out;
  }

  decrypt(enc) {
    if (!this.hasAesKey()) {
      throw new Error('No AES key!');
    }

    const buf = Buffer.from(enc);
    const iv = buf.subarray(0, IV_LEN);
    const cipherWithTag = buf.subarray(IV_LEN);

    // Java: cipherWithTag = ciphertext || tag
    // GCM-Tag ist 16 Byte
    if (cipherWithTag.length < 16) {
      throw new Error('Ciphertext too short');
    }

    const tag = cipherWithTag.subarray(cipherWithTag.length - 16);
    const ciphertext = cipherWithTag.subarray(0, cipherWithTag.length - 16);

    const decipher = crypto.createDecipheriv('aes-128-gcm', this.aesKey, iv);
    decipher.setAuthTag(tag);

    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plain;
  }
}

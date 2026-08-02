/**
 * Canonical wallet-signature login/link message, modeled on Sign-In-With-Ethereum (EIP-4361)
 * but generalized across Algorand/Solana/EVM. Every field required by spec section 8 is
 * present and line-anchored so it can be both human-reviewed in a wallet's signing prompt
 * and parsed back deterministically.
 */

export interface WalletSignaturePayload {
  domain: string;
  address: string;
  chain: "algorand" | "solana" | "evm";
  uri: string;
  purpose: "login" | "wallet_link";
  nonce: string;
  issuedAt: string; // ISO 8601
  expiresAt: string; // ISO 8601
}

export function buildWalletSignatureMessage(payload: WalletSignaturePayload): string {
  return [
    `${payload.domain} wants you to sign in with your ${payload.chain} account:`,
    payload.address,
    "",
    `Purpose: ${payload.purpose}`,
    `URI: ${payload.uri}`,
    `Chain: ${payload.chain}`,
    `Nonce: ${payload.nonce}`,
    `Issued At: ${payload.issuedAt}`,
    `Expiration Time: ${payload.expiresAt}`,
  ].join("\n");
}

export class WalletMessageParseError extends Error {}

export function parseWalletSignatureMessage(message: string): WalletSignaturePayload {
  const lines = message.split("\n");
  if (lines.length < 9) {
    throw new WalletMessageParseError(
      "Message has too few lines to be a valid wallet signature payload",
    );
  }

  const domainLine = lines[0];
  const domainMatch = domainLine.match(
    /^(.+) wants you to sign in with your (algorand|solana|evm) account:$/,
  );
  if (!domainMatch) {
    throw new WalletMessageParseError("Could not parse domain/chain header line");
  }

  const address = lines[1];
  const field = (label: string, line: string): string => {
    const prefix = `${label}: `;
    if (!line.startsWith(prefix)) {
      throw new WalletMessageParseError(`Expected line starting with "${prefix}", got "${line}"`);
    }
    return line.slice(prefix.length);
  };

  const purpose = field("Purpose", lines[3]);
  if (purpose !== "login" && purpose !== "wallet_link") {
    throw new WalletMessageParseError(`Unknown purpose: ${purpose}`);
  }

  return {
    domain: domainMatch[1],
    address,
    chain: domainMatch[2] as WalletSignaturePayload["chain"],
    purpose,
    uri: field("URI", lines[4]),
    nonce: field("Nonce", lines[6]),
    issuedAt: field("Issued At", lines[7]),
    expiresAt: field("Expiration Time", lines[8]),
  };
}

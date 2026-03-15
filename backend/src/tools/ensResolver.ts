// ============================================================
// ChainPilot AI — Tool: ENS Resolver
// ============================================================
// Resolves ENS names to Ethereum addresses and vice versa.
//
// resolveEns(name)       → { address, name }
// lookupAddress(address) → ENS name or null
// ============================================================

import { ethers } from 'ethers';
import * as alchemyService from '../services/alchemyService';

/**
 * Resolve an ENS name to an Ethereum address
 */
export async function resolveEns(name: string): Promise<{
  address: string;
  ensName: string;
}> {
  if (!name.endsWith('.eth')) {
    throw new Error(`Invalid ENS name: ${name}. Must end with .eth`);
  }

  const provider = alchemyService.getProvider();
  const address = await provider.resolveName(name);

  if (!address) {
    throw new Error(`Could not resolve ENS name: ${name}. The name may not be registered.`);
  }

  return {
    address,
    ensName: name,
  };
}

/**
 * Reverse lookup: address → ENS name
 */
export async function lookupAddress(address: string): Promise<string | null> {
  if (!ethers.isAddress(address)) {
    throw new Error(`Invalid Ethereum address: ${address}`);
  }

  const provider = alchemyService.getProvider();

  try {
    const name = await provider.lookupAddress(address);
    return name;
  } catch {
    return null;
  }
}

/**
 * Resolve an input that could be either an ENS name or an address
 * Returns a normalized address in both cases
 */
export async function resolveAddressOrEns(input: string): Promise<{
  address: string;
  ensName: string | null;
  isEns: boolean;
}> {
  if (input.endsWith('.eth')) {
    const result = await resolveEns(input);
    return {
      address: result.address,
      ensName: result.ensName,
      isEns: true,
    };
  }

  if (ethers.isAddress(input)) {
    // Try reverse lookup
    let ensName: string | null = null;
    try {
      ensName = await lookupAddress(input);
    } catch {
      // Ignore
    }

    return {
      address: input,
      ensName,
      isEns: false,
    };
  }

  throw new Error(
    `Invalid input: "${input}". Must be a valid Ethereum address (0x...) or ENS name (*.eth)`
  );
}

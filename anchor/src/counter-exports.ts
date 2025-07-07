// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import BettingDappIDL from '../target/idl/betting_dapp.json'
import type { BettingDapp } from '../target/types/betting_dapp'

// Re-export the generated IDL and type
export { BettingDapp, BettingDappIDL }

// The programId is imported from the program IDL.
export const BETTING_PROGRAM_ID = new PublicKey(BettingDappIDL.address)

// This is a helper function to get the BettingDapp Anchor program.
export function getBettingProgram(provider: AnchorProvider, address?: PublicKey): Program<BettingDapp> {
  return new Program(
    { ...BettingDappIDL, address: address ? address.toBase58() : BettingDappIDL.address } as BettingDapp,
    provider,
  )
}

// This is a helper function to get the program ID for the BettingDapp program depending on the cluster.
export function getBettingProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
      // This is the program ID for the BettingDapp program on devnet and testnet.
      // Update this with your actual deployed program ID on devnet/testnet
      return new PublicKey('22hXmGnod6ytgUPuNaj3UCYj9aamhgVa4fjDed16ob1R')
    case 'mainnet-beta':
    default:
      return BETTING_PROGRAM_ID
  }
}

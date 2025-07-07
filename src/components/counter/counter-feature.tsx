'use client'

import { ellipsify } from '@/lib/utils'
import { useWallet } from '@solana/wallet-adapter-react'
import { AppHero } from '../app-hero'
import { ExplorerLink } from '../cluster/cluster-ui'
import { WalletButton } from '../solana/solana-provider'
import { useBettingProgram } from './counter-data-access'
import { BettingCreate, BettingList } from './counter-ui'

export default function BettingFeature() {
  const { publicKey } = useWallet()
  const { programId, getProgramAccount } = useBettingProgram()

  return publicKey ? (
    <div>
      <AppHero
        title="Betting Platform"
        subtitle={
          "Create betting markets, place bets, and claim winnings. All bet states are stored on-chain and can be managed through the program's methods (create, place, resolve, claim, and cancel)."
        }
      >
        <p className="mb-6">
          <ExplorerLink path={`account/${programId}`} label={ellipsify(programId.toString())} />
        </p>
        {getProgramAccount.data?.value ? (
          <BettingCreate />
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-yellow-800">Program Not Deployed</h3>
            <p className="text-yellow-700 text-sm">
              The betting program is not deployed to this cluster. Please deploy it using:
            </p>
            <code className="block bg-yellow-100 text-yellow-800 p-2 rounded mt-2 text-xs">anchor deploy</code>
          </div>
        )}
      </AppHero>
      <BettingList />
    </div>
  ) : (
    <div className="max-w-4xl mx-auto">
      <div className="hero py-[64px]">
        <div className="hero-content text-center">
          <WalletButton />
        </div>
      </div>
    </div>
  )
}

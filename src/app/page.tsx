'use client'

import { useBettingProgram } from '@/components/betting/betting-data-access'
import { BettingList } from '@/components/betting/betting-ui'
import { WalletButton } from '@/components/solana/solana-provider'
import { useWallet } from '@solana/wallet-adapter-react'

export default function BettingFeature() {
  const { publicKey } = useWallet()
  const { programId, getProgramAccount } = useBettingProgram()

  return publicKey ? (
    <div>
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

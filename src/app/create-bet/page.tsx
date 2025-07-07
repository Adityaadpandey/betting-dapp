'use client'

import { useBettingProgram } from '@/components/betting/betting-data-access'
import { BettingCreate } from '@/components/betting/betting-ui'
import { WalletButton } from '@/components/solana/solana-provider'
import { useWallet } from '@solana/wallet-adapter-react'

export default function BettingFeature() {
  const { publicKey } = useWallet()
  const { programId, getProgramAccount } = useBettingProgram()

  if (!publicKey) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center text-center px-4">
        <h2 className="text-2xl font-semibold mb-4">Connect Your Wallet</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          To start using the betting platform, connect your Solana wallet.
        </p>
        <WalletButton className="w-full max-w-xs" />
      </div>
    )
  }

  const isProgramDeployed = !!getProgramAccount.data?.value

  return (
    <div className="flex justify-center items-center min-h-[60vh] px-4">
      {isProgramDeployed ? (
        <BettingCreate />
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-6 max-w-lg w-full shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Program Not Deployed</h3>
          <p className="text-sm mb-3">
            The betting program isn’t deployed to this cluster. To deploy it, run the following command:
          </p>
          <pre className="bg-yellow-100 text-yellow-900 text-xs font-mono p-3 rounded">anchor deploy</pre>
        </div>
      )}
    </div>
  )
}

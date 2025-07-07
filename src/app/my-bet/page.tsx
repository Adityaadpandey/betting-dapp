'use client'

import { useBettingProgram } from '@/components/betting/betting-data-access'
import { BettingCard } from '@/components/betting/betting-ui'

import { useAnchorProvider } from '@/components/solana/solana-provider'

function MyBetsPage() {
  const { allBets, getUserBets, getProgramAccount } = useBettingProgram()
  const provider = useAnchorProvider()

  // Check if wallet is connected
  if (!provider.wallet.publicKey) {
    return (
      <div className="container mx-auto p-6">
        <div className="alert alert-warning flex justify-center">
          <span>Please connect your wallet to view your bets.</span>
        </div>
      </div>
    )
  }

  if (getProgramAccount.isLoading || getUserBets.isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    )
  }

  if (!getProgramAccount.data?.value) {
    return (
      <div className="container mx-auto p-6">
        <div className="alert alert-info flex justify-center">
          <span>
            Program account not found. Make sure you have deployed the program and are on the correct cluster.
          </span>
        </div>
      </div>
    )
  }

  // Filter bets where user has placed money
  const userBets = getUserBets.data || []
  const userBetIds = userBets.map((bet) => bet.account.betId)
  const myActiveBets = allBets.data?.filter((bet) => userBetIds.includes(bet.account.betId)) || []

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">My Bets</h1>
        <p className="text-muted-foreground mt-2">Bets where you have placed money</p>
      </div>

      <div className="space-y-6">
        {allBets.isLoading ? (
          <div className="flex justify-center">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : myActiveBets.length > 0 ? (
          <div className="grid gap-4">
            {myActiveBets.map((bet) => (
              <BettingCard key={bet.publicKey.toString()} bet={bet} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="mb-4">
                <svg
                  className="mx-auto h-12 w-12 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-muted-foreground">No bets found</h2>
              <p className="text-muted-foreground mt-2">
                You haven't placed any bets yet. Go to the main betting page to start betting!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MyBetsPage

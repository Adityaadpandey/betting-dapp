'use client'

import { getBettingProgram, getBettingProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, PublicKey } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import BN from 'bn.js'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../use-transaction-toast'

// Types
interface CreateBetParams {
  description: string
  optionA: string
  optionB: string
  endTime: number
  minBetAmount: number
  maxBetAmount: number
  category: string
}

interface PlaceBetParams {
  betId: string
  option: number
  amount: number
}

interface ResolveBetParams {
  betId: string
  winningOption: number
  resultDetails: string
}

interface BetStats {
  totalPool: BN
  oddsA: BN
  oddsB: BN
  totalBettors: BN
  timeRemaining: BN
}

// Constants
const LAMPORTS_PER_SOL = 1_000_000_000
const DEFAULT_MIN_BET = 0.01 * LAMPORTS_PER_SOL // 0.01 SOL
const DEFAULT_MAX_BET = 100 * LAMPORTS_PER_SOL // 100 SOL

// Helper functions
const generateBetId = (description: string, timestamp: number): string => {
  const combined = `${description}_${timestamp}`
  return Buffer.from(combined).toString('base64').slice(0, 32)
}

const validateBetParams = (params: CreateBetParams): void => {
  if (!params.description.trim()) throw new Error('Description is required')
  if (!params.optionA.trim()) throw new Error('Option A is required')
  if (!params.optionB.trim()) throw new Error('Option B is required')
  if (!params.category.trim()) throw new Error('Category is required')
  if (params.endTime <= Date.now()) throw new Error('End time must be in the future')
  if (params.minBetAmount <= 0) throw new Error('Minimum bet amount must be positive')
  if (params.maxBetAmount < params.minBetAmount) throw new Error('Maximum bet amount must be >= minimum bet amount')
}

export function useBettingProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getBettingProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getBettingProgram(provider, programId), [provider, programId])

  const allBets = useQuery({
    queryKey: ['betting', 'all-bets', { cluster }],
    queryFn: () => program.account.betState.all(),
    refetchInterval: 10000, // Refetch every 10 seconds
  })

  const getUserBets = useQuery({
    queryKey: ['betting', 'user-bets', { cluster }],
    queryFn: () => program.account.userBetState.all(),
    refetchInterval: 10000,
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const createBet = useMutation({
    mutationKey: ['betting', 'create-bet', { cluster }],
    mutationFn: async (params: CreateBetParams) => {
      validateBetParams(params)

      const timestamp = Date.now()
      const betId = generateBetId(params.description, timestamp)

      const [betPda] = PublicKey.findProgramAddressSync([Buffer.from('bet'), Buffer.from(betId)], programId)

      return program.methods
        .createBet(
          betId,
          params.description,
          params.optionA,
          params.optionB,
          new BN(Math.floor(params.endTime / 1000)), // Convert to seconds
          new BN(params.minBetAmount || DEFAULT_MIN_BET),
          new BN(params.maxBetAmount || DEFAULT_MAX_BET),
          params.category,
        )
        .accounts({
          creator: provider.wallet.publicKey,
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await allBets.refetch()
      toast.success('Bet created successfully!')
    },
    onError: (error) => {
      console.error('Create bet error:', error)
      toast.error(`Failed to create bet: ${error.message}`)
    },
  })

  const placeBet = useMutation({
    mutationKey: ['betting', 'place-bet', { cluster }],
    mutationFn: async ({ betId, option, amount }: PlaceBetParams) => {
      if (!betId) throw new Error('Bet ID is required')
      if (option !== 1 && option !== 2) throw new Error('Option must be 1 or 2')
      if (amount <= 0) throw new Error('Amount must be positive')

      const [betPda] = PublicKey.findProgramAddressSync([Buffer.from('bet'), Buffer.from(betId)], programId)

      const [userBetPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_bet'), Buffer.from(betId), provider.wallet.publicKey.toBuffer()],
        programId,
      )

      return program.methods
        .placeBet(betId, option, new BN(amount))
        .accounts({
          user: provider.wallet.publicKey,
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await allBets.refetch()
      await getUserBets.refetch()
      toast.success('Bet placed successfully!')
    },
    onError: (error) => {
      console.error('Place bet error:', error)
      toast.error(`Failed to place bet: ${error.message}`)
    },
  })

  const resolveBet = useMutation({
    mutationKey: ['betting', 'resolve-bet', { cluster }],
    mutationFn: async ({ betId, winningOption, resultDetails }: ResolveBetParams) => {
      if (!betId) throw new Error('Bet ID is required')
      if (winningOption !== 1 && winningOption !== 2) throw new Error('Winning option must be 1 or 2')
      if (!resultDetails.trim()) throw new Error('Result details are required')

      const [betPda] = PublicKey.findProgramAddressSync([Buffer.from('bet'), Buffer.from(betId)], programId)

      return program.methods
        .resolveBet(betId, winningOption, resultDetails)
        .accounts({
          creator: provider.wallet.publicKey,
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await allBets.refetch()
      toast.success('Bet resolved successfully!')
    },
    onError: (error) => {
      console.error('Resolve bet error:', error)
      toast.error(`Failed to resolve bet: ${error.message}`)
    },
  })

  const claimWinnings = useMutation({
    mutationKey: ['betting', 'claim-winnings', { cluster }],
    mutationFn: async ({ betId }: { betId: string }) => {
      if (!betId) throw new Error('Bet ID is required')

      const [betPda] = PublicKey.findProgramAddressSync([Buffer.from('bet'), Buffer.from(betId)], programId)

      const [userBetPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_bet'), Buffer.from(betId), provider.wallet.publicKey.toBuffer()],
        programId,
      )

      return program.methods
        .claimWinnings(betId)
        .accounts({
          user: provider.wallet.publicKey,
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await allBets.refetch()
      await getUserBets.refetch()
      toast.success('Winnings claimed successfully!')
    },
    onError: (error) => {
      console.error('Claim winnings error:', error)
      toast.error(`Failed to claim winnings: ${error.message}`)
    },
  })

  const claimMakerFees = useMutation({
    mutationKey: ['betting', 'claim-maker-fees', { cluster }],
    mutationFn: async ({ betId }: { betId: string }) => {
      if (!betId) throw new Error('Bet ID is required')

      const [betPda] = PublicKey.findProgramAddressSync([Buffer.from('bet'), Buffer.from(betId)], programId)

      return program.methods
        .claimMakerFees(betId)
        .accounts({
          creator: provider.wallet.publicKey,
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await allBets.refetch()
      toast.success('Maker fees claimed successfully!')
    },
    onError: (error) => {
      console.error('Claim maker fees error:', error)
      toast.error(`Failed to claim maker fees: ${error.message}`)
    },
  })

  const cancelBet = useMutation({
    mutationKey: ['betting', 'cancel-bet', { cluster }],
    mutationFn: async ({ betId }: { betId: string }) => {
      if (!betId) throw new Error('Bet ID is required')

      const [betPda] = PublicKey.findProgramAddressSync([Buffer.from('bet'), Buffer.from(betId)], programId)

      return program.methods
        .cancelBet(betId)
        .accounts({
          creator: provider.wallet.publicKey,
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await allBets.refetch()
      toast.success('Bet cancelled successfully!')
    },
    onError: (error) => {
      console.error('Cancel bet error:', error)
      toast.error(`Failed to cancel bet: ${error.message}`)
    },
  })

  return {
    program,
    programId,
    allBets,
    getUserBets,
    getProgramAccount,
    createBet,
    placeBet,
    resolveBet,
    claimWinnings,
    claimMakerFees,
    cancelBet,
  }
}

export function useBettingProgramAccount({ betId }: { betId: string }) {
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const { program, allBets, getUserBets, programId } = useBettingProgram()
  const provider = useAnchorProvider()

  const [betPda] = useMemo(
    () => PublicKey.findProgramAddressSync([Buffer.from('bet'), Buffer.from(betId)], programId),
    [betId, programId],
  )

  const [userBetPda] = useMemo(
    () =>
      PublicKey.findProgramAddressSync(
        [Buffer.from('user_bet'), Buffer.from(betId), provider.wallet.publicKey.toBuffer()],
        programId,
      ),
    [betId, programId, provider.wallet.publicKey],
  )

  const betQuery = useQuery({
    queryKey: ['betting', 'fetch-bet', { cluster, betId }],
    queryFn: () => program.account.betState.fetch(betPda),
    enabled: !!betId,
    refetchInterval: 5000,
  })

  const userBetQuery = useQuery({
    queryKey: ['betting', 'fetch-user-bet', { cluster, betId }],
    queryFn: async () => {
      try {
        return await program.account.userBetState.fetch(userBetPda)
      } catch (error) {
        // Return null if user bet doesn't exist
        return null
      }
    },
    enabled: !!betId,
    refetchInterval: 5000,
  })

  const getBetStats = useQuery({
    queryKey: ['betting', 'bet-stats', { cluster, betId }],
    queryFn: async (): Promise<BetStats> => {
      const [betStatsPda] = PublicKey.findProgramAddressSync([Buffer.from('bet'), Buffer.from(betId)], programId)

      return program.methods
        .getBetStats(betId)
        .accounts({
          bet: betStatsPda,
        })
        .view()
    },
    enabled: !!betId && !!betQuery.data,
    refetchInterval: 5000,
  })

  const placeBetMutation = useMutation({
    mutationKey: ['betting', 'place-bet', { cluster, betId }],
    mutationFn: async ({ option, amount }: { option: number; amount: number }) => {
      if (option !== 1 && option !== 2) throw new Error('Option must be 1 or 2')
      if (amount <= 0) throw new Error('Amount must be positive')

      return program.methods
        .placeBet(betId, option, new BN(amount))
        .accounts({
          user: provider.wallet.publicKey,
        })
        .rpc()
    },
    onSuccess: async (tx) => {
      transactionToast(tx)
      await Promise.all([
        betQuery.refetch(),
        userBetQuery.refetch(),
        getBetStats.refetch(),
        allBets.refetch(),
        getUserBets.refetch(),
      ])
      toast.success('Bet placed successfully!')
    },
    onError: (error) => {
      console.error('Place bet error:', error)
      toast.error(`Failed to place bet: ${error.message}`)
    },
  })

  const resolveBetMutation = useMutation({
    mutationKey: ['betting', 'resolve-bet', { cluster, betId }],
    mutationFn: async ({ winningOption, resultDetails }: { winningOption: number; resultDetails: string }) => {
      if (winningOption !== 1 && winningOption !== 2) throw new Error('Winning option must be 1 or 2')
      if (!resultDetails.trim()) throw new Error('Result details are required')

      return program.methods
        .resolveBet(betId, winningOption, resultDetails)
        .accounts({
          creator: provider.wallet.publicKey,
        })
        .rpc()
    },
    onSuccess: async (tx) => {
      transactionToast(tx)
      await Promise.all([betQuery.refetch(), getBetStats.refetch(), allBets.refetch()])
      toast.success('Bet resolved successfully!')
    },
    onError: (error) => {
      console.error('Resolve bet error:', error)
      toast.error(`Failed to resolve bet: ${error.message}`)
    },
  })

  const claimWinningsMutation = useMutation({
    mutationKey: ['betting', 'claim-winnings', { cluster, betId }],
    mutationFn: async () => {
      return program.methods
        .claimWinnings(betId)
        .accounts({
          user: provider.wallet.publicKey,
        })
        .rpc()
    },
    onSuccess: async (tx) => {
      transactionToast(tx)
      await Promise.all([betQuery.refetch(), userBetQuery.refetch(), allBets.refetch(), getUserBets.refetch()])
      toast.success('Winnings claimed successfully!')
    },
    onError: (error) => {
      console.error('Claim winnings error:', error)
      toast.error(`Failed to claim winnings: ${error.message}`)
    },
  })

  const claimMakerFeesMutation = useMutation({
    mutationKey: ['betting', 'claim-maker-fees', { cluster, betId }],
    mutationFn: async () => {
      return program.methods
        .claimMakerFees(betId)
        .accounts({
          creator: provider.wallet.publicKey,
        })
        .rpc()
    },
    onSuccess: async (tx) => {
      transactionToast(tx)
      await Promise.all([betQuery.refetch(), allBets.refetch()])
      toast.success('Maker fees claimed successfully!')
    },
    onError: (error) => {
      console.error('Claim maker fees error:', error)
      toast.error(`Failed to claim maker fees: ${error.message}`)
    },
  })

  const cancelBetMutation = useMutation({
    mutationKey: ['betting', 'cancel-bet', { cluster, betId }],
    mutationFn: async () => {
      return program.methods
        .cancelBet(betId)
        .accounts({
          creator: provider.wallet.publicKey,
        })
        .rpc()
    },
    onSuccess: async (tx) => {
      transactionToast(tx)
      await allBets.refetch()
      toast.success('Bet cancelled successfully!')
    },
    onError: (error) => {
      console.error('Cancel bet error:', error)
      toast.error(`Failed to cancel bet: ${error.message}`)
    },
  })

  // Helper functions for the component
  const isUserBetCreator = useMemo(() => {
    return betQuery.data?.creator.equals(provider.wallet.publicKey) || false
  }, [betQuery.data, provider.wallet.publicKey])

  const canUserClaimWinnings = useMemo(() => {
    if (!betQuery.data || !userBetQuery.data) return false

    return (
      betQuery.data.isResolved &&
      userBetQuery.data.option === betQuery.data.winningOption &&
      !userBetQuery.data.isClaimed
    )
  }, [betQuery.data, userBetQuery.data])

  const canUserClaimMakerFees = useMemo(() => {
    if (!betQuery.data) return false

    return betQuery.data.isResolved && betQuery.data.makerFeeCollected.gt(new BN(0)) && isUserBetCreator
  }, [betQuery.data, isUserBetCreator])

  const betTimeRemaining = useMemo(() => {
    if (!betQuery.data) return 0

    const now = Math.floor(Date.now() / 1000)
    const remaining = betQuery.data.endTime.toNumber() - now

    return Math.max(0, remaining)
  }, [betQuery.data])

  return {
    betPda,
    userBetPda,
    betQuery,
    userBetQuery,
    getBetStats,
    placeBetMutation,
    resolveBetMutation,
    claimWinningsMutation,
    claimMakerFeesMutation,
    cancelBetMutation,
    // Helper values
    isUserBetCreator,
    canUserClaimWinnings,
    canUserClaimMakerFees,
    betTimeRemaining,
  }
}

// Utility functions for components
export const formatSOL = (lamports: BN | number): string => {
  const amount = typeof lamports === 'number' ? lamports : lamports.toNumber()
  return (amount / LAMPORTS_PER_SOL).toFixed(4)
}

export const formatTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return 'Ended'

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export const calculateOdds = (amountA: BN, amountB: BN): { oddsA: number; oddsB: number } => {
  const totalA = amountA.toNumber()
  const totalB = amountB.toNumber()
  const total = totalA + totalB

  if (total === 0) return { oddsA: 50, oddsB: 50 }

  return {
    oddsA: Math.round((totalB / total) * 100),
    oddsB: Math.round((totalA / total) * 100),
  }
}

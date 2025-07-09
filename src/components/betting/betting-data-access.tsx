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
  })

  const getUserBets = useQuery({
    queryKey: ['betting', 'user-bets', { cluster }],
    queryFn: () => program.account.userBetState.all(),
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const getPlatformConfig = useQuery({
    queryKey: ['betting', 'platform-config', { cluster }],
    queryFn: async () => {
      const [platformConfigPda] = PublicKey.findProgramAddressSync([Buffer.from('platform_config')], programId)
      try {
        return await program.account.platformConfig.fetch(platformConfigPda)
      } catch (error) {
        return null
      }
    },
  })

  const initializePlatform = useMutation({
    mutationKey: ['betting', 'initialize-platform', { cluster }],
    mutationFn: async ({ platformFeeBps, makerFeeBps }: { platformFeeBps: number; makerFeeBps: number }) => {
      return program.methods
        .initializePlatform(platformFeeBps, makerFeeBps)
        .accounts({
          owner: provider.wallet.publicKey,
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await getPlatformConfig.refetch()
    },
    onError: (error) => {
      toast.error(`Failed to initialize platform: ${error.message}`)
    },
  })

  const createBet = useMutation({
    mutationKey: ['betting', 'create-bet', { cluster }],
    mutationFn: async ({
      betId,
      description,
      optionA,
      optionB,
      endTime,
      minBetAmount,
      maxBetAmount,
      category,
    }: {
      betId: string
      description: string
      optionA: string
      optionB: string
      endTime: number
      minBetAmount: number
      maxBetAmount: number
      category: string
    }) => {
      return program.methods
        .createBet(
          betId,
          description,
          optionA,
          optionB,
          new BN(endTime),
          new BN(minBetAmount),
          new BN(maxBetAmount),
          category,
        )
        .accounts({
          creator: provider.wallet.publicKey,
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await allBets.refetch()
    },
    onError: (error) => {
      toast.error(`Failed to create bet: ${error.message}`)
    },
  })

  const placeBet = useMutation({
    mutationKey: ['betting', 'place-bet', { cluster }],
    mutationFn: async ({ betId, option, amount }: { betId: string; option: number; amount: number }) => {
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
    },
    onError: (error) => {
      toast.error(`Failed to place bet: ${error.message}`)
    },
  })

  const resolveBet = useMutation({
    mutationKey: ['betting', 'resolve-bet', { cluster }],
    mutationFn: async ({
      betId,
      winningOption,
      resultDetails,
    }: {
      betId: string
      winningOption: number
      resultDetails: string
    }) => {
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
    },
    onError: (error) => {
      toast.error(`Failed to resolve bet: ${error.message}`)
    },
  })

  const claimWinnings = useMutation({
    mutationKey: ['betting', 'claim-winnings', { cluster }],
    mutationFn: async ({ betId }: { betId: string }) => {
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
    },
    onError: (error) => {
      toast.error(`Failed to claim winnings: ${error.message}`)
    },
  })

  const claimMakerFees = useMutation({
    mutationKey: ['betting', 'claim-maker-fees', { cluster }],
    mutationFn: async ({ betId }: { betId: string }) => {
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
    },
    onError: (error) => {
      toast.error(`Failed to claim maker fees: ${error.message}`)
    },
  })

  const claimPlatformFees = useMutation({
    mutationKey: ['betting', 'claim-platform-fees', { cluster }],
    mutationFn: async ({ betId }: { betId: string }) => {
      return program.methods
        .claimPlatformFees(betId)
        .accounts({
          platformOwner: provider.wallet.publicKey,
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await allBets.refetch()
    },
    onError: (error) => {
      toast.error(`Failed to claim platform fees: ${error.message}`)
    },
  })

  const cancelBet = useMutation({
    mutationKey: ['betting', 'cancel-bet', { cluster }],
    mutationFn: async ({ betId }: { betId: string }) => {
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
    },
    onError: (error) => {
      toast.error(`Failed to cancel bet: ${error.message}`)
    },
  })

  const getBetStats = useMutation({
    mutationKey: ['betting', 'get-bet-stats', { cluster }],
    mutationFn: async ({ betId }: { betId: string }) => {
      return program.methods.getBetStats(betId).accounts({}).rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
    },
    onError: (error) => {
      toast.error(`Failed to get bet stats: ${error.message}`)
    },
  })

  return {
    program,
    programId,
    allBets,
    getUserBets,
    getProgramAccount,
    getPlatformConfig,
    initializePlatform,
    createBet,
    placeBet,
    resolveBet,
    claimWinnings,
    claimMakerFees,
    claimPlatformFees,
    cancelBet,
    getBetStats,
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

  const [platformConfigPda] = useMemo(
    () => PublicKey.findProgramAddressSync([Buffer.from('platform_config')], programId),
    [programId],
  )

  const betQuery = useQuery({
    queryKey: ['betting', 'fetch-bet', { cluster, betId }],
    queryFn: () => program.account.betState.fetch(betPda),
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
  })

  const platformConfigQuery = useQuery({
    queryKey: ['betting', 'fetch-platform-config', { cluster }],
    queryFn: async () => {
      try {
        return await program.account.platformConfig.fetch(platformConfigPda)
      } catch (error) {
        return null
      }
    },
  })

  const placeBetMutation = useMutation({
    mutationKey: ['betting', 'place-bet', { cluster, betId }],
    mutationFn: async ({ option, amount }: { option: number; amount: number }) => {
      return program.methods
        .placeBet(betId, option, new BN(amount))
        .accounts({
          user: provider.wallet.publicKey,
        })
        .rpc()
    },
    onSuccess: async (tx) => {
      transactionToast(tx)
      await betQuery.refetch()
      await userBetQuery.refetch()
      await allBets.refetch()
      await getUserBets.refetch()
    },
    onError: (error) => {
      toast.error(`Failed to place bet: ${error.message}`)
    },
  })

  const resolveBetMutation = useMutation({
    mutationKey: ['betting', 'resolve-bet', { cluster, betId }],
    mutationFn: async ({ winningOption, resultDetails }: { winningOption: number; resultDetails: string }) => {
      return program.methods
        .resolveBet(betId, winningOption, resultDetails)
        .accounts({
          creator: provider.wallet.publicKey,
        })
        .rpc()
    },
    onSuccess: async (tx) => {
      transactionToast(tx)
      await betQuery.refetch()
      await allBets.refetch()
    },
    onError: (error) => {
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
      await betQuery.refetch()
      await userBetQuery.refetch()
      await allBets.refetch()
      await getUserBets.refetch()
    },
    onError: (error) => {
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
      await betQuery.refetch()
      await allBets.refetch()
    },
    onError: (error) => {
      toast.error(`Failed to claim maker fees: ${error.message}`)
    },
  })

  const claimPlatformFeesMutation = useMutation({
    mutationKey: ['betting', 'claim-platform-fees', { cluster, betId }],
    mutationFn: async () => {
      return program.methods
        .claimPlatformFees(betId)
        .accounts({
          platformOwner: provider.wallet.publicKey,
        })
        .rpc()
    },
    onSuccess: async (tx) => {
      transactionToast(tx)
      await betQuery.refetch()
      await allBets.refetch()
    },
    onError: (error) => {
      toast.error(`Failed to claim platform fees: ${error.message}`)
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
    },
    onError: (error) => {
      toast.error(`Failed to cancel bet: ${error.message}`)
    },
  })

  const getBetStatsMutation = useMutation({
    mutationKey: ['betting', 'get-bet-stats', { cluster, betId }],
    mutationFn: async () => {
      return program.methods.getBetStats(betId).accounts({}).rpc()
    },
    onSuccess: async (tx) => {
      transactionToast(tx)
    },
    onError: (error) => {
      toast.error(`Failed to get bet stats: ${error.message}`)
    },
  })

  return {
    betPda,
    userBetPda,
    platformConfigPda,
    betQuery,
    userBetQuery,
    platformConfigQuery,
    placeBetMutation,
    resolveBetMutation,
    claimWinningsMutation,
    claimMakerFeesMutation,
    claimPlatformFeesMutation,
    cancelBetMutation,
    getBetStatsMutation,
  }
}

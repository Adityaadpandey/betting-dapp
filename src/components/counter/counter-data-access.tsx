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

  const createBet = useMutation({
    mutationKey: ['betting', 'create-bet', { cluster }],
    mutationFn: async ({
      betId,
      description,
      optionA,
      optionB,
      endTime,
    }: {
      betId: string
      description: string
      optionA: string
      optionB: string
      endTime: number
    }) => {
      const [betPda] = PublicKey.findProgramAddressSync([Buffer.from('bet'), Buffer.from(betId)], programId)

      return program.methods
        .createBet(betId, description, optionA, optionB, new BN(endTime))
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
    },
    onError: (error) => {
      toast.error(`Failed to place bet: ${error.message}`)
    },
  })

  const resolveBet = useMutation({
    mutationKey: ['betting', 'resolve-bet', { cluster }],
    mutationFn: async ({ betId, winningOption }: { betId: string; winningOption: number }) => {
      const [betPda] = PublicKey.findProgramAddressSync([Buffer.from('bet'), Buffer.from(betId)], programId)

      return program.methods
        .resolveBet(betId, winningOption)
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
    },
    onError: (error) => {
      toast.error(`Failed to claim winnings: ${error.message}`)
    },
  })

  const cancelBet = useMutation({
    mutationKey: ['betting', 'cancel-bet', { cluster }],
    mutationFn: async ({ betId }: { betId: string }) => {
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
    },
    onError: (error) => {
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
    mutationFn: async ({ winningOption }: { winningOption: number }) => {
      return program.methods
        .resolveBet(betId, winningOption)
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

  return {
    betPda,
    userBetPda,
    betQuery,
    userBetQuery,
    placeBetMutation,
    resolveBetMutation,
    claimWinningsMutation,
    cancelBetMutation,
  }
}

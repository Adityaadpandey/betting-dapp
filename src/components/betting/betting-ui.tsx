'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ellipsify } from '@/lib/utils'
import { CalendarIcon, CheckCircleIcon, TrophyIcon, XCircleIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ExplorerLink } from '../cluster/cluster-ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import {
  calculateOdds,
  formatSOL,
  formatTimeRemaining,
  useBettingProgram,
  useBettingProgramAccount,
} from './betting-data-access'

export function BettingCreate() {
  const { createBet } = useBettingProgram()
  const [description, setDescription] = useState('')
  const [optionA, setOptionA] = useState('')
  const [optionB, setOptionB] = useState('')
  const [endTime, setEndTime] = useState('')
  const [category, setCategory] = useState('')
  const [minBetAmount, setMinBetAmount] = useState('0.01')
  const [maxBetAmount, setMaxBetAmount] = useState('100')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description || !optionA || !optionB || !endTime || !category) {
      return
    }

    const endTimeTimestamp = new Date(endTime).getTime()

    await createBet.mutateAsync({
      description,
      optionA,
      optionB,
      endTime: endTimeTimestamp,
      minBetAmount: parseFloat(minBetAmount) * 1e9, // Convert to lamports
      maxBetAmount: parseFloat(maxBetAmount) * 1e9, // Convert to lamports
      category,
    })

    // Reset form
    setDescription('')
    setOptionA('')
    setOptionB('')
    setEndTime('')
    setCategory('')
    setMinBetAmount('0.01')
    setMaxBetAmount('100')
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Create New Bet</CardTitle>
        <CardDescription>Set up a new betting market</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this bet about?"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="optionA">Option A</Label>
              <Input
                id="optionA"
                value={optionA}
                onChange={(e) => setOptionA(e.target.value)}
                placeholder="First option"
                required
              />
            </div>
            <div>
              <Label htmlFor="optionB">Option B</Label>
              <Input
                id="optionB"
                value={optionB}
                onChange={(e) => setOptionB(e.target.value)}
                placeholder="Second option"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Sports, Politics, etc."
                required
              />
            </div>
            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minBetAmount">Min Bet Amount (SOL)</Label>
              <Input
                id="minBetAmount"
                type="number"
                step="0.01"
                min="0"
                value={minBetAmount}
                onChange={(e) => setMinBetAmount(e.target.value)}
                placeholder="0.01"
                required
              />
            </div>
            <div>
              <Label htmlFor="maxBetAmount">Max Bet Amount (SOL)</Label>
              <Input
                id="maxBetAmount"
                type="number"
                step="0.01"
                min="0"
                value={maxBetAmount}
                onChange={(e) => setMaxBetAmount(e.target.value)}
                placeholder="100"
                required
              />
            </div>
          </div>

          <Button type="submit" disabled={createBet.isPending} className="w-full">
            {createBet.isPending ? 'Creating...' : 'Create Bet'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export function BettingList() {
  const { allBets, getProgramAccount } = useBettingProgram()

  if (getProgramAccount.isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!getProgramAccount.data?.value) {
    return (
      <div className="text-center py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            Program account not found. Make sure you have deployed the program and are on the correct cluster.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {allBets.isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : allBets.data?.length ? (
        <div className="grid gap-4">
          {allBets.data?.map((bet) => (
            <BettingCard key={bet.publicKey.toString()} bet={bet} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <h2 className="text-2xl font-semibold mb-2">No bets found</h2>
          <p className="text-muted-foreground">Create a bet above to get started.</p>
        </div>
      )}
    </div>
  )
}

export function BettingCard({ bet }: { bet: any }) {
  const betData = bet.account
  const betId = betData.betId
  const {
    betQuery,
    userBetQuery,
    getBetStats,
    placeBetMutation,
    resolveBetMutation,
    claimWinningsMutation,
    claimMakerFeesMutation,
    cancelBetMutation,
    isUserBetCreator,
    canUserClaimWinnings,
    canUserClaimMakerFees,
    betTimeRemaining,
  } = useBettingProgramAccount({ betId })

  const [selectedOption, setSelectedOption] = useState<number>(1)
  const [betAmount, setBetAmount] = useState('')
  const [resultDetails, setResultDetails] = useState('')

  const isExpired = betTimeRemaining <= 0
  const isResolved = betData.isResolved
  const hasUserBet = !!userBetQuery.data

  // Calculate odds
  const { oddsA, oddsB } = useMemo(() => {
    if (!betData.totalAmountA || !betData.totalAmountB) {
      return { oddsA: 50, oddsB: 50 }
    }
    return calculateOdds(betData.totalAmountA, betData.totalAmountB)
  }, [betData.totalAmountA, betData.totalAmountB])

  const handlePlaceBet = async () => {
    if (!betAmount || isNaN(parseFloat(betAmount))) return

    const amount = parseFloat(betAmount) * 1e9 // Convert to lamports
    const minAmount = betData.minBetAmount?.toNumber() || 0
    const maxAmount = betData.maxBetAmount?.toNumber() || 0

    if (amount < minAmount || amount > maxAmount) {
      alert(`Bet amount must be between ${formatSOL(minAmount)} and ${formatSOL(maxAmount)} SOL`)
      return
    }

    await placeBetMutation.mutateAsync({
      option: selectedOption,
      amount: amount,
    })

    setBetAmount('')
  }

  const handleResolve = async (winningOption: number) => {
    if (!resultDetails.trim()) {
      alert('Please provide result details')
      return
    }

    await resolveBetMutation.mutateAsync({
      winningOption,
      resultDetails,
    })

    setResultDetails('')
  }

  const getBetStatus = () => {
    if (isResolved) {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircleIcon className="w-3 h-3 mr-1" />
          Resolved
        </Badge>
      )
    }
    if (isExpired) {
      return (
        <Badge variant="destructive">
          <XCircleIcon className="w-3 h-3 mr-1" />
          Expired
        </Badge>
      )
    }
    return (
      <Badge variant="secondary">
        <CalendarIcon className="w-3 h-3 mr-1" />
        Active
      </Badge>
    )
  }

  const getOptionText = (option: number) => {
    return option === 1 ? betData.optionA : betData.optionB
  }

  const getWinningOptionText = () => {
    if (!isResolved) return null
    return betData.winningOption === 1 ? betData.optionA : betData.optionB
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{betData.description}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1 flex-wrap">
              <span>ID: {betId}</span>
              {getBetStatus()}
              <Badge variant="outline">{betData.category}</Badge>
            </CardDescription>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div className="mb-1">{isExpired ? 'Ended' : `Ends in: ${formatTimeRemaining(betTimeRemaining)}`}</div>
            <div className="mb-1">{new Date(betData.endTime.toNumber() * 1000).toLocaleString()}</div>
            <ExplorerLink path={`account/${bet.publicKey}`} label={ellipsify(bet.publicKey.toString())} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Betting Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4 bg-blue-50">
            <h4 className="font-semibold text-blue-600 mb-2">Option A: {betData.optionA}</h4>
            <div className="space-y-1 text-sm">
              <p>Pool: {formatSOL(betData.totalAmountA || 0)} SOL</p>
              <p>Odds: {oddsA}%</p>
              <p>Bettors: {betData.totalBettorsA?.toNumber() || 0}</p>
            </div>
          </div>
          <div className="border rounded-lg p-4 bg-purple-50">
            <h4 className="font-semibold text-purple-600 mb-2">Option B: {betData.optionB}</h4>
            <div className="space-y-1 text-sm">
              <p>Pool: {formatSOL(betData.totalAmountB || 0)} SOL</p>
              <p>Odds: {oddsB}%</p>
              <p>Bettors: {betData.totalBettorsB?.toNumber() || 0}</p>
            </div>
          </div>
        </div>

        {/* Total Pool and Stats */}
        <div className="bg-muted rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-semibold">Total Pool</p>
              <p>{formatSOL((betData.totalAmountA?.toNumber() || 0) + (betData.totalAmountB?.toNumber() || 0))} SOL</p>
            </div>
            <div>
              <p className="font-semibold">Total Bettors</p>
              <p>{(betData.totalBettorsA?.toNumber() || 0) + (betData.totalBettorsB?.toNumber() || 0)}</p>
            </div>
            <div>
              <p className="font-semibold">Min Bet</p>
              <p>{formatSOL(betData.minBetAmount || 0)} SOL</p>
            </div>
            <div>
              <p className="font-semibold">Max Bet</p>
              <p>{formatSOL(betData.maxBetAmount || 0)} SOL</p>
            </div>
          </div>
        </div>

        {/* Resolution Result */}
        {isResolved && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrophyIcon className="w-4 h-4 text-green-600" />
              <h4 className="font-semibold text-green-800">Winning Option: {getWinningOptionText()}</h4>
            </div>
            {betData.resultDetails && <p className="text-sm text-green-700">{betData.resultDetails}</p>}
          </div>
        )}

        {/* User's Bet Info */}
        {hasUserBet && (
          <div className="bg-muted rounded-lg p-4">
            <h4 className="font-semibold mb-2">Your Bet</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p>Option: {getOptionText(userBetQuery.data.option)}</p>
                <p>Amount: {formatSOL(userBetQuery.data.amount)} SOL</p>
              </div>
              <div>
                <p>Status: {userBetQuery.data.isClaimed ? 'Claimed' : 'Active'}</p>
                {canUserClaimWinnings && (
                  <Badge variant="default" className="mt-1">
                    <TrophyIcon className="w-3 h-3 mr-1" />
                    Winner!
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {/* Place Bet */}
          {!isResolved && !isExpired && !hasUserBet && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  variant={selectedOption === 1 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedOption(1)}
                >
                  {betData.optionA}
                </Button>
                <Button
                  variant={selectedOption === 2 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedOption(2)}
                >
                  {betData.optionB}
                </Button>
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label htmlFor="betAmount" className="text-sm">
                    Amount (SOL) - Min: {formatSOL(betData.minBetAmount || 0)}, Max:{' '}
                    {formatSOL(betData.maxBetAmount || 0)}
                  </Label>
                  <Input
                    id="betAmount"
                    type="number"
                    placeholder="Amount (SOL)"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    step="0.01"
                    min="0"
                  />
                </div>
                <Button onClick={handlePlaceBet} disabled={placeBetMutation.isPending || !betAmount}>
                  {placeBetMutation.isPending ? 'Placing...' : 'Place Bet'}
                </Button>
              </div>
            </div>
          )}

          {/* Claim Winnings */}
          {canUserClaimWinnings && (
            <Button
              onClick={() => claimWinningsMutation.mutateAsync()}
              disabled={claimWinningsMutation.isPending}
              variant="default"
              className="w-full"
            >
              {claimWinningsMutation.isPending ? 'Claiming...' : 'Claim Winnings'}
            </Button>
          )}

          {/* Claim Maker Fees */}
          {canUserClaimMakerFees && (
            <Button
              onClick={() => claimMakerFeesMutation.mutateAsync()}
              disabled={claimMakerFeesMutation.isPending}
              variant="outline"
              className="w-full"
            >
              {claimMakerFeesMutation.isPending ? 'Claiming...' : 'Claim Maker Fees'}
            </Button>
          )}

          {/* Resolve Bet (Creator only when expired) */}
          {!isResolved && isExpired && isUserBetCreator && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="resultDetails" className="text-sm">
                  Result Details
                </Label>
                <Textarea
                  id="resultDetails"
                  placeholder="Provide details about the resolution..."
                  value={resultDetails}
                  onChange={(e) => setResultDetails(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleResolve(1)}
                  disabled={resolveBetMutation.isPending}
                  variant="outline"
                  className="flex-1"
                >
                  Resolve: {betData.optionA}
                </Button>
                <Button
                  onClick={() => handleResolve(2)}
                  disabled={resolveBetMutation.isPending}
                  variant="outline"
                  className="flex-1"
                >
                  Resolve: {betData.optionB}
                </Button>
              </div>
            </div>
          )}

          {/* Cancel Bet (Creator only when active and no bets) */}
          {!isResolved && !isExpired && isUserBetCreator && (
            <Button
              onClick={() => {
                if (window.confirm('Are you sure you want to cancel this bet?')) {
                  cancelBetMutation.mutateAsync()
                }
              }}
              disabled={cancelBetMutation.isPending}
              variant="destructive"
              size="sm"
            >
              {cancelBetMutation.isPending ? 'Canceling...' : 'Cancel Bet'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

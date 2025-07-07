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
import { useBettingProgram, useBettingProgramAccount } from './betting-data-access'

export function BettingCreate() {
  const { createBet } = useBettingProgram()
  const [description, setDescription] = useState('')
  const [optionA, setOptionA] = useState('')
  const [optionB, setOptionB] = useState('')
  const [endTime, setEndTime] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description || !optionA || !optionB || !endTime) {
      return
    }

    const endTimeTimestamp = new Date(endTime).getTime() / 1000

    await createBet.mutateAsync({
      description,
      optionA,
      optionB,
      endTime: endTimeTimestamp,
    })

    // Reset form
    setDescription('')
    setOptionA('')
    setOptionB('')
    setEndTime('')
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Create New Bet</CardTitle>
        <CardDescription>Set up a new betting market</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      <div className="flex justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  if (!getProgramAccount.data?.value) {
    return (
      <div className="alert alert-info flex justify-center">
        <span>Program account not found. Make sure you have deployed the program and are on the correct cluster.</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {allBets.isLoading ? (
        <div className="flex justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : allBets.data?.length ? (
        <div className="grid gap-4">
          {allBets.data?.map((bet) => (
            <BettingCard key={bet.publicKey.toString()} bet={bet} />
          ))}
        </div>
      ) : (
        <div className="text-center">
          <h2 className="text-2xl">No bets found</h2>
          <p className="text-muted-foreground">Create a bet above to get started.</p>
        </div>
      )}
    </div>
  )
}

export function BettingCard({ bet }: { bet: any }) {
  const betData = bet.account
  const betId = betData.betId
  const { betQuery, userBetQuery, placeBetMutation, resolveBetMutation, claimWinningsMutation, cancelBetMutation } =
    useBettingProgramAccount({ betId })

  // Fixed: Use 1 instead of 0 as default (Rust expects 1 or 2)
  const [selectedOption, setSelectedOption] = useState<number>(1)
  const [betAmount, setBetAmount] = useState('')

  const isExpired = useMemo(() => {
    const now = Math.floor(Date.now() / 1000)
    return betData.endTime && betData.endTime.toNumber() < now
  }, [betData.endTime])

  const isResolved = betData.isResolved
  const canClaim =
    userBetQuery.data &&
    isResolved &&
    !userBetQuery.data.isClaimed &&
    userBetQuery.data.option === betData.winningOption

  const handlePlaceBet = async () => {
    if (!betAmount || isNaN(parseFloat(betAmount))) return

    await placeBetMutation.mutateAsync({
      option: selectedOption,
      amount: parseFloat(betAmount) * 1e9, // Convert to lamports
    })

    setBetAmount('')
  }

  const handleResolve = async (winningOption: number) => {
    await resolveBetMutation.mutateAsync({ winningOption })
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

  // Fixed: Helper function to get option display text
  const getOptionText = (option: number) => {
    return option === 1 ? betData.optionA : betData.optionB
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{betData.description}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <span>ID: {betId}</span>
              {getBetStatus()}
            </CardDescription>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div>Ends: {new Date(betData.endTime.toNumber() * 1000).toLocaleString()}</div>
            <ExplorerLink path={`account/${bet.publicKey}`} label={ellipsify(bet.publicKey.toString())} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Betting Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold text-blue-600">Option A: {betData.optionA}</h4>
            <p className="text-sm text-muted-foreground">Pool: {(betData.totalAmountA?.toNumber() || 0) / 1e9} SOL</p>
            <p className="text-sm text-muted-foreground">Bets: {betData.totalAmountA ? 'Yes' : 'No'}</p>
          </div>
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold text-purple-600">Option B: {betData.optionB}</h4>
            <p className="text-sm text-muted-foreground">Pool: {(betData.totalAmountB?.toNumber() || 0) / 1e9} SOL</p>
            <p className="text-sm text-muted-foreground">Bets: {betData.totalAmountB ? 'Yes' : 'No'}</p>
          </div>
        </div>

        {/* User's Bet Info */}
        {userBetQuery.data && (
          <div className="bg-muted rounded-lg p-4">
            <h4 className="font-semibold">Your Bet</h4>
            <p className="text-sm">Option: {getOptionText(userBetQuery.data.option)}</p>
            <p className="text-sm">Amount: {userBetQuery.data.amount.toNumber() / 1e9} SOL</p>
            {canClaim && (
              <Badge variant="default" className="mt-2">
                <TrophyIcon className="w-3 h-3 mr-1" />
                Winner! Claim your winnings
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {!isResolved && !isExpired && !userBetQuery.data && (
            <div className="flex gap-2 items-end flex-wrap">
              <div className="flex gap-2">
                {/* Fixed: Use 1 and 2 instead of 0 and 1 */}
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
              <Input
                type="number"
                placeholder="Amount (SOL)"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                className="w-32"
                step="0.01"
                min="0"
              />
              <Button onClick={handlePlaceBet} disabled={placeBetMutation.isPending || !betAmount} size="sm">
                {placeBetMutation.isPending ? 'Placing...' : 'Place Bet'}
              </Button>
            </div>
          )}

          {canClaim && (
            <Button
              onClick={() => claimWinningsMutation.mutateAsync()}
              disabled={claimWinningsMutation.isPending}
              variant="default"
              size="sm"
            >
              {claimWinningsMutation.isPending ? 'Claiming...' : 'Claim Winnings'}
            </Button>
          )}

          {!isResolved && isExpired && (
            <div className="flex gap-2">
              {/* Fixed: Use 1 and 2 instead of 0 and 1 */}
              <Button
                onClick={() => handleResolve(1)}
                disabled={resolveBetMutation.isPending}
                variant="outline"
                size="sm"
              >
                Resolve: {betData.optionA}
              </Button>
              <Button
                onClick={() => handleResolve(2)}
                disabled={resolveBetMutation.isPending}
                variant="outline"
                size="sm"
              >
                Resolve: {betData.optionB}
              </Button>
            </div>
          )}

          {!isResolved && !isExpired && (
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

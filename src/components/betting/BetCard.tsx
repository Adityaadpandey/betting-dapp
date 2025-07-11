"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ellipsify } from "@/lib/utils";
import {
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  DollarSignIcon,
  StarIcon,
  TrophyIcon,
  UsersIcon,
  XCircleIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ExplorerLink } from "../cluster/cluster-ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

import { calculateOdds, formatSOL, formatTimeRemaining, useBettingProgramAccount } from "./betting-data-access";

export function BettingCard({ bet }: { bet: any }) {
  const betData = bet.account;
  const betId = betData.betId;
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
  } = useBettingProgramAccount({ betId });
  console.log("BettingCard", bet);

  const [selectedOption, setSelectedOption] = useState<number>(1);
  const [betAmount, setBetAmount] = useState("");
  const [resultDetails, setResultDetails] = useState("");

  const isExpired = betTimeRemaining <= 0;
  const isResolved = betData.isResolved;
  const hasUserBet = !!userBetQuery.data;

  // Calculate odds
  const { oddsA, oddsB } = useMemo(() => {
    if (!betData.totalAmountA || !betData.totalAmountB) {
      return { oddsA: 50, oddsB: 50 };
    }
    return calculateOdds(betData.totalAmountA, betData.totalAmountB);
  }, [betData.totalAmountA, betData.totalAmountB]);

  const handlePlaceBet = async () => {
    if (!betAmount || isNaN(parseFloat(betAmount))) return;

    const amount = parseFloat(betAmount) * 1e9; // Convert to lamports
    const minAmount = betData.minBetAmount?.toNumber() || 0;
    const maxAmount = betData.maxBetAmount?.toNumber() || 0;

    if (amount < minAmount || amount > maxAmount) {
      alert(`Bet amount must be between ${formatSOL(minAmount)} and ${formatSOL(maxAmount)} SOL`);
      return;
    }

    await placeBetMutation.mutateAsync({
      option: selectedOption,
      amount: amount,
    });

    setBetAmount("");
  };

  const handleResolve = async (winningOption: number) => {
    if (!resultDetails.trim()) {
      alert("Please provide result details");
      return;
    }

    await resolveBetMutation.mutateAsync({
      winningOption,
      resultDetails,
    });

    setResultDetails("");
  };

  const getBetStatus = () => {
    if (isResolved) {
      return (
        <Badge variant="default" className="bg-gray-800 hover:bg-gray-700 text-white shadow-md">
          <CheckCircleIcon className="w-3 h-3 mr-1" />
          Resolved
        </Badge>
      );
    }
    if (isExpired) {
      return (
        <Badge variant="destructive" className="bg-gray-600 hover:bg-gray-700 text-white shadow-md">
          <XCircleIcon className="w-3 h-3 mr-1" />
          Expired
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-gray-200 text-gray-800 hover:bg-gray-300 shadow-md">
        <ClockIcon className="w-3 h-3 mr-1" />
        Active
      </Badge>
    );
  };

  const getOptionText = (option: number) => {
    return option === 1 ? betData.optionA : betData.optionB;
  };

  const getWinningOptionText = () => {
    if (!isResolved) return null;
    return betData.winningOption === 1 ? betData.optionA : betData.optionB;
  };

  const totalPoolAmount = (betData.totalAmountA?.toNumber() || 0) + (betData.totalAmountB?.toNumber() || 0);
  const totalBettors = (betData.totalBettorsA?.toNumber() || 0) + (betData.totalBettorsB?.toNumber() || 0);
  const poolRatioA = totalPoolAmount > 0 ? ((betData.totalAmountA?.toNumber() || 0) / totalPoolAmount) * 100 : 50;
  const poolRatioB = totalPoolAmount > 0 ? ((betData.totalAmountB?.toNumber() || 0) / totalPoolAmount) * 100 : 50;

  return (
    <Card className="w-full max-w-4xl mx-auto overflow-hidden border shadow-lg ">
      <CardHeader className="p-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-xl font-bold mb-2 leading-tight">{betData.description}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-2 flex-wrap text-gray-300">
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">ID: {betId}</span>
              {getBetStatus()}
              <Badge variant="outline" className="border-gray-400 text-gray-300 hover:bg-gray-700">
                {betData.category}
              </Badge>
            </CardDescription>
          </div>
          <div className="text-right text-sm text-gray-300">
            <div className="mb-1 flex items-center gap-1">
              <CalendarIcon className="w-4 h-4" />
              {isExpired ? "Ended" : `${formatTimeRemaining(betTimeRemaining)}`}
            </div>
            <div className="mb-2 text-xs opacity-80">
              {new Date(betData.endTime.toNumber() * 1000).toLocaleString()}
            </div>
            <ExplorerLink
              path={`account/${bet.publicKey}`}
              label={ellipsify(bet.publicKey.toString())}
              className="text-gray-400 hover:text-white transition-colors"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Betting Options with Monochrome Design */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="group relative overflow-hidden rounded-xl border-2 border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 p-5 transition-all duration-300 hover:shadow-lg hover:border-gray-400">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-500/5 to-transparent"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-gray-800 text-lg">Option A</h4>
                <Badge className="bg-gray-700 text-white px-3 py-1">{oddsA}%</Badge>
              </div>
              <p className="text-gray-900 font-semibold mb-3 text-sm">{betData.optionA}</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1">
                    <DollarSignIcon className="w-4 h-4  text-gray-300" />
                    <span className="font-medium">Pool</span>
                  </div>
                  <span className="font-bold text-gray-900">{formatSOL(betData.totalAmountA || 0)} SOL</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1">
                    <UsersIcon className="w-4 h-4  text-gray-300" />
                    <span className="font-medium">Bettors</span>
                  </div>
                  <span className="font-bold text-gray-900">{betData.totalBettorsA?.toNumber() || 0}</span>
                </div>
                <Progress value={poolRatioA} className="h-2 bg-gray-200" />
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-xl border-2 border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 p-5 transition-all duration-300 hover:shadow-lg hover:border-gray-400">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-500/5 to-transparent"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-gray-800 text-lg">Option B</h4>
                <Badge className="bg-gray-700 text-white px-3 py-1">{oddsB}%</Badge>
              </div>
              <p className="text-gray-900 font-semibold mb-3 text-sm">{betData.optionB}</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1">
                    <DollarSignIcon className="w-4 h-4  text-gray-300" />
                    <span className="font-medium">Pool</span>
                  </div>
                  <span className="font-bold text-gray-900">{formatSOL(betData.totalAmountB || 0)} SOL</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1">
                    <UsersIcon className="w-4 h-4  text-gray-300" />
                    <span className="font-medium">Bettors</span>
                  </div>
                  <span className="font-bold text-gray-900">{betData.totalBettorsB?.toNumber() || 0}</span>
                </div>
                <Progress value={poolRatioB} className="h-2 bg-gray-200" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className=" rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <StarIcon className="w-5 h-5  text-gray-300" />
            Betting Statistics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800 mb-1">{formatSOL(totalPoolAmount)} SOL</div>
              <p className="text-sm  text-gray-300">Total Pool</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800 mb-1">{totalBettors}</div>
              <p className="text-sm  text-gray-300">Total Bettors</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800 mb-1">{formatSOL(betData.minBetAmount || 0)}</div>
              <p className="text-sm  text-gray-300">Min Bet (SOL)</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800 mb-1">{formatSOL(betData.maxBetAmount || 0)}</div>
              <p className="text-sm  text-gray-300">Max Bet (SOL)</p>
            </div>
          </div>
        </div>

        {/* Resolution Result */}
        {isResolved && (
          <div className=" border-gray-300 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gray-200 rounded-full">
                <TrophyIcon className="w-6 h-6 text-gray-700" />
              </div>
              <div>
                <h4 className="font-bold text-gray-800 text-lg">Winning Option</h4>
                <p className="text-gray-700 font-semibold">{getWinningOptionText()}</p>
              </div>
            </div>
            {betData.resultDetails && (
              <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                <p className="text-sm text-gray-800 font-medium">{betData.resultDetails}</p>
              </div>
            )}
          </div>
        )}

        {/* User's Bet Info */}
        {hasUserBet && (
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-300 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-gray-200 rounded-full">
                <StarIcon className="w-5 h-5 text-gray-700" />
              </div>
              <h4 className="font-bold text-gray-800 text-lg">Your Bet</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Option:</span>
                  <span className="text-sm font-bold text-gray-900">{getOptionText(userBetQuery.data.option)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Amount:</span>
                  <span className="text-sm font-bold text-gray-900">{formatSOL(userBetQuery.data.amount)} SOL</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Status:</span>
                  <span className="text-sm font-bold text-gray-900">
                    {userBetQuery.data.isClaimed ? "Claimed" : "Active"}
                  </span>
                </div>
                {canUserClaimWinnings && (
                  <Badge variant="default" className="bg-gray-800 hover:bg-gray-700 text-white">
                    <TrophyIcon className="w-3 h-3 mr-1" />
                    Winner!
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        <Separator className="my-6" />

        {/* Actions */}
        <div className="space-y-4">
          {/* Show only resolved bet info if bet is resolved */}
          {isResolved ? (
            <div className="text-center p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-300">
              <h4 className="font-bold text-lg mb-2">Bet Resolved</h4>
              <p className="text-gray-700">This bet has been resolved and is now closed.</p>
            </div>
          ) : (
            <>
              {/* Place Bet */}
              {!isExpired && !hasUserBet && (
                <div className="space-y-4 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200">
                  <h4 className="font-bold text-lg mb-4">Place Your Bet</h4>
                  <div className="flex gap-3 mb-4">
                    <Button
                      variant={selectedOption === 1 ? "default" : "outline"}
                      size="lg"
                      onClick={() => setSelectedOption(1)}
                      className={
                        selectedOption === 1
                          ? "bg-gray-800 hover:bg-gray-700 shadow-lg"
                          : "border-gray-400 hover:bg-gray-100"
                      }
                    >
                      {betData.optionA}
                    </Button>
                    <Button
                      variant={selectedOption === 2 ? "default" : "outline"}
                      size="lg"
                      onClick={() => setSelectedOption(2)}
                      className={
                        selectedOption === 2
                          ? "bg-gray-800 hover:bg-gray-700 shadow-lg"
                          : "border-gray-400 hover:bg-gray-100"
                      }
                    >
                      {betData.optionB}
                    </Button>
                  </div>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <Label htmlFor="betAmount" className="text-sm font-medium mb-2 block">
                        Amount (SOL) - Min: {formatSOL(betData.minBetAmount || 0)}, Max:{" "}
                        {formatSOL(betData.maxBetAmount || 0)}
                      </Label>
                      <Input
                        id="betAmount"
                        type="number"
                        placeholder="Enter amount in SOL"
                        value={betAmount}
                        onChange={(e) => setBetAmount(e.target.value)}
                        step="0.01"
                        min="0"
                        className="text-lg p-3 border-2 focus:ring-2 focus:ring-gray-500"
                      />
                    </div>
                    <Button
                      onClick={handlePlaceBet}
                      disabled={placeBetMutation.isPending || !betAmount}
                      size="lg"
                      className="bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 shadow-lg px-8"
                    >
                      {placeBetMutation.isPending ? "Placing..." : "Place Bet"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Claim Winnings */}
              {canUserClaimWinnings && (
                <Button
                  onClick={() => claimWinningsMutation.mutateAsync()}
                  disabled={claimWinningsMutation.isPending}
                  size="lg"
                  className="w-full bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 shadow-lg text-lg py-6"
                >
                  <TrophyIcon className="w-5 h-5 mr-2" />
                  {claimWinningsMutation.isPending ? "Claiming..." : "Claim Winnings"}
                </Button>
              )}

              {/* Claim Maker Fees */}
              {canUserClaimMakerFees && (
                <Button
                  onClick={() => claimMakerFeesMutation.mutateAsync()}
                  disabled={claimMakerFeesMutation.isPending}
                  variant="outline"
                  size="lg"
                  className="w-full border-2 border-gray-400 hover:bg-gray-100 text-lg py-6"
                >
                  <DollarSignIcon className="w-5 h-5 mr-2" />
                  {claimMakerFeesMutation.isPending ? "Claiming..." : "Claim Maker Fees"}
                </Button>
              )}

              {/* Resolve Bet */}
              {isExpired && isUserBetCreator && (
                <div className="space-y-4 p-6  rounded-xl border-2 border-gray-300">
                  <h4 className="font-bold text-lg mb-4">Resolve Bet</h4>
                  <div>
                    <Label htmlFor="resultDetails" className="text-sm font-medium mb-2 block">
                      Result Details
                    </Label>
                    <Textarea
                      id="resultDetails"
                      placeholder="Provide details about the resolution..."
                      value={resultDetails}
                      onChange={(e) => setResultDetails(e.target.value)}
                      rows={3}
                      className="border-2 focus:ring-2 focus:ring-gray-500"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleResolve(1)}
                      disabled={resolveBetMutation.isPending}
                      variant="outline"
                      size="lg"
                      className="flex-1 border-2 border-gray-400 hover:bg-gray-100"
                    >
                      Resolve: {betData.optionA}
                    </Button>
                    <Button
                      onClick={() => handleResolve(2)}
                      disabled={resolveBetMutation.isPending}
                      variant="outline"
                      size="lg"
                      className="flex-1 border-2 border-gray-400 hover:bg-gray-100"
                    >
                      Resolve: {betData.optionB}
                    </Button>
                  </div>
                </div>
              )}

              {/* Cancel Bet */}
              {!isExpired && isUserBetCreator && (
                <Button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to cancel this bet?")) {
                      cancelBetMutation.mutateAsync();
                    }
                  }}
                  disabled={cancelBetMutation.isPending}
                  variant="destructive"
                  size="lg"
                  className="bg-gray-600 hover:bg-gray-700 shadow-lg"
                >
                  {cancelBetMutation.isPending ? "Canceling..." : "Cancel Bet"}
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

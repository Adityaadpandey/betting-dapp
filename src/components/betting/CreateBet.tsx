"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

import { useBettingProgram } from "./betting-data-access";

export function BettingCreate() {
  const { createBet } = useBettingProgram();
  const [description, setDescription] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [endTime, setEndTime] = useState("");
  const [category, setCategory] = useState("");
  const [minBetAmount, setMinBetAmount] = useState("0.01");
  const [maxBetAmount, setMaxBetAmount] = useState("100");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !optionA || !optionB || !endTime || !category) {
      return;
    }

    const endTimeTimestamp = new Date(endTime).getTime();

    await createBet.mutateAsync({
      description,
      optionA,
      optionB,
      endTime: endTimeTimestamp,
      minBetAmount: parseFloat(minBetAmount) * 1e9, // Convert to lamports
      maxBetAmount: parseFloat(maxBetAmount) * 1e9, // Convert to lamports
      category,
    });

    // Reset form
    setDescription("");
    setOptionA("");
    setOptionB("");
    setEndTime("");
    setCategory("");
    setMinBetAmount("0.01");
    setMaxBetAmount("100");
  };

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
            {createBet.isPending ? "Creating..." : "Create Bet"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

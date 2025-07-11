"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Clock, DollarSign, Plus, Tag, TrendingUp, Users, Zap } from "lucide-react";
import { useState } from "react";
import { useBettingProgram } from "./betting-data-access";

export function BettingCreate() {
  const { createBet } = useBettingProgram();

  const initialState = {
    description: "",
    optionA: "",
    optionB: "",
    endTime: "",
    category: "",
    minBetAmount: "0.0001",
    maxBetAmount: "100",
  };

  const [formData, setFormData] = useState(initialState);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleCategoryChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      category: value,
    }));
  };

  const handleSubmit = async () => {
    const { description, optionA, optionB, endTime, category, minBetAmount, maxBetAmount } = formData;

    if (!description || !optionA || !optionB || !endTime || !category) return;

    const endTimeTimestamp = new Date(endTime).getTime();

    await createBet.mutateAsync({
      description: description.trim(),
      optionA: optionA.trim(),
      optionB: optionB.trim(),
      endTime: endTimeTimestamp,
      category: category.trim(),
      minBetAmount: parseFloat(minBetAmount) * 1e9,
      maxBetAmount: parseFloat(maxBetAmount) * 1e9,
    });

    setFormData(initialState);
  };

  const categories = ["Sports", "Politics", "Entertainment", "Technology", "Finance", "Weather", "Other"];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="border-border shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <CardTitle className="text-2xl">Create the Bet</CardTitle>
                <CardDescription>Configure your prediction market parameters</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Description Section */}
            <div className="space-y-3">
              <Label htmlFor="description" className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="What is this bet about? Provide a clear description of the market..."
                className="min-h-[120px] resize-none"
                required
              />
              <p className="text-xs text-muted-foreground">Be specific and clear about what you&apos;re betting on</p>
            </div>

            {/* Options Section */}
            <div className="space-y-4">
              <Label className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Betting Options
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="optionA" className="text-sm text-muted-foreground">
                    Option A
                  </Label>
                  <Input
                    id="optionA"
                    value={formData.optionA}
                    onChange={handleChange}
                    placeholder="First outcome"
                    className="h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="optionB" className="text-sm text-muted-foreground">
                    Option B
                  </Label>
                  <Input
                    id="optionB"
                    value={formData.optionB}
                    onChange={handleChange}
                    placeholder="Second outcome"
                    className="h-11"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Category and End Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Category
                </Label>
                <Select value={formData.category} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime" className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  End Time
                </Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={handleChange}
                  className="h-11"
                  required
                />
              </div>
            </div>

            {/* Betting Limits */}
            <div className="space-y-4">
              <Label className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Betting Limits (SOL)
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minBetAmount" className="text-sm text-muted-foreground">
                    Minimum Bet Amount
                  </Label>
                  <Input
                    id="minBetAmount"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={formData.minBetAmount}
                    onChange={handleChange}
                    placeholder="0.0001"
                    className="h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxBetAmount" className="text-sm text-muted-foreground">
                    Maximum Bet Amount
                  </Label>
                  <Input
                    id="maxBetAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.maxBetAmount}
                    onChange={handleChange}
                    placeholder="100"
                    className="h-11"
                    required
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Set reasonable limits to encourage participation</p>
            </div>

            {/* Market Preview */}
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Market Preview
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Description:</span>
                  <span className="font-medium">{formData.description || "Not set"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-medium">{formData.category || "Not selected"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Options:</span>
                  <span className="font-medium">
                    {formData.optionA || "Option A"} vs {formData.optionB || "Option B"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bet Range:</span>
                  <span className="font-medium">
                    {formData.minBetAmount} - {formData.maxBetAmount} SOL
                  </span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={
                createBet.isPending ||
                !formData.description ||
                !formData.optionA ||
                !formData.optionB ||
                !formData.endTime ||
                !formData.category
              }
              className="w-full h-12 text-base font-medium"
            >
              {createBet.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating Market...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Betting Market
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

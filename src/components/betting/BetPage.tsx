"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Calendar, DollarSign, Filter, Search, SortAsc, SortDesc, Trophy, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

import { BettingCard } from "./BetCard";
import { useBettingProgram } from "./betting-data-access";

export function BettingList() {
  const { allBets, getProgramAccount } = useBettingProgram();

  // Filter and sort states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showFilters, setShowFilters] = useState(false);

  // Helper function to convert BN to number
  const bnToNumber = (bn) => {
    return bn ? bn.toNumber() : 0;
  };

  // Helper function to get bet status
  const getBetStatus = useMemo(
    () => (bet) => {
      const account = bet.account;
      if (account.isResolved) return "resolved";

      const now = Date.now() / 1000;
      const endTime = bnToNumber(account.endTime);

      if (endTime < now) return "expired";
      return "active";
    },
    [],
  );

  // Get unique categories for filter
  const categories = useMemo(() => {
    if (!allBets.data) return [];
    const uniqueCategories = [...new Set(allBets.data.map((bet) => bet.account.category))];
    return uniqueCategories.filter(Boolean);
  }, [allBets.data]);

  // Memoized filtered and sorted data
  const filteredAndSortedBets = useMemo(() => {
    if (!allBets.data) return [];

    const filtered = allBets.data.filter((bet) => {
      const account = bet.account;
      const status = getBetStatus(bet);

      // Search filter
      const matchesSearch =
        account.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.optionA?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.optionB?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.category?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === "all" || status === statusFilter;

      // Category filter
      const matchesCategory = categoryFilter === "all" || account.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      const accountA = a.account;
      const accountB = b.account;
      let aValue, bValue;

      switch (sortBy) {
        case "description":
          aValue = accountA.description || "";
          bValue = accountB.description || "";
          break;
        case "total_amount":
          aValue = bnToNumber(accountA.totalAmountA) + bnToNumber(accountA.totalAmountB);
          bValue = bnToNumber(accountB.totalAmountA) + bnToNumber(accountB.totalAmountB);
          break;
        case "total_bettors":
          aValue = bnToNumber(accountA.totalBettors);
          bValue = bnToNumber(accountB.totalBettors);
          break;
        case "end_time":
          aValue = bnToNumber(accountA.endTime);
          bValue = bnToNumber(accountB.endTime);
          break;
        case "category":
          aValue = accountA.category || "";
          bValue = accountB.category || "";
          break;
        case "created_at":
        default:
          aValue = bnToNumber(accountA.createdAt);
          bValue = bnToNumber(accountB.createdAt);
          break;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [allBets.data, searchTerm, statusFilter, categoryFilter, sortBy, sortOrder, getBetStatus]);

  // Loading state
  if (getProgramAccount.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading betting program...</p>
        </div>
      </div>
    );
  }

  // Program account not found
  if (!getProgramAccount.data?.value) {
    return (
      <div className="text-center py-12">
        <Alert className="max-w-md mx-auto">
          <Trophy className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Program Not Found</p>
              <p className="text-sm">
                Make sure you have deployed the program and are connected to the correct cluster.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Find Bets</CardTitle>
          <CardDescription>Search and filter through available betting opportunities</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search bets by description, options, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </Button>

            {filteredAndSortedBets.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {filteredAndSortedBets.length} bet{filteredAndSortedBets.length !== 1 ? "s" : ""} found
              </Badge>
            )}
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="space-y-4">
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div className="space-y-2">
                  <Label htmlFor="status-filter">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="status-filter">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Category Filter */}
                <div className="space-y-2">
                  <Label htmlFor="category-filter">Category</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger id="category-filter">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort By */}
                <div className="space-y-2">
                  <Label htmlFor="sort-by">Sort By</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger id="sort-by">
                      <SelectValue placeholder="Select sort field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at">Created Date</SelectItem>
                      <SelectItem value="description">Description</SelectItem>
                      <SelectItem value="total_amount">Total Amount</SelectItem>
                      <SelectItem value="total_bettors">Total Bettors</SelectItem>
                      <SelectItem value="end_time">End Time</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort Order */}
                <div className="space-y-2">
                  <Label>Order</Label>
                  <Button
                    variant="outline"
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    className="w-full justify-start"
                  >
                    {sortOrder === "asc" ? (
                      <>
                        <SortAsc className="h-4 w-4 mr-2" />
                        Ascending
                      </>
                    ) : (
                      <>
                        <SortDesc className="h-4 w-4 mr-2" />
                        Descending
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {allBets.data && allBets.data.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Trophy className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Bets</p>
                  <p className="text-lg font-semibold">{allBets.data.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-lg font-semibold">
                    {allBets.data.filter((bet) => getBetStatus(bet) === "active").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Resolved</p>
                  <p className="text-lg font-semibold">{allBets.data.filter((bet) => bet.account.isResolved).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Categories</p>
                  <p className="text-lg font-semibold">{categories.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Betting List Content */}
      {allBets.isLoading ? (
        <div className="flex justify-center py-12">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Loading bets...</p>
          </div>
        </div>
      ) : filteredAndSortedBets.length > 0 ? (
        <div className="grid gap-4">
          {filteredAndSortedBets.map((bet) => (
            <BettingCard key={bet.publicKey.toString()} bet={bet} />
          ))}
        </div>
      ) : allBets.data?.length > 0 ? (
        // Has bets but none match current filters
        <Card>
          <CardContent className="text-center py-12">
            <div className="flex items-center justify-center w-12 h-12 bg-muted rounded-full mx-auto mb-4">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>
            <CardTitle className="mb-2">No matching bets</CardTitle>
            <CardDescription className="mb-4">
              Try adjusting your search terms or filters to find more bets.
            </CardDescription>
            <Button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setCategoryFilter("all");
                setSortBy("created_at");
                setSortOrder("desc");
              }}
              variant="outline"
            >
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        // No bets at all
        <Card>
          <CardContent className="text-center py-12">
            <div className="flex items-center justify-center w-12 h-12 bg-muted rounded-full mx-auto mb-4">
              <Trophy className="w-6 h-6 text-muted-foreground" />
            </div>
            <CardTitle className="mb-2">No bets found</CardTitle>
            <CardDescription>Create your first bet above to get started with betting.</CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

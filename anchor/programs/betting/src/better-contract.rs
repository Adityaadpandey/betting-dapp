#![allow(clippy::result_large_err)]
use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("22hXmGnod6ytgUPuNaj3UCYj9aamhgVa4fjDed16ob1R");

#[program]
pub mod betting_dapp {
    use super::*;

    // NEW: Initialize platform configuration
    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        platform_fee_bps: u16, // basis points (e.g., 100 = 1%)
        maker_fee_bps: u16,    // basis points (e.g., 200 = 2%)
    ) -> Result<()> {
        let platform_config = &mut ctx.accounts.platform_config;

        require!(platform_fee_bps <= 1000, BettingError::FeeTooHigh); // max 10%
        require!(maker_fee_bps <= 1000, BettingError::FeeTooHigh); // max 10%

        platform_config.owner = *ctx.accounts.owner.key;
        platform_config.platform_fee_bps = platform_fee_bps;
        platform_config.maker_fee_bps = maker_fee_bps;
        platform_config.total_volume = 0;
        platform_config.total_fees_collected = 0;
        platform_config.bump = ctx.bumps.platform_config;

        Ok(())
    }

    // Create a new betting market
    pub fn create_bet(
        ctx: Context<CreateBet>,
        bet_id: String,
        description: String,
        option_a: String,
        option_b: String,
        end_time: i64,
        // NEW: Additional parameters for better market creation
        min_bet_amount: u64,
        max_bet_amount: u64,
        category: String,
    ) -> Result<()> {
        let bet = &mut ctx.accounts.bet;
        let clock = Clock::get()?;

        // NEW: Validation for bet parameters
        require!(
            end_time > clock.unix_timestamp,
            BettingError::InvalidEndTime
        );
        require!(min_bet_amount > 0, BettingError::InvalidAmount);
        require!(
            max_bet_amount >= min_bet_amount,
            BettingError::InvalidAmount
        );
        require!(category.len() > 0, BettingError::InvalidCategory);

        bet.creator = *ctx.accounts.creator.key;
        bet.bet_id = bet_id;
        bet.description = description;
        bet.option_a = option_a;
        bet.option_b = option_b;
        bet.end_time = end_time;
        bet.total_amount_a = 0;
        bet.total_amount_b = 0;
        bet.is_resolved = false;
        bet.winning_option = 0; // 0 = unresolved, 1 = option A, 2 = option B
        bet.bump = ctx.bumps.bet;

        // NEW: Additional fields
        bet.min_bet_amount = min_bet_amount;
        bet.max_bet_amount = max_bet_amount;
        bet.category = category;
        bet.created_at = clock.unix_timestamp;
        bet.total_bettors = 0;
        bet.maker_fee_collected = 0;
        bet.platform_fee_collected = 0;

        Ok(())
    }

    // Place a bet on an option
    pub fn place_bet(
        ctx: Context<PlaceBet>,
        bet_id: String,
        option: u8, // 1 for option A, 2 for option B
        amount: u64,
    ) -> Result<()> {
        let bet = &mut ctx.accounts.bet;
        let user_bet = &mut ctx.accounts.user_bet;
        let platform_config = &ctx.accounts.platform_config;

        // Check if betting is still open
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp < bet.end_time,
            BettingError::BettingClosed
        );
        require!(!bet.is_resolved, BettingError::BetAlreadyResolved);
        require!(option == 1 || option == 2, BettingError::InvalidOption);
        require!(amount > 0, BettingError::InvalidAmount);

        // NEW: Check min/max bet amounts
        require!(amount >= bet.min_bet_amount, BettingError::BetTooLow);
        require!(amount <= bet.max_bet_amount, BettingError::BetTooHigh);

        // NEW: Calculate fees
        let platform_fee = (amount * platform_config.platform_fee_bps as u64) / 10000;
        let maker_fee = (amount * platform_config.maker_fee_bps as u64) / 10000;
        let net_amount = amount - platform_fee - maker_fee;

        // Update bet totals (with net amount after fees)
        if option == 1 {
            bet.total_amount_a += net_amount;
        } else {
            bet.total_amount_b += net_amount;
        }

        // NEW: Update fee tracking
        bet.maker_fee_collected += maker_fee;
        bet.platform_fee_collected += platform_fee;
        bet.total_bettors += 1;

        // Transfer SOL from user to bet account
        let transfer_instruction = system_program::Transfer {
            from: ctx.accounts.user.to_account_info(),
            to: ctx.accounts.bet.to_account_info(),
        };
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                transfer_instruction,
            ),
            amount,
        )?;

        // Store user's bet
        user_bet.user = *ctx.accounts.user.key;
        user_bet.bet_id = bet_id;
        user_bet.option = option;
        user_bet.amount = net_amount; // Store net amount for winnings calculation
        user_bet.is_claimed = false;
        user_bet.bump = ctx.bumps.user_bet;
        // NEW: Additional user bet info
        user_bet.placed_at = clock.unix_timestamp;
        user_bet.original_amount = amount; // Store original amount for display

        Ok(())
    }

    // Resolve a bet (only creator can do this)
    pub fn resolve_bet(
        ctx: Context<ResolveBet>,
        _bet_id: String,
        winning_option: u8,
        // NEW: Optional result details for better display
        result_details: String,
    ) -> Result<()> {
        let bet = &mut ctx.accounts.bet;

        require!(!bet.is_resolved, BettingError::BetAlreadyResolved);
        require!(
            winning_option == 1 || winning_option == 2,
            BettingError::InvalidOption
        );
        require!(
            bet.creator == *ctx.accounts.creator.key,
            BettingError::UnauthorizedResolver
        );

        // Check if betting time has ended
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp >= bet.end_time,
            BettingError::BettingStillOpen
        );

        bet.is_resolved = true;
        bet.winning_option = winning_option;
        bet.result_details = result_details; // NEW: Store result details
        bet.resolved_at = clock.unix_timestamp; // NEW: Store resolution time

        Ok(())
    }

    // NEW: Claim maker fees (only bet creator can do this after resolution)
    pub fn claim_maker_fees(ctx: Context<ClaimMakerFees>, _bet_id: String) -> Result<()> {
        let bet = &mut ctx.accounts.bet;

        require!(bet.is_resolved, BettingError::BetNotResolved);
        require!(
            bet.creator == *ctx.accounts.creator.key,
            BettingError::UnauthorizedResolver
        );
        require!(bet.maker_fee_collected > 0, BettingError::NoFeesToClaim);

        let fees_to_claim = bet.maker_fee_collected;

        // Transfer maker fees to creator
        **bet.to_account_info().try_borrow_mut_lamports()? -= fees_to_claim;
        **ctx
            .accounts
            .creator
            .to_account_info()
            .try_borrow_mut_lamports()? += fees_to_claim;

        bet.maker_fee_collected = 0; // Reset to prevent double claiming

        Ok(())
    }

    // NEW: Claim platform fees (only platform owner can do this)
    pub fn claim_platform_fees(ctx: Context<ClaimPlatformFees>, _bet_id: String) -> Result<()> {
        let bet = &mut ctx.accounts.bet;
        let platform_config = &ctx.accounts.platform_config;

        require!(bet.is_resolved, BettingError::BetNotResolved);
        require!(
            platform_config.owner == *ctx.accounts.platform_owner.key,
            BettingError::UnauthorizedPlatformOwner
        );
        require!(bet.platform_fee_collected > 0, BettingError::NoFeesToClaim);

        let fees_to_claim = bet.platform_fee_collected;

        // Transfer platform fees to platform owner
        **bet.to_account_info().try_borrow_mut_lamports()? -= fees_to_claim;
        **ctx
            .accounts
            .platform_owner
            .to_account_info()
            .try_borrow_mut_lamports()? += fees_to_claim;

        bet.platform_fee_collected = 0; // Reset to prevent double claiming

        Ok(())
    }

    // Claim winnings (ENHANCED with better calculation)
    pub fn claim_winnings(ctx: Context<ClaimWinnings>, _bet_id: String) -> Result<()> {
        let bet = &mut ctx.accounts.bet;
        let user_bet = &mut ctx.accounts.user_bet;

        require!(bet.is_resolved, BettingError::BetNotResolved);
        require!(!user_bet.is_claimed, BettingError::AlreadyClaimed);
        require!(
            user_bet.option == bet.winning_option,
            BettingError::NotWinner
        );

        let total_winning_pool = if bet.winning_option == 1 {
            bet.total_amount_a
        } else {
            bet.total_amount_b
        };

        // NEW: Handle edge case where no one bet on winning option
        require!(total_winning_pool > 0, BettingError::NoWinnersFound);

        let total_pool = bet.total_amount_a + bet.total_amount_b;

        // Calculate winnings: (user_bet_amount / total_winning_pool) * total_pool
        let winnings = (user_bet.amount as u128 * total_pool as u128) / total_winning_pool as u128;

        // Transfer winnings to user
        **bet.to_account_info().try_borrow_mut_lamports()? -= winnings as u64;
        **ctx
            .accounts
            .user
            .to_account_info()
            .try_borrow_mut_lamports()? += winnings as u64;

        user_bet.is_claimed = true;
        user_bet.claimed_at = Clock::get()?.unix_timestamp; // NEW: Track claim time

        Ok(())
    }

    // Cancel bet (only creator can do this, only if no bets placed)
    pub fn cancel_bet(ctx: Context<CancelBet>, _bet_id: String) -> Result<()> {
        let bet = &ctx.accounts.bet;

        require!(
            bet.creator == *ctx.accounts.creator.key,
            BettingError::UnauthorizedResolver
        );
        require!(
            bet.total_amount_a == 0 && bet.total_amount_b == 0,
            BettingError::BetsAlreadyPlaced
        );
        require!(!bet.is_resolved, BettingError::BetAlreadyResolved);

        // Account will be closed automatically due to close constraint
        Ok(())
    }

    // NEW: Get bet statistics for better display
    pub fn get_bet_stats(ctx: Context<GetBetStats>, _bet_id: String) -> Result<BetStats> {
        let bet = &ctx.accounts.bet;

        let total_pool = bet.total_amount_a + bet.total_amount_b;
        let odds_a = if bet.total_amount_a > 0 {
            total_pool / bet.total_amount_a
        } else {
            0
        };
        let odds_b = if bet.total_amount_b > 0 {
            total_pool / bet.total_amount_b
        } else {
            0
        };

        Ok(BetStats {
            total_pool,
            odds_a,
            odds_b,
            total_bettors: bet.total_bettors,
            time_remaining: bet.end_time - Clock::get()?.unix_timestamp,
        })
    }
}

// NEW: Platform configuration context
#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(
        init,
        seeds = [b"platform_config"],
        bump,
        space = 8 + PlatformConfig::INIT_SPACE,
        payer = owner,
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// Account validation structs
#[derive(Accounts)]
#[instruction(bet_id: String)]
pub struct CreateBet<'info> {
    #[account(
        init,
        seeds = [b"bet", bet_id.as_bytes()],
        bump,
        space = 8 + BetState::INIT_SPACE,
        payer = creator,
    )]
    pub bet: Account<'info, BetState>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(bet_id: String)]
pub struct PlaceBet<'info> {
    #[account(
        mut,
        seeds = [b"bet", bet_id.as_bytes()],
        bump,
    )]
    pub bet: Account<'info, BetState>,
    #[account(
        init,
        seeds = [b"user_bet", bet_id.as_bytes(), user.key().as_ref()],
        bump,
        space = 8 + UserBetState::INIT_SPACE,
        payer = user,
    )]
    pub user_bet: Account<'info, UserBetState>,
    #[account(mut)]
    pub user: Signer<'info>,
    // NEW: Add platform config to access fee rates
    #[account(
        seeds = [b"platform_config"],
        bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(bet_id: String)]
pub struct ResolveBet<'info> {
    #[account(
        mut,
        seeds = [b"bet", bet_id.as_bytes()],
        bump,
    )]
    pub bet: Account<'info, BetState>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(bet_id: String)]
pub struct ClaimWinnings<'info> {
    #[account(
        mut,
        seeds = [b"bet", bet_id.as_bytes()],
        bump,
    )]
    pub bet: Account<'info, BetState>,
    #[account(
        mut,
        seeds = [b"user_bet", bet_id.as_bytes(), user.key().as_ref()],
        bump,
    )]
    pub user_bet: Account<'info, UserBetState>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// NEW: Context for claiming maker fees
#[derive(Accounts)]
#[instruction(bet_id: String)]
pub struct ClaimMakerFees<'info> {
    #[account(
        mut,
        seeds = [b"bet", bet_id.as_bytes()],
        bump,
    )]
    pub bet: Account<'info, BetState>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// NEW: Context for claiming platform fees
#[derive(Accounts)]
#[instruction(bet_id: String)]
pub struct ClaimPlatformFees<'info> {
    #[account(
        mut,
        seeds = [b"bet", bet_id.as_bytes()],
        bump,
    )]
    pub bet: Account<'info, BetState>,
    #[account(
        seeds = [b"platform_config"],
        bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    #[account(mut)]
    pub platform_owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(bet_id: String)]
pub struct CancelBet<'info> {
    #[account(
        mut,
        seeds = [b"bet", bet_id.as_bytes()],
        bump,
        close = creator,
    )]
    pub bet: Account<'info, BetState>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// NEW: Context for getting bet statistics
#[derive(Accounts)]
#[instruction(bet_id: String)]
pub struct GetBetStats<'info> {
    #[account(
        seeds = [b"bet", bet_id.as_bytes()],
        bump,
    )]
    pub bet: Account<'info, BetState>,
}

// NEW: Platform configuration account
#[account]
#[derive(InitSpace)]
pub struct PlatformConfig {
    pub owner: Pubkey,
    pub platform_fee_bps: u16, // basis points (100 = 1%)
    pub maker_fee_bps: u16,    // basis points (200 = 2%)
    pub total_volume: u64,
    pub total_fees_collected: u64,
    pub bump: u8,
}

// Data structures (ENHANCED)
#[account]
#[derive(InitSpace)]
pub struct BetState {
    pub creator: Pubkey,
    #[max_len(50)]
    pub bet_id: String,
    #[max_len(200)]
    pub description: String,
    #[max_len(100)]
    pub option_a: String,
    #[max_len(100)]
    pub option_b: String,
    pub end_time: i64,
    pub total_amount_a: u64,
    pub total_amount_b: u64,
    pub is_resolved: bool,
    pub winning_option: u8, // 0 = unresolved, 1 = option A, 2 = option B
    pub bump: u8,

    // NEW: Additional fields for better functionality
    pub min_bet_amount: u64,
    pub max_bet_amount: u64,
    #[max_len(50)]
    pub category: String,
    pub created_at: i64,
    pub resolved_at: i64,
    pub total_bettors: u64,
    pub maker_fee_collected: u64,
    pub platform_fee_collected: u64,
    #[max_len(300)]
    pub result_details: String,
}

// ENHANCED user bet state
#[account]
#[derive(InitSpace)]
pub struct UserBetState {
    pub user: Pubkey,
    #[max_len(50)]
    pub bet_id: String,
    pub option: u8,
    pub amount: u64, // net amount after fees
    pub is_claimed: bool,
    pub bump: u8,

    // NEW: Additional fields
    pub placed_at: i64,
    pub claimed_at: i64,
    pub original_amount: u64, // original amount before fees
}

// NEW: Bet statistics structure
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct BetStats {
    pub total_pool: u64,
    pub odds_a: u64,
    pub odds_b: u64,
    pub total_bettors: u64,
    pub time_remaining: i64,
}

// Custom errors (ENHANCED)
#[error_code]
pub enum BettingError {
    #[msg("Betting period has ended")]
    BettingClosed,
    #[msg("Bet has already been resolved")]
    BetAlreadyResolved,
    #[msg("Invalid betting option")]
    InvalidOption,
    #[msg("Invalid bet amount")]
    InvalidAmount,
    #[msg("Only bet creator can resolve")]
    UnauthorizedResolver,
    #[msg("Betting is still open")]
    BettingStillOpen,
    #[msg("Bet has not been resolved yet")]
    BetNotResolved,
    #[msg("Winnings already claimed")]
    AlreadyClaimed,
    #[msg("User did not win this bet")]
    NotWinner,
    #[msg("Bets have already been placed")]
    BetsAlreadyPlaced,

    // NEW: Additional error types
    #[msg("Fee rate too high (max 10%)")]
    FeeTooHigh,
    #[msg("Bet amount too low")]
    BetTooLow,
    #[msg("Bet amount too high")]
    BetTooHigh,
    #[msg("Invalid end time")]
    InvalidEndTime,
    #[msg("Invalid category")]
    InvalidCategory,
    #[msg("No fees to claim")]
    NoFeesToClaim,
    #[msg("Unauthorized platform owner")]
    UnauthorizedPlatformOwner,
    #[msg("No winners found")]
    NoWinnersFound,
}

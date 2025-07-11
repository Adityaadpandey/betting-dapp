#![allow(clippy::result_large_err)]
use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("69UzMhGARnmJuWtjbSwEe2t2co2LNc2YGEX1Jun8K9RK");

// Constants
const MAKER_FEE_RATE: u64 = 200; // 2% (in basis points)
const MAX_FEE_RATE: u64 = 1000; // 10% max fee rate
                                // const MIN_BET_DURATION: i64 = 3600; // 1 hour minimum
const MIN_BET_DURATION: i64 = 60; // 1 minutes minimum
const MAX_STRING_LENGTH: usize = 200;

#[program]
pub mod betting_dapp {
    use super::*;

    /// Create a new betting market
    pub fn create_bet(
        ctx: Context<CreateBet>,
        bet_id: String,
        description: String,
        option_a: String,
        option_b: String,
        end_time: i64,
        min_bet_amount: u64,
        max_bet_amount: u64,
        category: String,
    ) -> Result<()> {
        let bet = &mut ctx.accounts.bet;
        let clock = Clock::get()?;

        // Validations
        require!(
            end_time > clock.unix_timestamp + MIN_BET_DURATION,
            BettingError::InvalidEndTime
        );
        require!(min_bet_amount > 0, BettingError::InvalidAmount);
        require!(
            max_bet_amount >= min_bet_amount,
            BettingError::InvalidAmount
        );
        require!(
            !category.is_empty() && category.len() <= 50,
            BettingError::InvalidCategory
        );
        require!(
            !description.is_empty() && description.len() <= MAX_STRING_LENGTH,
            BettingError::InvalidDescription
        );

        // Initialize bet state
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
        bet.min_bet_amount = min_bet_amount;
        bet.max_bet_amount = max_bet_amount;
        bet.category = category;
        bet.created_at = clock.unix_timestamp;
        bet.resolved_at = 0;
        bet.maker_fee_collected = 0;
        bet.total_bettors = 0;
        bet.result_details = String::new();

        msg!("Bet created: {}", bet.bet_id);
        Ok(())
    }

    /// Place a bet on an option
    pub fn place_bet(
        ctx: Context<PlaceBet>,
        bet_id: String,
        option: u8, // 1 for option A, 2 for option B
        amount: u64,
    ) -> Result<()> {
        let bet = &mut ctx.accounts.bet;
        let user_bet = &mut ctx.accounts.user_bet;
        let clock = Clock::get()?;

        // Validations
        require!(
            clock.unix_timestamp < bet.end_time,
            BettingError::BettingClosed
        );
        require!(!bet.is_resolved, BettingError::BetAlreadyResolved);
        require!(option == 1 || option == 2, BettingError::InvalidOption);
        require!(amount > 0, BettingError::InvalidAmount);
        require!(amount >= bet.min_bet_amount, BettingError::BetTooLow);
        require!(amount <= bet.max_bet_amount, BettingError::BetTooHigh);

        // Calculate maker fee
        let maker_fee = calculate_maker_fee(amount);
        let net_amount = amount - maker_fee;

        // Update bet totals
        if option == 1 {
            bet.total_amount_a += net_amount;
        } else {
            bet.total_amount_b += net_amount;
        }

        bet.total_bettors += 1;
        bet.maker_fee_collected += maker_fee;

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
        user_bet.amount = net_amount;
        user_bet.is_claimed = false;
        user_bet.bump = ctx.bumps.user_bet;
        user_bet.placed_at = clock.unix_timestamp;
        user_bet.original_amount = amount;
        user_bet.claimed_at = 0;

        msg!("Bet placed: {} SOL on option {}", amount, option);
        Ok(())
    }

    /// Resolve a bet (only creator can do this)
    pub fn resolve_bet(
        ctx: Context<ResolveBet>,
        _bet_id: String,
        winning_option: u8,
        result_details: String,
    ) -> Result<()> {
        let bet = &mut ctx.accounts.bet;
        let clock = Clock::get()?;

        // Validations
        require!(!bet.is_resolved, BettingError::BetAlreadyResolved);
        require!(
            winning_option == 1 || winning_option == 2,
            BettingError::InvalidOption
        );
        require!(
            bet.creator == *ctx.accounts.creator.key,
            BettingError::UnauthorizedResolver
        );
        require!(
            clock.unix_timestamp >= bet.end_time,
            BettingError::BettingStillOpen
        );
        require!(
            result_details.len() <= 300,
            BettingError::InvalidResultDetails
        );

        bet.is_resolved = true;
        bet.winning_option = winning_option;
        bet.resolved_at = clock.unix_timestamp;
        bet.result_details = result_details;

        msg!("Bet resolved: option {} won", winning_option);
        Ok(())
    }

    /// Claim maker fees (only bet creator can do this)
    pub fn claim_maker_fees(ctx: Context<ClaimMakerFees>, _bet_id: String) -> Result<()> {
        let bet = &mut ctx.accounts.bet;

        // Validations
        require!(bet.is_resolved, BettingError::BetNotResolved);
        require!(
            bet.creator == *ctx.accounts.creator.key,
            BettingError::UnauthorizedResolver
        );
        require!(bet.maker_fee_collected > 0, BettingError::NoFeesToClaim);

        let fees_to_claim = bet.maker_fee_collected;

        // Transfer fees to creator
        **bet.to_account_info().try_borrow_mut_lamports()? -= fees_to_claim;
        **ctx
            .accounts
            .creator
            .to_account_info()
            .try_borrow_mut_lamports()? += fees_to_claim;

        bet.maker_fee_collected = 0;

        msg!("Maker fees claimed: {} SOL", fees_to_claim);
        Ok(())
    }

    /// Claim winnings for a winning bet
    pub fn claim_winnings(ctx: Context<ClaimWinnings>, _bet_id: String) -> Result<()> {
        let bet = &mut ctx.accounts.bet;
        let user_bet = &mut ctx.accounts.user_bet;

        // Validations
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

        require!(total_winning_pool > 0, BettingError::NoWinnersFound);

        let total_pool = bet.total_amount_a + bet.total_amount_b;

        // Calculate winnings proportionally
        let winnings = calculate_winnings(user_bet.amount, total_winning_pool, total_pool)?;

        // Transfer winnings to user
        **bet.to_account_info().try_borrow_mut_lamports()? -= winnings;
        **ctx
            .accounts
            .user
            .to_account_info()
            .try_borrow_mut_lamports()? += winnings;

        user_bet.is_claimed = true;
        user_bet.claimed_at = Clock::get()?.unix_timestamp;

        msg!("Winnings claimed: {} SOL", winnings);
        Ok(())
    }

    /// Cancel bet (only creator can do this, only if no bets placed)
    pub fn cancel_bet(ctx: Context<CancelBet>, _bet_id: String) -> Result<()> {
        let bet = &ctx.accounts.bet;

        // Validations
        require!(
            bet.creator == *ctx.accounts.creator.key,
            BettingError::UnauthorizedResolver
        );
        require!(
            bet.total_amount_a == 0 && bet.total_amount_b == 0,
            BettingError::BetsAlreadyPlaced
        );
        require!(!bet.is_resolved, BettingError::BetAlreadyResolved);

        msg!("Bet cancelled: {}", bet.bet_id);
        Ok(())
    }

    /// Get bet statistics
    pub fn get_bet_stats(ctx: Context<GetBetStats>, _bet_id: String) -> Result<BetStats> {
        let bet = &ctx.accounts.bet;
        let clock = Clock::get()?;

        let total_pool = bet.total_amount_a + bet.total_amount_b;
        let time_remaining = if bet.end_time > clock.unix_timestamp {
            bet.end_time - clock.unix_timestamp
        } else {
            0
        };

        let (odds_a, odds_b) = calculate_odds(bet.total_amount_a, bet.total_amount_b);

        Ok(BetStats {
            total_pool,
            odds_a,
            odds_b,
            total_bettors: bet.total_bettors,
            time_remaining,
        })
    }
}

// Helper functions
fn calculate_maker_fee(amount: u64) -> u64 {
    (amount * MAKER_FEE_RATE) / 10000
}

fn calculate_winnings(user_amount: u64, total_winning_pool: u64, total_pool: u64) -> Result<u64> {
    require!(total_winning_pool > 0, BettingError::NoWinnersFound);

    let winnings = (user_amount as u128 * total_pool as u128) / total_winning_pool as u128;
    Ok(winnings as u64)
}

fn calculate_odds(amount_a: u64, amount_b: u64) -> (u64, u64) {
    let total = amount_a + amount_b;
    if total == 0 {
        return (5000, 5000); // 50/50 odds in basis points
    }

    let odds_a = (amount_b * 10000) / total;
    let odds_b = (amount_a * 10000) / total;
    (odds_a, odds_b)
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

#[derive(Accounts)]
#[instruction(bet_id: String)]
pub struct GetBetStats<'info> {
    #[account(
        seeds = [b"bet", bet_id.as_bytes()],
        bump,
    )]
    pub bet: Account<'info, BetState>,
}

// Account state definitions
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
    pub min_bet_amount: u64,
    pub max_bet_amount: u64,
    #[max_len(50)]
    pub category: String,
    pub created_at: i64,
    pub resolved_at: i64,
    pub total_bettors: u64,
    pub maker_fee_collected: u64,
    #[max_len(300)]
    pub result_details: String,
}

#[account]
#[derive(InitSpace)]
pub struct UserBetState {
    pub user: Pubkey,
    #[max_len(50)]
    pub bet_id: String,
    pub option: u8,
    pub amount: u64,
    pub is_claimed: bool,
    pub bump: u8,
    pub placed_at: i64,
    pub claimed_at: i64,
    pub original_amount: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct BetStats {
    pub total_pool: u64,
    pub odds_a: u64,
    pub odds_b: u64,
    pub total_bettors: u64,
    pub time_remaining: i64,
}

// Custom error codes
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
    #[msg("Invalid description")]
    InvalidDescription,
    #[msg("Invalid result details")]
    InvalidResultDetails,
}

#![allow(clippy::result_large_err)]
use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("22hXmGnod6ytgUPuNaj3UCYj9aamhgVa4fjDed16ob1R");

#[program]
pub mod betting_dapp {
    use super::*;

    // Create a new betting market
    pub fn create_bet(
        ctx: Context<CreateBet>,
        bet_id: String,
        description: String,
        option_a: String,
        option_b: String,
        end_time: i64,
    ) -> Result<()> {
        let bet = &mut ctx.accounts.bet;
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

        // Check if betting is still open
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp < bet.end_time,
            BettingError::BettingClosed
        );
        require!(!bet.is_resolved, BettingError::BetAlreadyResolved);
        require!(option == 1 || option == 2, BettingError::InvalidOption);
        require!(amount > 0, BettingError::InvalidAmount);

        // Update bet totals
        if option == 1 {
            bet.total_amount_a += amount;
        } else {
            bet.total_amount_b += amount;
        }

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
        user_bet.amount = amount;
        user_bet.is_claimed = false;
        user_bet.bump = ctx.bumps.user_bet;

        Ok(())
    }

    // Resolve a bet (only creator can do this)
    pub fn resolve_bet(
        ctx: Context<ResolveBet>,
        _bet_id: String,
        winning_option: u8,
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

        Ok(())
    }

    // Claim winnings
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

// Data structures
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
}

// Custom errors
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
}

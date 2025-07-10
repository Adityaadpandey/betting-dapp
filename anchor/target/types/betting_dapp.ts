/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/betting_dapp.json`.
 */
export type BettingDapp = {
  address: '22hXmGnod6ytgUPuNaj3UCYj9aamhgVa4fjDed16ob1R'
  metadata: {
    name: 'bettingDapp'
    version: '0.1.0'
    spec: '0.1.0'
    description: 'Created with Anchor'
  }
  instructions: [
    {
      name: 'cancelBet'
      docs: ['Cancel bet (only creator can do this, only if no bets placed)']
      discriminator: [17, 248, 130, 128, 153, 227, 231, 9]
      accounts: [
        {
          name: 'bet'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [98, 101, 116]
              },
              {
                kind: 'arg'
                path: 'betId'
              },
            ]
          }
        },
        {
          name: 'creator'
          writable: true
          signer: true
        },
        {
          name: 'systemProgram'
          address: '11111111111111111111111111111111'
        },
      ]
      args: [
        {
          name: 'betId'
          type: 'string'
        },
      ]
    },
    {
      name: 'claimMakerFees'
      docs: ['Claim maker fees (only bet creator can do this)']
      discriminator: [102, 69, 89, 31, 119, 199, 231, 77]
      accounts: [
        {
          name: 'bet'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [98, 101, 116]
              },
              {
                kind: 'arg'
                path: 'betId'
              },
            ]
          }
        },
        {
          name: 'creator'
          writable: true
          signer: true
        },
        {
          name: 'systemProgram'
          address: '11111111111111111111111111111111'
        },
      ]
      args: [
        {
          name: 'betId'
          type: 'string'
        },
      ]
    },
    {
      name: 'claimWinnings'
      docs: ['Claim winnings for a winning bet']
      discriminator: [161, 215, 24, 59, 14, 236, 242, 221]
      accounts: [
        {
          name: 'bet'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [98, 101, 116]
              },
              {
                kind: 'arg'
                path: 'betId'
              },
            ]
          }
        },
        {
          name: 'userBet'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [117, 115, 101, 114, 95, 98, 101, 116]
              },
              {
                kind: 'arg'
                path: 'betId'
              },
              {
                kind: 'account'
                path: 'user'
              },
            ]
          }
        },
        {
          name: 'user'
          writable: true
          signer: true
        },
        {
          name: 'systemProgram'
          address: '11111111111111111111111111111111'
        },
      ]
      args: [
        {
          name: 'betId'
          type: 'string'
        },
      ]
    },
    {
      name: 'createBet'
      docs: ['Create a new betting market']
      discriminator: [197, 42, 153, 2, 59, 63, 143, 246]
      accounts: [
        {
          name: 'bet'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [98, 101, 116]
              },
              {
                kind: 'arg'
                path: 'betId'
              },
            ]
          }
        },
        {
          name: 'creator'
          writable: true
          signer: true
        },
        {
          name: 'systemProgram'
          address: '11111111111111111111111111111111'
        },
      ]
      args: [
        {
          name: 'betId'
          type: 'string'
        },
        {
          name: 'description'
          type: 'string'
        },
        {
          name: 'optionA'
          type: 'string'
        },
        {
          name: 'optionB'
          type: 'string'
        },
        {
          name: 'endTime'
          type: 'i64'
        },
        {
          name: 'minBetAmount'
          type: 'u64'
        },
        {
          name: 'maxBetAmount'
          type: 'u64'
        },
        {
          name: 'category'
          type: 'string'
        },
      ]
    },
    {
      name: 'getBetStats'
      docs: ['Get bet statistics']
      discriminator: [4, 186, 166, 115, 85, 76, 95, 190]
      accounts: [
        {
          name: 'bet'
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [98, 101, 116]
              },
              {
                kind: 'arg'
                path: 'betId'
              },
            ]
          }
        },
      ]
      args: [
        {
          name: 'betId'
          type: 'string'
        },
      ]
      returns: {
        defined: {
          name: 'betStats'
        }
      }
    },
    {
      name: 'placeBet'
      docs: ['Place a bet on an option']
      discriminator: [222, 62, 67, 220, 63, 166, 126, 33]
      accounts: [
        {
          name: 'bet'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [98, 101, 116]
              },
              {
                kind: 'arg'
                path: 'betId'
              },
            ]
          }
        },
        {
          name: 'userBet'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [117, 115, 101, 114, 95, 98, 101, 116]
              },
              {
                kind: 'arg'
                path: 'betId'
              },
              {
                kind: 'account'
                path: 'user'
              },
            ]
          }
        },
        {
          name: 'user'
          writable: true
          signer: true
        },
        {
          name: 'systemProgram'
          address: '11111111111111111111111111111111'
        },
      ]
      args: [
        {
          name: 'betId'
          type: 'string'
        },
        {
          name: 'option'
          type: 'u8'
        },
        {
          name: 'amount'
          type: 'u64'
        },
      ]
    },
    {
      name: 'resolveBet'
      docs: ['Resolve a bet (only creator can do this)']
      discriminator: [137, 132, 33, 97, 48, 208, 30, 159]
      accounts: [
        {
          name: 'bet'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [98, 101, 116]
              },
              {
                kind: 'arg'
                path: 'betId'
              },
            ]
          }
        },
        {
          name: 'creator'
          writable: true
          signer: true
        },
        {
          name: 'systemProgram'
          address: '11111111111111111111111111111111'
        },
      ]
      args: [
        {
          name: 'betId'
          type: 'string'
        },
        {
          name: 'winningOption'
          type: 'u8'
        },
        {
          name: 'resultDetails'
          type: 'string'
        },
      ]
    },
  ]
  accounts: [
    {
      name: 'betState'
      discriminator: [143, 61, 238, 62, 232, 157, 101, 185]
    },
    {
      name: 'userBetState'
      discriminator: [250, 140, 178, 232, 8, 193, 153, 157]
    },
  ]
  errors: [
    {
      code: 6000
      name: 'bettingClosed'
      msg: 'Betting period has ended'
    },
    {
      code: 6001
      name: 'betAlreadyResolved'
      msg: 'Bet has already been resolved'
    },
    {
      code: 6002
      name: 'invalidOption'
      msg: 'Invalid betting option'
    },
    {
      code: 6003
      name: 'invalidAmount'
      msg: 'Invalid bet amount'
    },
    {
      code: 6004
      name: 'unauthorizedResolver'
      msg: 'Only bet creator can resolve'
    },
    {
      code: 6005
      name: 'bettingStillOpen'
      msg: 'Betting is still open'
    },
    {
      code: 6006
      name: 'betNotResolved'
      msg: 'Bet has not been resolved yet'
    },
    {
      code: 6007
      name: 'alreadyClaimed'
      msg: 'Winnings already claimed'
    },
    {
      code: 6008
      name: 'notWinner'
      msg: 'User did not win this bet'
    },
    {
      code: 6009
      name: 'betsAlreadyPlaced'
      msg: 'Bets have already been placed'
    },
    {
      code: 6010
      name: 'feeTooHigh'
      msg: 'Fee rate too high (max 10%)'
    },
    {
      code: 6011
      name: 'betTooLow'
      msg: 'Bet amount too low'
    },
    {
      code: 6012
      name: 'betTooHigh'
      msg: 'Bet amount too high'
    },
    {
      code: 6013
      name: 'invalidEndTime'
      msg: 'Invalid end time'
    },
    {
      code: 6014
      name: 'invalidCategory'
      msg: 'Invalid category'
    },
    {
      code: 6015
      name: 'noFeesToClaim'
      msg: 'No fees to claim'
    },
    {
      code: 6016
      name: 'unauthorizedPlatformOwner'
      msg: 'Unauthorized platform owner'
    },
    {
      code: 6017
      name: 'noWinnersFound'
      msg: 'No winners found'
    },
    {
      code: 6018
      name: 'invalidDescription'
      msg: 'Invalid description'
    },
    {
      code: 6019
      name: 'invalidResultDetails'
      msg: 'Invalid result details'
    },
  ]
  types: [
    {
      name: 'betState'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'creator'
            type: 'pubkey'
          },
          {
            name: 'betId'
            type: 'string'
          },
          {
            name: 'description'
            type: 'string'
          },
          {
            name: 'optionA'
            type: 'string'
          },
          {
            name: 'optionB'
            type: 'string'
          },
          {
            name: 'endTime'
            type: 'i64'
          },
          {
            name: 'totalAmountA'
            type: 'u64'
          },
          {
            name: 'totalAmountB'
            type: 'u64'
          },
          {
            name: 'isResolved'
            type: 'bool'
          },
          {
            name: 'winningOption'
            type: 'u8'
          },
          {
            name: 'bump'
            type: 'u8'
          },
          {
            name: 'minBetAmount'
            type: 'u64'
          },
          {
            name: 'maxBetAmount'
            type: 'u64'
          },
          {
            name: 'category'
            type: 'string'
          },
          {
            name: 'createdAt'
            type: 'i64'
          },
          {
            name: 'resolvedAt'
            type: 'i64'
          },
          {
            name: 'totalBettors'
            type: 'u64'
          },
          {
            name: 'makerFeeCollected'
            type: 'u64'
          },
          {
            name: 'resultDetails'
            type: 'string'
          },
        ]
      }
    },
    {
      name: 'betStats'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'totalPool'
            type: 'u64'
          },
          {
            name: 'oddsA'
            type: 'u64'
          },
          {
            name: 'oddsB'
            type: 'u64'
          },
          {
            name: 'totalBettors'
            type: 'u64'
          },
          {
            name: 'timeRemaining'
            type: 'i64'
          },
        ]
      }
    },
    {
      name: 'userBetState'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'user'
            type: 'pubkey'
          },
          {
            name: 'betId'
            type: 'string'
          },
          {
            name: 'option'
            type: 'u8'
          },
          {
            name: 'amount'
            type: 'u64'
          },
          {
            name: 'isClaimed'
            type: 'bool'
          },
          {
            name: 'bump'
            type: 'u8'
          },
          {
            name: 'placedAt'
            type: 'i64'
          },
          {
            name: 'claimedAt'
            type: 'i64'
          },
          {
            name: 'originalAmount'
            type: 'u64'
          },
        ]
      }
    },
  ]
}

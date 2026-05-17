/**
 * Line-bet / wallet helper copy shared by toast (GameProvider) and Spin History hint.
 * One place to edit CTA wording so UI stays consistent.
 */

export const BET_RAISE_BALANCE_CTA =
  'Claim rewards or open Shop when you want to raise your bet again.'

/** Muted hint under Spin History when paid spins are blocked by balance. */
export const SPIN_HISTORY_LOW_BALANCE_HINT =
  'Need more Vault Coins for this line bet? Claim rewards or open Shop to build your balance again.'

export function formatBetAdjustedToastBody(previousBet: number, nextBet: number): string {
  return `Was ${previousBet.toLocaleString()} VC, now ${nextBet.toLocaleString()} VC, to match your balance. ${BET_RAISE_BALANCE_CTA}`
}

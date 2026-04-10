import { Expense, Member, Settlement } from "./storage";
import { generateId } from "./helpers";

export interface MemberBalance {
  member: Member;
  totalPaid: number;
  totalOwed: number;
  net: number;
}

export interface Debt {
  from: Member;
  to: Member;
  amount: number;
}

export function calculateBalances(
  members: Member[],
  expenses: Expense[]
): MemberBalance[] {
  const totalPaid: Record<string, number> = {};
  const totalOwed: Record<string, number> = {};

  for (const m of members) {
    totalPaid[m.id] = 0;
    totalOwed[m.id] = 0;
  }

  for (const exp of expenses) {
    if (totalPaid[exp.paidById] !== undefined) {
      totalPaid[exp.paidById] += exp.amount;
    }
    for (const split of exp.splits) {
      if (totalOwed[split.memberId] !== undefined) {
        totalOwed[split.memberId] += split.amountOwed;
      }
    }
  }

  return members.map((m) => ({
    member: m,
    totalPaid: totalPaid[m.id] || 0,
    totalOwed: totalOwed[m.id] || 0,
    net: (totalPaid[m.id] || 0) - (totalOwed[m.id] || 0),
  }));
}

export function simplifyDebts(balances: MemberBalance[]): Debt[] {
  const creditors = balances
    .filter((b) => b.net > 0.01)
    .map((b) => ({ member: b.member, amount: b.net }))
    .sort((a, b) => b.amount - a.amount);

  const debtors = balances
    .filter((b) => b.net < -0.01)
    .map((b) => ({ member: b.member, amount: Math.abs(b.net) }))
    .sort((a, b) => b.amount - a.amount);

  const debts: Debt[] = [];

  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const amount = Math.min(creditor.amount, debtor.amount);

    if (amount > 0.01) {
      debts.push({
        from: debtor.member,
        to: creditor.member,
        amount: Math.round(amount * 100) / 100,
      });
    }

    creditor.amount -= amount;
    debtor.amount -= amount;

    if (creditor.amount < 0.01) ci++;
    if (debtor.amount < 0.01) di++;
  }

  return debts;
}

export function generateSettlements(
  debts: Debt[],
  existing: Settlement[]
): Settlement[] {
  return debts.map((debt) => {
    const found = existing.find(
      (s) => s.fromId === debt.from.id && s.toId === debt.to.id
    );
    return (
      found || {
        id: generateId(),
        fromId: debt.from.id,
        toId: debt.to.id,
        amount: debt.amount,
        isPaid: false,
      }
    );
  });
}

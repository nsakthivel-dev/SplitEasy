import { Expense, Member, Settlement, MemberNet } from "./storage";
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

export function calculateMemberNets(expense: Expense, members: Member[]): MemberNet[] {
  const splitAmongCount = expense.splitAmong.length;
  if (splitAmongCount === 0) return [];

  const sharePerPerson = expense.amount / splitAmongCount;
  const nets: Record<string, number> = {};

  // Initialize all members with 0
  for (const m of members) {
    nets[m.id] = 0;
  }

  // Calculate net for each member: paid - share
  for (const m of members) {
    const paidAmount = expense.payers.find((p) => p.memberId === m.id)?.amountPaid || 0;
    const isSplitAmong = expense.splitAmong.includes(m.id);
    const owedAmount = isSplitAmong ? sharePerPerson : 0;
    nets[m.id] = paidAmount - owedAmount;
  }

  return members.map((m) => ({
    memberId: m.id,
    name: m.name,
    net: Math.round(nets[m.id] * 100) / 100,
  }));
}

export function calculateBalances(
  members: Member[],
  expenses: Expense[]
): MemberBalance[] {
  // Initialize balances
  const netBalance: Record<string, number> = {};
  for (const m of members) {
    netBalance[m.id] = 0;
  }

  // Recalculate from scratch for each expense
  for (const exp of expenses) {
    const memberNets = calculateMemberNets(exp, members);
    for (const mn of memberNets) {
      if (netBalance[mn.memberId] !== undefined) {
        netBalance[mn.memberId] += mn.net;
      }
    }
  }

  return members.map((m) => ({
    member: m,
    totalPaid: 0, // We're using net directly now
    totalOwed: 0,
    net: Math.round(netBalance[m.id] * 100) / 100,
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

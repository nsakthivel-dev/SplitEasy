import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Member {
  id: string;
  name: string;
  phoneNumber?: string | null;
  avatarUri?: string | null;
  addedFromContacts?: boolean;
}

export interface Split {
  memberId: string;
  amountOwed: number;
}

export interface Payer {
  memberId: string;
  amountPaid: number;
}

export interface Expense {
  id: string;
  title: string;
  description?: string;
  amount: number;
  category: string;
  date: string;
  payers: Payer[];
  splitAmong: string[]; // member IDs who this expense is split among
  splits: Split[];
  memberNets?: Record<string, number>; // member ID -> net for this expense
}

export interface Settlement {
  id: string;
  fromId: string;
  toId: string;
  amount: number;
  isPaid: boolean;
}

export interface MemberNet {
  memberId: string;
  name: string;
  net: number;
}

export interface ExpenseDetail {
  expense: Expense;
  memberNets: MemberNet[];
}

export interface Group {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  members: Member[];
  expenses: Expense[];
  settlements: Settlement[];
}

const STORAGE_KEY = "splitease_groups";

export async function getAllGroups(): Promise<Group[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveAllGroups(groups: Group[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
}

export async function getGroupByCode(code: string): Promise<Group | null> {
  const groups = await getAllGroups();
  return groups.find((g) => g.code === code) || null;
}

export async function saveGroup(group: Group): Promise<void> {
  const groups = await getAllGroups();
  const idx = groups.findIndex((g) => g.id === group.id);
  if (idx >= 0) {
    groups[idx] = group;
  } else {
    groups.unshift(group);
  }
  await saveAllGroups(groups);
}

export async function deleteGroup(id: string): Promise<void> {
  const groups = await getAllGroups();
  await saveAllGroups(groups.filter((g) => g.id !== id));
}

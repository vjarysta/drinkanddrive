export interface DrinkInfo {
  id: string;
  name?: string;
  amount: number;
  alcoholPercentage: number;
  timestamp: Date;
}

export interface UserInfo {
  weight: number;
  gender: 'male' | 'female';
}

export interface BACResult {
  bac: number;
  status: 'safe' | 'caution' | 'danger';
  message: string;
  timestamp: Date;
}

export interface SavedDrink {
  id: string;
  name: string;
  amount: number;
  alcoholPercentage: number;
}
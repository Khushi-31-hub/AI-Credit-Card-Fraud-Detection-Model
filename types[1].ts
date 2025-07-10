
export interface TransactionData {
  amount: number;
  merchantCategory: string;
  time: string; // HH:MM
  location: string;
  historicalSpendingAverage: number;
}

export interface FraudReport {
  isFraudulent: boolean;
  confidenceScore: number; // 0.0 to 1.0
  reasoning: string;
  recommendation: string;
}


import React, { useState, useCallback } from 'react';
import { analyzeTransaction } from './services/geminiService';
import { MERCHANT_CATEGORIES } from './constants';
import type { TransactionData, FraudReport } from './types';
import { ShieldCheckIcon, AlertTriangleIcon, LoaderIcon } from './components/icons';

const initialTransactionData: TransactionData = {
  amount: 150.00,
  merchantCategory: 'Online Shopping',
  time: '14:30',
  location: 'San Francisco, CA',
  historicalSpendingAverage: 85.50
};

// Sub-component for the form to prevent re-renders
const FraudDetectionForm: React.FC<{
  data: TransactionData;
  setData: React.Dispatch<React.SetStateAction<TransactionData>>;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}> = ({ data, setData, onSubmit, isLoading }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setData(prev => ({ ...prev, [name]: name === 'amount' || name === 'historicalSpendingAverage' ? parseFloat(value) : value }));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6 bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-700">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-slate-300 mb-2">Transaction Amount ($)</label>
          <input type="number" name="amount" id="amount" value={data.amount} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="e.g., 250.75" step="0.01" required />
        </div>
        <div>
          <label htmlFor="merchantCategory" className="block text-sm font-medium text-slate-300 mb-2">Merchant Category</label>
          <select name="merchantCategory" id="merchantCategory" value={data.merchantCategory} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition">
            {MERCHANT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="time" className="block text-sm font-medium text-slate-300 mb-2">Time of Transaction (24h)</label>
          <input type="time" name="time" id="time" value={data.time} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" required />
        </div>
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-slate-300 mb-2">Location</label>
          <input type="text" name="location" id="location" value={data.location} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="e.g., Miami, FL" required />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="historicalSpendingAverage" className="block text-sm font-medium text-slate-300 mb-2">Historical Average Spend ($)</label>
          <input type="number" name="historicalSpendingAverage" id="historicalSpendingAverage" value={data.historicalSpendingAverage} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="e.g., 75.50" step="0.01" required />
        </div>
      </div>
      <button type="submit" disabled={isLoading} className="w-full flex justify-center items-center gap-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg hover:shadow-blue-500/50 focus:outline-none focus:ring-4 focus:ring-blue-500/50">
        {isLoading ? <><LoaderIcon className="animate-spin h-5 w-5"/> Analyzing...</> : 'Check for Fraud'}
      </button>
    </form>
  );
};


// Sub-component for the result display
const ResultDisplay: React.FC<{ report: FraudReport }> = ({ report }) => {
  const isFraud = report.isFraudulent;
  const scoreColor = isFraud ? 'text-red-400' : 'text-green-400';
  const bgColor = isFraud ? 'bg-red-900/20 border-red-500/30' : 'bg-green-900/20 border-green-500/30';
  const Icon = isFraud ? AlertTriangleIcon : ShieldCheckIcon;
  const confidencePercentage = (report.confidenceScore * 100).toFixed(0);

  return (
    <div className={`mt-8 p-6 rounded-xl border ${bgColor} shadow-2xl animate-fade-in`}>
      <div className="flex items-center gap-4">
        <Icon className={`h-10 w-10 ${scoreColor}`} />
        <div>
          <h3 className={`text-2xl font-bold ${scoreColor}`}>
            {isFraud ? 'High Fraud Potential Detected' : 'Likely Legitimate Transaction'}
          </h3>
          <p className="text-slate-400">{report.recommendation}</p>
        </div>
      </div>
      <div className="mt-6 space-y-4">
        <div>
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-slate-300">Confidence Score</span>
                <span className={`text-sm font-bold ${scoreColor}`}>{confidencePercentage}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div 
                    className={`h-2.5 rounded-full ${isFraud ? 'bg-red-500' : 'bg-green-500'} transition-all duration-500`} 
                    style={{width: `${confidencePercentage}%`}}>
                </div>
            </div>
        </div>
        <div>
          <h4 className="text-lg font-semibold text-slate-200">Analysis Breakdown</h4>
          <p className="text-slate-400 text-sm mt-1">{report.reasoning}</p>
        </div>
      </div>
    </div>
  );
};


export default function App() {
  const [transactionData, setTransactionData] = useState<TransactionData>(initialTransactionData);
  const [fraudReport, setFraudReport] = useState<FraudReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setFraudReport(null);
    try {
      const report = await analyzeTransaction(transactionData);
      setFraudReport(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [transactionData]);

  return (
    <div className="bg-slate-900 text-white min-h-screen flex flex-col items-center justify-center p-4 font-sans">
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
      `}</style>
      <div className="w-full max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
            AI Fraud Detection Model
          </h1>
          <p className="text-slate-400 mt-2 text-lg">
            Enter transaction details to assess the likelihood of fraud using Gemini.
          </p>
        </header>

        <main>
          <FraudDetectionForm 
            data={transactionData}
            setData={setTransactionData}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />

          {error && (
            <div className="mt-8 p-4 text-center text-red-300 bg-red-900/50 border border-red-500/50 rounded-lg animate-fade-in">
              <strong>Error:</strong> {error}
            </div>
          )}

          {fraudReport && !isLoading && <ResultDisplay report={fraudReport} />}
        </main>
        <footer className="text-center mt-12 text-slate-500 text-sm">
            <p>Powered by Google Gemini. For demonstration purposes only.</p>
        </footer>
      </div>
    </div>
  );
}

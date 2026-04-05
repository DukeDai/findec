export interface FundamentalData {
  symbol: string;
  name: string;
  price: number;
  marketCap: number;
  pe: number | null;
  peg: number | null;
  pb: number | null;
  dividendYield: number | null;
  eps: number | null;
  beta: number | null;
  week52High: number;
  week52Low: number;
}

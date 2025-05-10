export interface PriceData {
  price: number;
  timestamp: string;
}

/**
 * Fetch current USD price for a given asset using CoinGecko
 */
export async function fetchCryptoPrice(asset: string): Promise<PriceData> {
  const id = asset.toLowerCase();
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${id.toLowerCase()}&vs_currencies=usd`,
  );
  if (!res.ok)
    throw new Error(`Failed to fetch price for ${asset}: ${res.status}`);
  const json = await res.json();
  const price = json[id]?.usd;
  if (price == null) throw new Error(`No price data for ${asset}`);
  return { price, timestamp: new Date().toISOString() };
}

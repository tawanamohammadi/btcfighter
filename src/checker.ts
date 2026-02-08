import axios from 'axios';

export interface BalanceResult {
    address: string;
    balance: number; // in Satoshis
    error?: string;
    source: string;
}

export class BalanceChecker {
    private static apiIndex = 0;

    // List of public APIs to rotate
    private static apis = [
        {
            url: (addr: string) => `https://blockchain.info/q/addressbalance/${addr}`,
            parse: (resp: any) => parseInt(resp.data),
            name: 'Blockchain.info'
        },
        {
            url: (addr: string) => `https://blockstream.info/api/address/${addr}`,
            parse: (resp: any) => resp.data.chain_stats.funded_txo_sum - resp.data.chain_stats.spent_txo_sum,
            name: 'Blockstream.info'
        },
        {
            url: (addr: string) => `https://api.blockcypher.com/v1/btc/main/addrs/${addr}/balance`,
            parse: (resp: any) => resp.data.balance,
            name: 'BlockCypher'
        },
        {
            url: (addr: string) => `https://chain.so/api/v2/get_address_balance/BTC/${addr}`,
            parse: (resp: any) => Math.floor(parseFloat(resp.data.data.confirmed_balance) * 100000000),
            name: 'Chain.so'
        }
    ];

    /**
     * Checks balance of an address by rotating between public APIs
     */
    static async check(address: string): Promise<BalanceResult> {
        // Try all APIs in rotation if one fails
        for (let i = 0; i < this.apis.length; i++) {
            const api = this.apis[(this.apiIndex + i) % this.apis.length];
            try {
                const response = await axios.get(api.url(address), { timeout: 5000 });
                const balance = api.parse(response);

                // Move index for next call
                this.apiIndex = (this.apiIndex + 1) % this.apis.length;

                return { address, balance, source: api.name };
            } catch (err: any) {
                // If last API also fails, return error
                if (i === this.apis.length - 1) {
                    return { address, balance: 0, error: err.message, source: 'None' };
                }
                // Otherwise, continue loop to try next API
            }
        }

        return { address, balance: 0, error: 'Unknown failure', source: 'None' };
    }
}

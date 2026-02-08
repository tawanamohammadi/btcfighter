import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

export interface SavedWallet {
    id?: number;
    mnemonic: string;
    address: string;
    balance: number;
    type: string;
    timestamp: string;
}

export class WalletDB {
    private db: Database | null = null;

    async init() {
        this.db = await open({
            filename: path.join(__dirname, '../wallets.db'),
            driver: sqlite3.Database
        });

        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS found_wallets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mnemonic TEXT,
                address TEXT UNIQUE,
                balance INTEGER,
                type TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }

    async saveWallet(wallet: SavedWallet) {
        if (!this.db) return;
        await this.db.run(
            'INSERT OR IGNORE INTO found_wallets (mnemonic, address, balance, type) VALUES (?, ?, ?, ?)',
            [wallet.mnemonic, wallet.address, wallet.balance, wallet.type]
        );
    }

    async getHits() {
        if (!this.db) return [];
        return await this.db.all('SELECT * FROM found_wallets ORDER BY timestamp DESC');
    }
}

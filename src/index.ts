import { WalletGenerator } from './wallet';
import { BalanceChecker } from './checker';
import { WalletDB } from './db';
import cliProgress from 'cli-progress';
import chalk from 'chalk';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
    console.log(chalk.yellow('\n--- Bitcoin Wallet Corporate Tester ---'));
    console.log(chalk.gray('Initializing system...'));

    const db = new WalletDB();
    await db.init();

    const multibar = new cliProgress.MultiBar({
        clearOnComplete: false,
        hideCursor: true,
        format: ' {bar} | {percentage}% | {value}/{total} | {status} | Found: {found}',
    }, cliProgress.Presets.shades_grey);

    const b1 = multibar.create(1000000, 0, { status: 'Generating...', found: 0 });

    let checks = 0;
    let foundCount = 0;

    // Run parallel checks
    const CONCURRENCY = 5; // Adjust based on API limits

    async function worker() {
        while (true) {
            try {
                // 1. Generate local wallet (Math, no API)
                const wallet = WalletGenerator.generate('bech32');

                // 2. Check balance (API Request)
                const result = await BalanceChecker.check(wallet.address);

                checks++;
                b1.increment(1, { status: `Checking: ${wallet.address.substring(0, 10)}...`, found: foundCount });

                if (result.balance > 0) {
                    foundCount++;
                    await db.saveWallet({
                        mnemonic: wallet.mnemonic,
                        address: wallet.address,
                        balance: result.balance,
                        type: wallet.type,
                        timestamp: new Date().toISOString()
                    });

                    multibar.log(chalk.green(`\n[!!!] HIT FOUND: ${wallet.address} | Balance: ${result.balance} sats\n`));
                    multibar.log(chalk.cyan(`Mnemonic: ${wallet.mnemonic}\n`));
                }

                // Small delay to respect API limits
                await new Promise(r => setTimeout(r, 200));
            } catch (err) {
                // Silently continue or log to multibar
            }
        }
    }

    // Launch workers
    for (let i = 0; i < CONCURRENCY; i++) {
        worker();
    }
}

main().catch(err => {
    console.error(chalk.red('Fatal error:'), err);
});

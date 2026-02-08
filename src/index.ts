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

    const b1 = multibar.create(1000000, 0, { status: 'Initializing...', found: 0 });

    let checks = 0;
    let foundCount = 0;

    // Run parallel checks
    const CONCURRENCY = 10; // Increased for corporate speed
    const TYPES: ('bech32' | 'segwit' | 'legacy')[] = ['bech32', 'segwit', 'legacy'];

    async function worker() {
        while (true) {
            try {
                // 1. Generate local wallet (Math, no API)
                const mnemonic = WalletGenerator.generate('bech32').mnemonic;

                // 2. Check all 3 address types (Corporate thoroughness)
                for (const type of TYPES) {
                    const wallet = WalletGenerator.fromMnemonic(mnemonic, type);
                    const result = await BalanceChecker.check(wallet.address);

                    checks++;
                    b1.increment(1, { status: `Checking ${type}: ${wallet.address.substring(0, 8)}...`, found: foundCount });

                    if (result.balance > 0) {
                        foundCount++;
                        await db.saveWallet({
                            mnemonic: wallet.mnemonic,
                            address: wallet.address,
                            balance: result.balance,
                            type: wallet.type,
                            timestamp: new Date().toISOString()
                        });

                        multibar.log(chalk.green(`\n[!!!] HIT FOUND (${type}): ${wallet.address} | Balance: ${result.balance} sats\n`));
                        multibar.log(chalk.cyan(`Mnemonic: ${wallet.mnemonic}\n`));
                    }

                    // Respect API limits
                    await new Promise(r => setTimeout(r, 100));
                }
            } catch (err) {
                // Silently continue
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

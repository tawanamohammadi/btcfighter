import * as bip39 from 'bip39';
import * as bip32 from 'bip32';
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory, ECPairAPI } from 'ecpair';
import * as tinysecp from 'tiny-secp256k1';

const ECPair: ECPairAPI = ECPairFactory(tinysecp);
const bip32Interface = bip32.BIP32Factory(tinysecp);

export interface WalletInfo {
    mnemonic: string;
    address: string;
    path: string;
    type: string;
}

export class WalletGenerator {
    /**
     * Generates a new 12-word mnemonic and derives the first address
     * @param type 'bech32' (bc1q), 'segwit' (3...), 'legacy' (1...)
     */
    static generate(type: 'bech32' | 'segwit' | 'legacy' = 'bech32'): WalletInfo {
        const mnemonic = bip39.generateMnemonic();
        return this.fromMnemonic(mnemonic, type);
    }

    static fromMnemonic(mnemonic: string, type: 'bech32' | 'segwit' | 'legacy' = 'bech32'): WalletInfo {
        const seed = bip39.mnemonicToSeedSync(mnemonic);
        const root = bip32Interface.fromSeed(seed);

        let path = '';
        let address = '';

        if (type === 'bech32') {
            // Native SegWit (BIP84) - bc1...
            path = "m/84'/0'/0'/0/0";
            const child = root.derivePath(path);
            const { address: addr } = bitcoin.payments.p2wpkh({
                pubkey: child.publicKey,
                network: bitcoin.networks.bitcoin
            });
            address = addr!;
        } else if (type === 'segwit') {
            // Nested SegWit (BIP49) - 3...
            path = "m/49'/0'/0'/0/0";
            const child = root.derivePath(path);
            const { address: addr } = bitcoin.payments.p2sh({
                redeem: bitcoin.payments.p2wpkh({
                    pubkey: child.publicKey,
                    network: bitcoin.networks.bitcoin
                }),
                network: bitcoin.networks.bitcoin
            });
            address = addr!;
        } else {
            // Legacy (BIP44) - 1...
            path = "m/44'/0'/0'/0/0";
            const child = root.derivePath(path);
            const { address: addr } = bitcoin.payments.p2pkh({
                pubkey: child.publicKey,
                network: bitcoin.networks.bitcoin
            });
            address = addr!;
        }

        return { mnemonic, address, path, type };
    }
}

import Head from 'next/head';
import { Inter } from 'next/font/google';
import styles from '@/styles/Home.module.css';
import { useState } from 'react';
import { ethers, ContractTransaction } from 'ethers';
import ShieldArtifact from '@/artifacts/contracts/Shield.sol/Shield.json';

const inter = Inter({ subsets: ['latin'] });
const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as string;
const abi = ShieldArtifact.abi;

export default function Home() {
    const [amount] = useState('0.01');
    const [connectStatus, setConnectStatus] = useState('connect');

    const connect = async () => {
        if (typeof window.ethereum !== 'undefined') {
            try {
                await window.ethereum.request({
                    method: 'eth_requestAccounts',
                });
            } catch (error) {
                console.log(error);
            }
            await switchToMumbai();
            setConnectStatus('connected');
        } else {
            setConnectStatus('Please install MetaMask');
        }
    };

    const mint = async () => {
        console.log(`Mint...`);
        if (typeof window.ethereum !== 'undefined') {
            // @ts-expect-error: ethereum as ethers.providers.ExternalProvider
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const contract = new ethers.Contract(
                contractAddress,
                abi,
                signer,
            );

            try {
                const transactionResponse = await contract.mint({
                    value: ethers.utils.parseEther(amount),
                });
                await waitForTransaction(transactionResponse, provider);
                console.log('Mint succeed!');
            } catch (error) {
                console.log(error);
            }
        } else {
            setConnectStatus('Please install MetaMask');
        }
    };

    const withdraw = async () => {
        console.log(`Withdraw...`);
        if (typeof window.ethereum !== 'undefined') {
            // @ts-expect-error: ethereum as ethers.providers.ExternalProvider
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const contract = new ethers.Contract(
                contractAddress,
                abi,
                signer,
            );
            try {
                const transactionResponse = await contract.withdraw();
                await waitForTransaction(transactionResponse, provider);
                console.log('withdraw succeed!');
            } catch (error) {
                console.log(error);
            }
        } else {
            setConnectStatus('Please install MetaMask');
        }
    };

    const switchToMumbai = async () => {
        const chainId = '0x13881'; // Mumbai

        const currentChainId = await window.ethereum.request({
            method: 'eth_chainId',
        });
        if (currentChainId !== chainId) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [
                        {
                            chainId: chainId,
                        },
                    ],
                });
                /* eslint-disable @typescript-eslint/no-explicit-any */
            } catch (err: any) {
                // This error code indicates that the chain has not been added to MetaMask
                if (err.code === 4902) {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [
                            {
                                chainName: 'Mumbai',
                                chainId: chainId,
                                nativeCurrency: {
                                    name: 'MATIC',
                                    decimals: 18,
                                    symbol: 'MATIC',
                                },
                                rpcUrls: [
                                    'https://endpoints.omniatech.io/v1/matic/mumbai/public',
                                ],
                            },
                        ],
                    });
                }
            }
        }
    };

    const waitForTransaction = async (
        transactionResponse: ContractTransaction,
        provider: ethers.providers.Web3Provider,
    ) => {
        console.log(`Mining ${transactionResponse.hash}`);
        return new Promise<void>((resolve, reject) => {
            try {
                provider.once(transactionResponse.hash, (transactionReceipt) => {
                    console.log(
                        `Completed with ${transactionReceipt.confirmations} confirmations. `,
                    );
                    resolve();
                });
            } catch (error) {
                reject(error);
            }
        });
    };

    return (
        <>
        <Head>
        <title>mint demo < /title>
            < meta name = "description" content = "Generated by create next app" />
                <meta name="viewport" content = "width=device-width, initial-scale=1" />
                    <link rel="icon" href = "/favicon.ico" />
                        </Head>
                        < main className = { inter.className } >
                            <div className={ styles.container }>
                                <div>
                                <label htmlFor="value" > value: </label>
                                    < input id = "value" value = { amount } readOnly />
                                        </div>
                                        < div >
                                        <button id="connectButton" onClick = { connect } >
                                            { connectStatus }
                                            < /button>
                                            < button id = "mintButton" onClick = { mint } >
                                                mint
                                                < /button>
                                                < button id = "withdrawButton" onClick = { withdraw } >
                                                    withdraw
                                                    < /button>
                                                    < /div>
                                                    < /div>
                                                    < /main>
                                                    < />
  );
}
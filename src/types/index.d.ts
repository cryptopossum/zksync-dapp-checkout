import { BigNumber, BigNumberish, ContractTransaction, ethers } from "ethers";
import { ZkSyncTransaction } from "zksync-checkout/src/types";
import { ChangePubKeyCREATE2, ChangePubKeyECDSA, ChangePubKeyOnchain } from "zksync/build/types";

export declare type Address = string;
export declare type PubKeyHash = string;
export declare type TokenSymbol = string;
export declare type TokenAddress = string;
export declare type TokenLike = TokenSymbol | TokenAddress;
export declare type GweiBalance = string;
export declare type DecimalBalance = string;
export declare type Nonce = number | "committed";

export type TransactionData = {
  transactions: Array<ZkSyncTransaction>;
  fromAddress: Address;
  feeToken: TokenSymbol;
};
export type TransactionFee = {
  name: string;
  key: string;
  amount: BigNumber;
  token: TokenSymbol;
  to?: Address;
};
export type TotalByToken = {
  [token: string]: BigNumber;
};
export interface Signature {
  pubKey: string;
  signature: string;
}
export interface ForcedExit {
  type: "ForcedExit";
  initiatorAccountId: number;
  target: Address;
  token: number;
  fee: BigNumberish;
  nonce: number;
  signature: Signature;
}

export interface CPKLocal {
  accountId: number;
  account: Address;
  newPkHash: PubKeyHash;
  nonce: number;
  ethAuthData?: ChangePubKeyOnchain | ChangePubKeyECDSA | ChangePubKeyCREATE2;
  ethSignature?: string;
  validFrom: number;
  validUntil: number;
}
interface SinglDepositsInterface {
  hash: string;
  amount: string;
  status: string;
  confirmations: number;
}

export interface DepositsInterface {
  [tokenSymbol: string]: Array<SinglDepositsInterface>;
}
export interface ActiveDepositInterface {
  [tokenSymbol: string]: BigNumber;
}

export interface Transfer {
  type: "Transfer";
  accountId: number;
  from: Address;
  to: Address;
  token: number;
  amount: BigNumberish;
  fee: BigNumberish;
  nonce: number;
  signature: Signature;
  tx?: any;
}

export interface Balance {
  symbol: TokenSymbol;
  status: "Pending" | "Verified";
  balance: DecimalBalance;
  rawBalance: BigNumber;
  verifiedBalance: DecimalBalance;
  tokenPrice: string;
  restricted: boolean;
  unlocked?: BigNumber;
  address?: string;
}

export interface Token {
  address: Address;
  balance: string | BigNumber;
  symbol: TokenSymbol;
  id: number;
  formattedBalance?: string;
}

/*
{ id: any; address: any; balance: BigNumber; formattedBalance: string; symbol: any; }
*/
export interface zksync {
  closestPackableTransactionAmount(num: DecimalBalance): GweiBalance;
}

export interface Contact {
  address: Address;
  name: string;
  deleted?: boolean;
  notInContacts?: boolean;
}

export interface FeesObj {
  normal?: GweiBalance;
  fast?: GweiBalance;
}

export interface SignedTransaction {
  tx: Transfer | Withdraw | ChangePubKey | CloseAccount | ForcedExit;
  ethereumSignature?: TxEthSignature;
}

export interface Tx {
  hash: string;
  pq_id?: any;
  eth_block: number;
  tx: {
    fast: boolean;
    amount: string;
    fee: string;
    from: string;
    nonce: number;
    priority_op?: {
      amount: string;
      from: string;
      to: string;
      token: string;
    };
    signature: {
      pubKey: string;
      signature: string;
    };
    to?: string;
    token?: string;
    feeToken?: string;
    type: "Transfer" | "Withdraw" | "Deposit" | "ChangePubKey";
    feePayment?: boolean;
  };
  success: boolean;
  fail_reason?: any;
  commited: boolean;
  verified: boolean;
  confirmCount: number;
  created_at: Date;
}

export declare class Signer {
  readonly privateKey: Uint8Array;
  private constructor();
  pubKeyHash(): PubKeyHash;
  signSyncTransfer(transfer: { accountId: number; from: Address; to: Address; tokenId: number; amount: BigNumberish; fee: BigNumberish; nonce: number }): Transfer;
  signSyncWithdraw(withdraw: { accountId: number; from: Address; ethAddress: string; tokenId: number; amount: BigNumberish; fee: BigNumberish; nonce: number }): Withdraw;
  signSyncForcedExit(forcedExit: { initiatorAccountId: number; target: Address; tokenId: number; fee: BigNumberish; nonce: number }): ForcedExit;
  signSyncChangePubKey(changePubKey: { accountId: number; account: Address; newPkHash: PubKeyHash; feeTokenId: number; fee: BigNumberish; nonce: number }): ChangePubKey;
  static fromPrivateKey(pk: Uint8Array): Signer;
  static fromSeed(seed: Uint8Array): Signer;
  static fromETHSignature(ethSigner: ethers.Signer): Promise<{
    signer: Signer;
    ethSignatureType: EthSignerType;
  }>;
}

export declare class ETHOperation {
  ethTx: ContractTransaction;
  zkSyncProvider: Provider;
  state: "Sent" | "Mined" | "Committed" | "Verified" | "Failed";
  error?: ZKSyncTxError;
  priorityOpId?: BigNumber;
  constructor(ethTx: ContractTransaction, zkSyncProvider: Provider);
  awaitEthereumTxCommit(): Promise<ethers.ContractReceipt>;
  awaitReceipt(): Promise<PriorityOperationReceipt>;
  awaitVerifyReceipt(): Promise<PriorityOperationReceipt>;
  private setErrorState;
  private throwErrorIfFailedState;
}

export declare class Transaction {
  txData: any;
  txHash: string;
  sidechainProvider: Provider;
  state: "Sent" | "Committed" | "Verified" | "Failed";
  error?: ZKSyncTxError;
  constructor(txData: any, txHash: string, sidechainProvider: Provider);
  awaitReceipt(): Promise<TransactionReceipt>;
  awaitVerifyReceipt(): Promise<TransactionReceipt>;
  private setErrorState;
  private throwErrorIfFailedState;
}

declare class ZKSyncTxError extends Error {
  value: PriorityOperationReceipt | TransactionReceipt;
  constructor(message: string, value: PriorityOperationReceipt | TransactionReceipt);
}

export interface AccountState {
  address: Address;
  id?: number;
  depositing: {
    balances: {
      [token: string]: {
        amount: BigNumberish;
        expectedAcceptBlock: number;
      };
    };
  };
  committed: {
    balances: {
      [token: string]: BigNumberish;
    };
    nonce: number;
    pubKeyHash: PubKeyHash;
  };
  verified: {
    balances: {
      [token: string]: BigNumberish;
    };
    nonce: number;
    pubKeyHash: PubKeyHash;
  };
}

export declare type EthSignerType = {
  verificationMethod: "ECDSA" | "ERC-1271";
  isSignedMsgPrefixed: boolean;
};

export interface TxEthSignature {
  type: "EthereumSignature" | "EIP1271Signature";
  signature: string;
}

export interface Withdraw {
  type: "Withdraw";
  accountId: number;
  from: Address;
  to: Address;
  token: number;
  amount: BigNumberish;
  fee: BigNumberish;
  nonce: number;
  signature: Signature;
}

export interface ChangePubKey {
  type: "ChangePubKey";
  accountId: number;
  account: Address;
  newPkHash: PubKeyHash;
  feeToken: number;
  fee: BigNumberish;
  nonce: number;
  signature: Signature;
  ethSignature: string;
}

export interface CloseAccount {
  type: "Close";
  account: Address;
  nonce: number;
  signature: Signature;
}

export interface BlockInfo {
  blockNumber: number;
  committed: boolean;
  verified: boolean;
}

export interface TransactionReceipt {
  executed: boolean;
  success?: boolean;
  failReason?: string;
  block?: BlockInfo;
}

export interface PriorityOperationReceipt {
  executed: boolean;
  block?: BlockInfo;
}

export interface ContractAddress {
  mainContract: string;
  govContract: string;
}

export interface Tokens {
  [tokenSymbol: string]: TokenItem;
}
export interface TokenItem {
  address: string;
  id: number;
  symbol: string;
  decimals: number;
  unlocked: BigNumber;
}

export interface TokenPrices {
  [token: string]: {
    lastUpdated: number;
    price: string;
  };
}

export interface ChangePubKeyFee {
  ChangePubKey: {
    onchainPubkeyAuth: boolean;
  };
}

export interface Fee {
  feeType: "Withdraw" | "Transfer" | "TransferToNew" | "FastWithdraw" | ChangePubKeyFee;
  gasTxAmount: BigNumber;
  gasPriceWei: BigNumber;
  gasFee: BigNumber;
  zkpFee: BigNumber;
  totalFee: BigNumber;
}

export interface BatchFee {
  totalFee: BigNumber;
}

export declare function getDefaultProvider(network: "localhost" | "rinkeby" | "ropsten" | "mainnet", transport?: "WS" | "HTTP"): Promise<Provider>;

export declare class Provider {
  transport: AbstractJSONRPCTransport;
  contractAddress: ContractAddress;
  tokenSet: TokenSet;
  pollIntervalMilliSecs: number;
  private constructor();
  static newWebsocketProvider(address: string): Promise<Provider>;
  static newHttpProvider(address?: string, pollIntervalMilliSecs?: number): Promise<Provider>;
  submitTx(tx: any, signature?: TxEthSignature, fastProcessing?: boolean): Promise<string>;
  submitTxsBatch(
    transactions: {
      tx: any;
      signature?: TxEthSignature;
    }[],
  ): Promise<string[]>;

  getContractAddress(): Promise<ContractAddress>;
  getTokens(): Promise<Tokens>;
  getState(address: Address): Promise<AccountState>;
  getTxReceipt(txHash: string): Promise<TransactionReceipt>;
  getPriorityOpStatus(serialId: number): Promise<PriorityOperationReceipt>;
  getConfirmationsForEthOpAmount(): Promise<number>;
  getEthTxForWithdrawal(withdrawal_hash: any): Promise<string>;
  notifyPriorityOp(serialId: number, action: "COMMIT" | "VERIFY"): Promise<PriorityOperationReceipt>;
  notifyTransaction(hash: string, action: "COMMIT" | "VERIFY"): Promise<TransactionReceipt>;
  getTransactionFee(txType: "Withdraw" | "Transfer" | "FastWithdraw" | ChangePubKeyFee, address: Address, tokenLike: TokenLike): Promise<Fee>;
  getTransactionsBatchFee(txTypes: ("Withdraw" | "Transfer" | "FastWithdraw")[], addresses: Address[], tokenLike: TokenLike): Promise<BigNumber>;
  getTokenPrice(tokenLike: TokenLike): Promise<number>;
  disconnect(): Promise<any>;
}

export declare class ETHProxy {
  private ethersProvider;
  contractAddress: ContractAddress;
  private governanceContract;
  private mainContract;
  constructor(ethersProvider: ethers.providers.Provider, contractAddress: ContractAddress);
  resolveTokenId(token: TokenAddress): Promise<number>;
}

export declare class TokenSet {
  private tokensBySymbol;
  constructor(tokensBySymbol: Tokens);
  private resolveTokenObject;
  isTokenTransferAmountPackable(tokenLike: TokenLike, amount: string): boolean;
  isTokenTransactionFeePackable(tokenLike: TokenLike, amount: string): boolean;
  formatToken(tokenLike: TokenLike, amount: BigNumberish): string;
  parseToken(tokenLike: TokenLike, amount: string): BigNumber;
  resolveTokenDecimals(tokenLike: TokenLike): number;
  resolveTokenId(tokenLike: TokenLike): number;
  resolveTokenAddress(tokenLike: TokenLike): TokenAddress;
  resolveTokenSymbol(tokenLike: TokenLike): TokenSymbol;
}

export declare abstract class AbstractJSONRPCTransport {
  abstract request(method: string, params: any): Promise<any>;
  subscriptionsSupported(): boolean;
  subscribe(subMethod: string, subParams: any, unsubMethod: string, cb: (data: any) => void): Promise<Subscription>;
  abstract disconnect(): any;
  abstract ws: {
    isOpened: boolean;
    open(): Promise<any>;
  };
}

declare class Subscription {
  unsubscribe: () => Promise<void>;
  constructor(unsubscribe: () => Promise<void>);
}

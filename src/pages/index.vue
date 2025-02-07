<template>
  <div class="indexPage">
    <zk-modal v-if="modal === 'feeChanged'"
      :value="modal === 'feeChanged'"
      @close="
        modal = false;
        cancelTransfer();
      "
    >
      <template slot="header">
        <div class="withIcon text-warning text-yellow">
          <i class="fad fa-info-square"/>
          <div>Fee changed</div>
        </div>
      </template>
      <template slot="default">
        <div class="text-sm">The price for zkSync transactions fluctuates a little bit to make sure that zkSync runs as close as possible to break-even costs.</div>
        <div class="text-sm text-red" v-if="!transferAllowed">You have to deposit a little bit more to cover new transaction fee.</div>
        <div class="mt-3" v-for="(item, index) in transactionFees" :key="index">
          <div class="text-lg">{{ item.type === "batch" ? "Batch transaction fee" : "One-time account activation fee"}}</div>
          <zk-values-block>
            <template slot="left-top">
              <div class="headline">Previous fee</div>
            </template>
            <template slot="right-top">
              <div class="flex flex-col items-end whitespace-nowrap">
                <div class="value">
                  {{ item.previous | formatUsdAmount(tokensPrices[transactionData.feeToken] && tokensPrices[transactionData.feeToken].price, transactionData.feeToken) }}
                </div>
                <div class="secondaryValue">{{ item.previous | formatToken(transactionData.feeToken) }} {{ transactionData.feeToken }}</div>
              </div>
            </template>
          </zk-values-block>
          <zk-values-block class="mt-1">
            <template slot="left-top">
              <div class="headline">New fee</div>
            </template>
            <template slot="right-top">
              <div class="flex flex-col items-end whitespace-nowrap">
                <div class="value">
                  {{ item.new | formatUsdAmount(tokensPrices[transactionData.feeToken] && tokensPrices[transactionData.feeToken].price, transactionData.feeToken) }}
                </div>
                <div class="secondaryValue">{{ item.new | formatToken(transactionData.feeToken) }} {{ transactionData.feeToken }}</div>
              </div>
            </template>
          </zk-values-block>
        </div>
      </template>
      <template slot="footer">
        <div class="flex items-center justify-center flex-wrap gap-2">
          <zk-defbtn
            outline
            @click="
              modal = false;
              cancelTransfer();
            "
          >
            <i class="far fa-arrow-left"/>
            <span>Cancel payment</span>
          </zk-defbtn>
          <zk-defbtn
            v-if="transferAllowed"
            @click="
              modal = false;
              transfer();
            "
          >
            <i class="fas fa-paper-plane"/>
            <span>Complete payment</span>
          </zk-defbtn>
        </div>
      </template>
    </zk-modal>

    <zk-modal v-if="errorModal !== false" :value="errorModal !== false" @close="errorModal = false">
      <template slot="header">
        <div class="withIcon text-red">
          <i class="fad fa-info-square"/>
          <div>{{ errorModal.headline }}</div>
        </div>
      </template>
      <template slot="default">
        <div class="text-sm">
          {{ errorModal.text }}
        </div>
      </template>
    </zk-modal>

    <connected-wallet/>

    <div v-if="step === 'main'" class="w-full">
      <zk-max-height :value="!tokenItemsValid[transactionData.feeToken]" class="mt-5 md:mt-7">
        <div>
          <zk-note class="notificationNote">
            <template slot="icon">
              <i class="text-gray text-xl fal fa-info-square" />
            </template>
            <template slot="default">
              <div class="text-sm text-gray font-light">
                The default recommended <span class="font-normal">{{transactionData.feeToken}}</span> amount to deposit is <span class="font-normal">25% higher</span> than the minimal required one for paying fees to take into account the risk of fluctuating transaction fees.
              </div>
            </template>
          </zk-note>
        </div>
      </zk-max-height>

      <line-table-header class="mt-5 mb-2">
        <template slot="first"> To pay</template>
        <template slot="second"> L2 balance</template>
        <template slot="first:md"> To pay / L2 balance</template>
        <template slot="right"/>
      </line-table-header>
      <transaction-token v-for="(total, token) in totalByToken" :key="token" v-model="tokenItemsValid[token]" :token="token" :total="total.toString()"/>
      <div class="mainBtnsContainer">
        <div class="mainBtns">
          <zk-defbtn v-if="displayActivateAccountBtn" :disabled="!transferAllowed || !canCPK || cpkLoading" :loader="cpkLoading" @click="signActivation()">
            <i class="fas fa-unlock"></i>
            <span>{{ cpkBtnText }}</span>
          </zk-defbtn>
          <zk-defbtn v-else :disabled="!transferAllowed" @click="preTransfer()">
            <i class="fas fa-paper-plane"/>
            <span>Complete payment</span>
          </zk-defbtn>
        </div>
        <div v-if="displayActivateAccountBtn && (!canCPK || !transferAllowed) && !cpkLoading" class="text-gray text-center text-sm pt-2">Complete all deposit operations to continue</div>
      </div>
    </div>
    <div v-else-if="step === 'transfer'" class="w-full">
      <div class="font-firaCondensed font-medium text-3xl text-dark -dark text-center pt-5 md:pt-10">Payment</div>
      <div v-if="subStep === 'processing'" class="text-lg text-center pt-2">Processing...</div>
      <div v-else-if="subStep === 'waitingUserConfirmation'" class="text-lg text-center pt-2">Follow the instructions in your wallet</div>
      <div v-else-if="subStep === 'committing'" class="text-lg text-center pt-2">Waiting for the transaction to be mined...</div>
      <zk-loader class="mx-auto mt-6" size="md" color="violet"/>
    </div>
    <div v-else-if="step === 'success'" class="successPage w-full">
      <div class="font-firaCondensed font-medium text-3xl text-green text-center pt-5 md:pt-10">Done. Thank you!</div>
      <zk-success-check-mark big class="w-11/12 max-w-xxs mx-auto py-5"/>
      <div class="text-md text-center font-light pt-2">Wasn't that easy? Learn more about <a class="linkDefault" href="https://zksync.io/" target="_blank">zkSync</a></div>
      <div class="mainBtnsContainer">
        <div class="mainBtns">
          <zk-defbtn @click="close()">
            <i class="far fa-times"/>
            <span>Close</span>
          </zk-defbtn>
        </div>
      </div>
      <line-table-header class="mt-10 md:mt-7 mb-2">
        <template slot="first"> Paid</template>
        <template slot="second"/>
        <template slot="first:md"> &nbsp;</template>
        <template slot="right"> Paid / TX Hash</template>
      </line-table-header>

      <vue-custom-scrollbar class="customScrollList">
        <template v-for="(item, index) in finalTransactions">
          <zk-line-block :key="index">
            <template slot="first">
              <div class="tokenItem">
                <div class="tokenName">
                  {{ getTokenByID(typeof item.txData.tx.token === "number" ? item.txData.tx.token : item.txData.tx.feeToken) }}
                </div>
              </div>
            </template>
            <template slot="second">
              <div class="amount">
                {{
                  item.txData.tx.fee === "0"
                    ? item.txData.tx.amount
                    : item.txData.tx.fee | formatToken(getTokenByID(typeof item.txData.tx.token === "number" ? item.txData.tx.token : item.txData.tx.feeToken))
                }}
              </div>
            </template>
            <template slot="third">
              <a class="transactionLink linkDefault" :href="getTxLink(item.txHash)" target="_blank">
                <!--<span v-if="item.txData.tx.fee!=='0'" class="text-gray text-xs col-span-2">Fee transaction</span>-->
                <div class="font-light txHash text-xxs md:text-right">
                  {{ item.txHash | formatTransaction }}
                </div>
                <i class="text-xs text-violet -dark pl-1 fal fa-external-link"/>
              </a>
            </template>
          </zk-line-block>
        </template>
      </vue-custom-scrollbar>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";

import { TransactionData, TotalByToken, TransactionFee, Transaction, TokenPrices, CPKLocal, GweiBalance } from "@/types/index";
import { APP_ZKSYNC_BLOCK_EXPLORER, ETHER_NETWORK_NAME } from "@/plugins/build";
import { walletData } from "@/plugins/walletData";
import zkUtils from "@/plugins/utils";
import { utils } from "zksync";
import { getCPKTx, saveCPKTx } from "@/plugins/walletActions/cpk";
import {transactionBatch} from "@/plugins/walletActions/transaction";

import connectedWallet from "@/blocks/connectedWallet.vue";
import lineTableHeader from "@/blocks/lineTableHeader.vue";
import {ZkSyncTransaction} from "zksync-checkout-internal/src/types";
import {ZkSyncCheckoutManager} from "zksync-checkout-internal";

interface UpdatedFee {
  type: "batch" | "cpk";
  previous: GweiBalance;
  new: GweiBalance;
}

export default Vue.extend({
  components: {
    connectedWallet,
    lineTableHeader,
  },
  filters: {
    formatTransaction(value: string) {
      return value.replace("sync-tx:", "");
    },
  },
  data() {
    return {
      modal: false as false | "feeChanged",
      step: "main" as "main" | "transfer" | "success",
      subStep: "" as "processing" | "waitingUserConfirmation" | "committing",
      cpkMessageSigned: false,
      updateTransferAllowed: 0,
      cpkState: "main" as "main" | "processing" | "waitingUserConfirmation",
      tokenItemsValid: {} as {
        [token: string]: boolean;
      },
      finalTransactions: [] as Array<Transaction>,
      errorModal: false as false | {
        headline: string;
        text: string;
      },
      transactionFees: [] as UpdatedFee[],
    };
  },
  watch: {
    step(val) {
      this.$store.commit('setStep', val);
    }
  },
  computed: {
    currentNetworkName(): string {
      return ETHER_NETWORK_NAME;
    },
    isAccountLocked(): TransactionData {
      return this.$store.getters["wallet/isAccountLocked"];
    },
    transactionData(): TransactionData {
      return this.$store.getters["checkout/getTransactionData"];
    },
    totalByToken(): TotalByToken {
      this.updateTransferAllowed;
      return this.$store.getters["checkout/getTotalByToken"];
    },
    transferAllowed(): boolean {
      this.updateTransferAllowed;
      for (const [, state] of Object.entries(this.tokenItemsValid)) {
        if (!state) {
          return false;
        }
      }
      return true;
    },
    tokensPrices(): TokenPrices {
      return this.$store.getters["tokens/getTokenPrices"];
    },
    displayActivateAccountBtn(): boolean {
      if (this.isAccountLocked) {
        this.checkCPKMessageSigned();
        return !this.cpkMessageSigned;
      }
      return false;
    },
    canCPK(): boolean {
      return typeof this.$store.getters["account/accountID"] === "number";
    },
    cpkLoading(): boolean {
      return this.cpkState === "processing" || this.cpkState === "waitingUserConfirmation";
    },
    cpkBtnText(): string {
      switch (this.cpkState) {
        case "processing":
          return "Processing...";
        case "waitingUserConfirmation":
          return "Follow the instructions in your wallet";

        default:
          return "Activate account";
      }
    },
  },
  methods: {
    getTokenByID(id: number) {
      return this.$store.getters["tokens/getTokenByID"](id)?.symbol;
    },
    getTxLink(hash: string) {
      return `${APP_ZKSYNC_BLOCK_EXPLORER}/transactions/${hash}`;
    },
    async checkFees() {
      this.transactionFees = [];
      const transactionFeesPrevious = this.$store.getters["checkout/getTransactionBatchFee"].amount;
      await this.$store.dispatch("checkout/getTransactionBatchFee");
      const transactionFeesNew = this.$store.getters["checkout/getTransactionBatchFee"].realAmount;
      if (transactionFeesPrevious.lt(transactionFeesNew)) {
        this.transactionFees.push({
          type: "batch",
          previous: transactionFeesPrevious.toString(),
          new: this.$store.getters["checkout/getTransactionBatchFee"].amount.toString(),
        });
      }
      if(this.isAccountLocked) {
        const accountUnlockFeePrevious = this.$store.getters["checkout/getAccountUnlockFee"];
        await this.$store.dispatch("checkout/getAccountUnlockFee");
        const accountUnlockFeeNew = this.$store.getters["checkout/getAccountUnlockFee"];
        if (accountUnlockFeePrevious.lt(accountUnlockFeeNew)) {
          this.transactionFees.push({
            type: "cpk",
            previous: accountUnlockFeePrevious.toString(),
            new: accountUnlockFeeNew.toString(),
          });
        }
      }
    },
    async preTransfer() {
      this.step = "transfer";
      this.subStep = "processing";
      try {
        await this.checkFees();
        if(this.transactionFees.length > 0) {
          this.modal = "feeChanged";
          return;
        }
        this.transfer();
      } catch (error) {
        this.step = "main";
        this.modal = false;
        if (error.message) {
          this.errorModal = {
            headline: "Pretransfer error",
            text: error.message,
          };
        } else {
          this.errorModal = {
            headline: "Pretransfer error",
            text: "Unknown error. Try again later.",
          };
        }
      }
    },
    cancelTransfer() {
      this.step = "main";
    },
    async transfer() {
      if (!this.transferAllowed) {
        return;
      }
      const transactionData = this.transactionData;
      this.step = "transfer";
      try {
        const nonce = await walletData.get().syncWallet!.getNonce("committed");
        this.subStep = "waitingUserConfirmation";
        const transactionsList = [] as Array<ZkSyncTransaction>;
        transactionsList.push(...transactionData.transactions);
        const transactionFees = this.$store.getters["checkout/getTransactionBatchFee"];
        const transactions = await transactionBatch(
          transactionsList,
          transactionData.feeToken,
          transactionFees.realAmount,
          nonce,
          this.$store.getters["wallet/isAccountLocked"],
          this.$store
        );
        console.log("Batch transaction", transactionsList);

        const manager = ZkSyncCheckoutManager.getManager();

        let endHashes = [];
          const validHashes = transactions.filter((tx: any) => {
          if (tx.txData.tx.type !== "Transfer") {
            return false;
          }
          for (const singleTx of transactionsList) {
            if (
              typeof tx.txData.tx.to === "string" &&
              typeof singleTx.to === "string" &&
              tx.txData.tx.to.toLowerCase() === singleTx.to.toLowerCase() &&
              tx.txData.tx.amount === singleTx.amount
            ) {
              return true;
            }
          }
          return false;
        });
        endHashes = validHashes.map((tx: any) => tx.txHash);
        console.log("Sent hashes", endHashes);
        manager.notifyHashes(endHashes);


        // @ts-ignore
        this.finalTransactions.push(...transactions);
        this.subStep = "committing";

        await transactions[0].awaitReceipt();
        this.step = "success";
      } catch (error) {
        this.updateTransferAllowed++;
        this.checkCPKMessageSigned();
        this.step = "main";
        let errorMsg = zkUtils.filterError(error);
        if (typeof errorMsg === "string") {
          if(errorMsg.includes("Account does not exist in the zkSync network")) {
            errorMsg = "Please, make deposit or request tokens in order to activate the account.";
          } else if(errorMsg.includes("batch summary fee is too low")) {
            await this.checkFees();
            this.updateTransferAllowed++;
            if(this.transactionFees.length > 0) {
              this.modal = "feeChanged";
              return;
            }
          }
          this.errorModal = {
            headline: "Activation error",
            text: errorMsg,
          };
        }
      }
    },
    async signActivation() {
      this.cpkState = "processing";
      try {
        const syncWallet = walletData.get().syncWallet!;
        const nonce = await syncWallet.getNonce("committed");
        if (syncWallet.ethSignerType?.verificationMethod === "ERC-1271") {
          const isOnchainAuthSigningKeySet = await syncWallet.isOnchainAuthSigningKeySet();
          if (!isOnchainAuthSigningKeySet) {
            const onchainAuthTransaction = await syncWallet.onchainAuthSigningKey();
            await onchainAuthTransaction?.wait();
          }
        }

        const newPubKeyHash = await syncWallet.signer!.pubKeyHash();
        const accountID = await syncWallet.getAccountId();
        if (typeof accountID !== "number") {
          throw new TypeError("It is required to have a history of balances on the account to activate it.");
        }
        const changePubKeyMessage = utils.getChangePubkeyLegacyMessage(newPubKeyHash, nonce, accountID!);
        this.cpkState = "waitingUserConfirmation";
        const ethSignature = (await syncWallet.getEthMessageSignature(changePubKeyMessage)).signature;
        const changePubkeyTx: CPKLocal = {
          accountId: accountID!,
          account: syncWallet.address(),
          newPkHash: newPubKeyHash,
          nonce,
          ethSignature,
          validFrom: 0,
          validUntil: utils.MAX_TIMESTAMP,
        };
        saveCPKTx(this.$store.getters["account/address"], changePubkeyTx);
        this.cpkState = "processing";
        await new Promise((resolve) => {
          // Just for the UX reasons
          setTimeout(() => {
            resolve(undefined);
          }, 500);
        });
        this.cpkState = "main";
      } catch (error) {
        this.cpkState = "main";
        const errorMsg = zkUtils.filterError(error);
        if (typeof errorMsg === "string") {
          this.errorModal = {
            headline: "Activation error",
            text: errorMsg,
          };
        }
      }
      this.checkCPKMessageSigned();
    },
    checkCPKMessageSigned(): boolean {
      try {
        getCPKTx(this.$store.getters["account/address"]);
        this.cpkMessageSigned = true;
      } catch (error) {
        this.cpkMessageSigned = false;
      }
      return this.cpkMessageSigned;
    },
    close() {
      window.close();
    },
  },
});
</script>

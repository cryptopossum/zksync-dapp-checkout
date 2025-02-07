<template>
  <div class="w-full transactionTokenContainer" :class="{'rowLayout': isInProgress || enoughZkBalance || !enoughWithInitialBalance}">

    <!-- Modals -->
    <zk-modal :value="modal === 'insufficientL1Deposit' || modal === 'insufficientL1Min'" @close="modal = ''">
      <template slot="header">
        <div class="withIcon text-red">
          <i class="fad fa-info-square"></i>
          <div>Insufficient funds in the on-chain wallet to deposit</div>
        </div>
      </template>
      <template slot="default">
        <div v-if="modal === 'insufficientL1Deposit'" class="text-sm">
          On-chain wallet has insufficient funds to deposit
          <strong>{{ depositBigNumber | formatToken(token) }} {{ token }}</strong>
          to zkSync L2 account. Your on-chain balance is
          <strong
            class="cursor-pointer"
            @click="
              setDepositMaxAmount();
              modal = '';
            "
            >{{ initialBalance.rawBalance | formatToken(token) }} {{ token }}</strong
          >.
        </div>
        <div v-else-if="modal === 'insufficientL1Min'" class="text-sm">
          <b>{{ depositBigNumber | formatTokenPretty(token) }} {{ token }}</b> will not be enough to commit the transaction. The minimal amount is:
        </div>
        <zk-values-block
          class="mt-3 cursor-pointer"
          @click="
            setDepositMinAmount();
            modal = '';
          "
        >
          <template slot="left-top">
            <div class="headline">Minimal amount to deposit</div>
          </template>
          <template slot="right-top">
            <div class="flex flex-col items-end whitespace-nowrap">
              <div class="value">{{ needToDeposit | formatToken(token) }} {{ token }}</div>
              <div class="secondaryValue">{{ needToDeposit | formatUsdAmount(tokensPrices[token] && tokensPrices[token].price, token) }}</div>
            </div>
          </template>
        </zk-values-block>
        <zk-values-block
          class="mt-3 cursor-pointer"
          @click="
            setDepositRecommendedAmount();
            modal = '';
          "
        >
          <template slot="left-top">
            <div class="headline">Recommended deposit amount</div>
          </template>
          <template slot="right-top">
            <div class="flex flex-col items-end whitespace-nowrap">
              <div class="value">{{ recommendedDeposit | formatToken(token) }} {{ token }}</div>
              <div class="secondaryValue">{{ recommendedDeposit | formatUsdAmount(tokensPrices[token] && tokensPrices[token].price, token) }}</div>
            </div>
          </template>
        </zk-values-block>
      </template>
    </zk-modal>

    <zk-modal :value="modal === 'customError'" @close="modal = ''">
      <template slot="header">
        <div class="withIcon text-red">
          <i class="fad fa-info-square" />
          <div>{{ errorModal.headline }}</div>
        </div>
      </template>
      <template slot="default">
        <div class="text-sm">{{ errorModal.text }}</div>
      </template>
    </zk-modal>

    <!-- Main -->
    <zk-line-block>
      <template slot="first">
        <div class="tokenItem">
          <div class="tokenName">{{ token }}</div>
        </div>
      </template>
      <template slot="second">
        <div class="amount">{{ total | formatTokenPretty(token) }}</div>
      </template>
      <template slot="third">
        <div class="amount">
          <span :class="amountClass">{{ zkBalance.rawBalance | formatTokenPretty(token) }}</span>
        </div>
      </template>
      <template v-if="isInProgress" slot="right">
        <div class="flex items-center">
          <div class="text-gray text-xs font-medium" :class="{ 'mr-2': isLoading }">{{ lineStateText }}</div>
          <zk-loader v-if="isLoading" color="gray" size="sm" />
        </div>
      </template>
      <template v-else>
        <template v-if="enoughZkBalance" slot="right">
          <div class="flex justify-between items-center text-xs font-medium mr-2 text-green">Ready <zk-success-check-mark class="w-8 h-8" /></div>
        </template>
        <template v-else slot="right">
          <div v-if="!enoughWithInitialBalance" class="text-red text-xs">
            Insufficient <strong>{{ token }} {{ currentNetworkName }}</strong> balance
          </div>
          <zk-defbtn v-else-if="!enoughWithInitialBalance && !unlocked" @click="unlock()"> <i class="fas fa-unlock-alt" /><span>Unlock</span> </zk-defbtn>
          <amount-input v-else ref="amountInput" v-model="depositAmount" :token="token" type="deposit" :class="{ error: !enoughDepositAmount }">
            <template slot="underInput">
              <div class="minAmount text-xxs" @click="setDepositMinAmount()">Min: {{ needToDeposit | formatToken(token) }}</div>
            </template>
            <template slot="default">
              <zk-defbtn v-if="unlocked" :disabled="!depositBigNumber || !enoughDepositAmount" @click="deposit()">
                <i class="fal fa-arrow-to-right" />
                <span>Deposit</span>
              </zk-defbtn>
              <zk-defbtn v-else @click="unlock()">
                <i class="fas fa-unlock-alt" />
                <span>Unlock</span>
              </zk-defbtn>
            </template>
          </amount-input>
        </template>
      </template>
    </zk-line-block>
  </div>
</template>

<script lang="ts">
import { Address, Balance, GweiBalance, TokenPrices } from "@/types/index";
import { ETHER_NETWORK_NAME } from "@/plugins/build";
import { walletData } from "@/plugins/walletData";
import utils from "@/plugins/utils";
import { deposit, unlockToken } from "@/plugins/walletActions/transaction";
import { BigNumber } from "ethers";
import Vue from "vue";

export default Vue.extend({
  props: {
    token: {
      type: String,
      default: "",
      required: true,
    },
    total: {
      type: String,
      default: "",
      required: true,
    },
  },
  data() {
    return {
      modal: "",
      errorModal: {
        headline: "",
        text: "",
      },
      step: "default" as "default" | "depositing" | "unlocking",
      subStep: "" as "waitingUserConfirmation" | "depositing" | "committing" | "confirming",
      depositAmount: "",
      lineStateText: "",
    };
  },
  computed: {
    unlocked(): boolean {
      return this.enoughZkBalance || this.initialBalance.unlocked!.gte(this.needToDeposit);
    },
    isDeposit(): boolean {
      return !!this.depositBigNumber && this.enoughDepositAmount;
    },
    currentNetworkName(): string {
      return ETHER_NETWORK_NAME;
    },
    isInProgress(): boolean {
      return this.step !== "default";
    },
    isLoading(): boolean {
      return (this.isInProgress && this.subStep === "committing") || this.subStep === "confirming";
    },
    amountClass(): string {
      return this.enoughZkBalance ? "text-green" : "text-red";
    },
    tokensPrices(): TokenPrices {
      return this.$store.getters["tokens/getTokenPrices"];
    },
    zkBalance(): Balance {
      return this.$store.getters["wallet/getzkBalances"].find((e: Balance) => e.symbol === this.token);
    },
    initialBalance(): Balance {
      return this.$store.getters["wallet/getInitialBalances"].find((e: Balance) => e.symbol === this.token);
    },
    depositBigNumber(): GweiBalance {
      if (!this.depositAmount) {
        return "";
      }
      try {
        return utils.parseToken(this.token, this.depositAmount).toString();
      } catch (error) {
        return "";
      }
    },
    needToDeposit(): GweiBalance {
      try {
        const txBatchFee = this.$store.getters["checkout/getTransactionBatchFee"];
        const recommendedAmount = BigNumber.from(this.total).sub(this.zkBalance.rawBalance);
        if(txBatchFee.token === this.token) {
          const amount = BigNumber.from(this.total).sub(txBatchFee.amount).add(txBatchFee.realAmount).sub(this.zkBalance.rawBalance);
          if(amount.lte("0") && recommendedAmount.gt("0")) {
            return amount.toString();
          }
        }
        return recommendedAmount.toString();
      } catch (error) {
        return "";
      }
    },
    recommendedDeposit(): GweiBalance {
      try {
        if(this.token === this.$store.getters["checkout/getTransactionData"].feeToken) {
          const batchFee = this.$store.getters["checkout/getTransactionBatchFee"].realAmount.div(100).mul(30);
          return BigNumber.from(this.needToDeposit).add(batchFee).toString();
        }
        return this.needToDeposit;
      } catch (error) {
        return "";
      }
    },
    enoughZkBalance(): boolean {
      return (BigNumber.from(this.zkBalance.rawBalance).gte(this.total) || BigNumber.from(this.needToDeposit).lte("0"));
    },

    /**
     * Returns (L1+L2 balance >= Total to pay)
     */
    enoughWithInitialBalance(): boolean {
      return BigNumber.from(this.zkBalance.rawBalance).add(BigNumber.from(this.initialBalance.rawBalance)).gte(this.total);
    },

    /**
     * Returns (Inputted deposit amount >= L1 Balance)
     */
    enoughOnInitialToDeposit(): boolean {
      if (!this.depositAmount) {
        return true;
      }
      try {
        const depositAmountBigNumber = BigNumber.from(this.depositBigNumber);
        return !depositAmountBigNumber.gt(BigNumber.from(this.initialBalance.rawBalance));
      } catch (error) {
        return false;
      }
    },

    /**
     * Returns (Inputted deposit amount >= Total to pay - L2 balance)
     */
    enoughDepositAmount(): boolean {
      if (!this.depositAmount) {
        return true;
      }
      try {
        const depositAmountBigNumber = BigNumber.from(this.depositBigNumber);
        return depositAmountBigNumber.gte(BigNumber.from(this.needToDeposit));
      } catch (error) {
        return false;
      }
    },
  },
  watch: {
    enoughZkBalance: {
      immediate: true,
      handler(val) {
        if (val === true && this.step === "default") {
          this.$emit("input", true);
        } else {
          this.$emit("input", false);
        }
      },
    },
    async subStep(val) {
      if (val === "waitingUserConfirmation") {
        this.lineStateText = "Confirm operation";
      } else if (val === "committing") {
        this.lineStateText = "Committing transaction...";
      } else if (val === "confirming") {
        const confirmations = await walletData.get().syncProvider!.getConfirmationsForEthOpAmount();
        this.lineStateText = `Waiting for ${confirmations} confirmations.`;
      } else {
        this.lineStateText = "";
      }
    },
    step(val) {
      this.$emit("input", this.enoughZkBalance && val === "default");
    },
  },
  mounted() {
    if (!this.enoughZkBalance) {
      this.setDepositRecommendedAmount();
    }
  },
  methods: {
    setDepositMaxAmount() {
      this.depositAmount = utils.handleFormatToken(this.token, this.initialBalance.rawBalance.toString());
    },
    setDepositMinAmount() {
      this.depositAmount = utils.handleFormatToken(this.token, this.needToDeposit);
    },
    setDepositRecommendedAmount() {
      this.depositAmount = utils.handleFormatToken(this.token, this.recommendedDeposit);
    },
    async deposit() {
      if (!this.enoughOnInitialToDeposit) {
        this.modal = "insufficientL1Deposit";
      } else if (!this.enoughDepositAmount) {
        this.modal = "insufficientL1Min";
      } else if (this.$refs && this.$refs.amountInput && (this.$refs.amountInput as Vue).$data.error) {
        this.modal = "customError";
        this.errorModal = {
          headline: `Inputted ${this.token} amount error`,
          text: (this.$refs.amountInput as Vue).$data.error,
        };
      } else {
        try {
          this.subStep = "waitingUserConfirmation";
          this.step = "depositing";
          const transferTransaction = await deposit(this.token, this.depositBigNumber);
          if (!transferTransaction) {
            throw new Error("Unexpected payment error!");
          }
          this.subStep = "committing";
          await transferTransaction.awaitEthereumTxCommit();
          this.subStep = "confirming";
          await transferTransaction.awaitReceipt();
          await this.$store.dispatch("wallet/getzkBalances", { accountState: undefined, force: true });
          this.step = "default";
        } catch (error) {
          this.step = "default";
          const createErrorModal = (text: string) => {
            this.errorModal = {
              headline: "Depositing token error",
              text,
            };
          };
          createErrorModal(
            error.message && !error.message.includes("User denied")
              ? error.message.includes("Fee Amount is not packable")
                ? "Fee Amount is not packable"
                : "Transaction Amount is not packable"
              : "Unknown error. Try again later.",
          );
        }
      }
    },
    async unlock() {
      try {
        this.subStep = "waitingUserConfirmation";
        this.step = "unlocking";
        const unlockTransaction = await unlockToken(this.initialBalance.address as Address, this.$store);
        this.subStep = "committing";
        await unlockTransaction.wait();
        await this.$store.dispatch("wallet/getInitialBalances", true);
        this.step = "default";
      } catch (error) {
        this.step = "default";
        const createErrorModal = (text: string) => {
          this.errorModal = {
            headline: "Unlocking token error",
            text,
          };
        };
        if (error.message) {
          if (!error.message.includes("User denied")) {
            createErrorModal(error.message);
          }
        } else {
          createErrorModal("Unknown error. Try again later.");
        }
      }
    },
  },
});
</script>

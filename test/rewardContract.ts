import { use, assert, expect }  from "chai";
import { junokitChai, junokitTypes }  from "junokit";
import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate';

import { StakingContractContract } from "../artifacts/typescript_schema/StakingContract";
import { SejunoTokenContract } from "../artifacts/typescript_schema/SejunoToken";
import { BjunoTokenContract } from "../artifacts/typescript_schema/BjunoToken";
import { MockSelectionContract } from "../artifacts/typescript_schema/MockSelection";
import { RewardContractContract } from "../artifacts/typescript_schema/RewardContract";

import { setup } from "./setupContracts";

use(junokitChai);

describe("rewards contract flow", () => {
  let contract_owner: junokitTypes.UserAccount;
  let account_1: junokitTypes.UserAccount;
  let account_2: junokitTypes.UserAccount;
  let runTs: String;
  let sejuno_token: SejunoTokenContract, staking_contract: StakingContractContract;
  let bjuno_token: BjunoTokenContract, validator_info: MockSelectionContract;
  let reward_contract: RewardContractContract;
  let window_time: number, unbonding_time: number;
  before(async() => {
    const result = await setup();
    runTs = result.runTs;
    contract_owner = result.contract_owner;
    account_1 = result.account_1;
    account_2 = result.account_2;
    sejuno_token = result.sejuno_token;
    staking_contract = result.staking_contract;
    bjuno_token = result.bjuno_token;
    validator_info = result.validator_info;
    reward_contract = result.reward_contract;
    window_time = result.window_time;
    unbonding_time = result.unbonding_time;
  });

  afterEach(async() => {
    const result = await setup();
    runTs = result.runTs;
    contract_owner = result.contract_owner;
    account_1 = result.account_1;
    account_2 = result.account_2;
    sejuno_token = result.sejuno_token;
    staking_contract = result.staking_contract;
    bjuno_token = result.bjuno_token;
    validator_info = result.validator_info;
    reward_contract = result.reward_contract;
    window_time = result.window_time;
    unbonding_time = result.unbonding_time;
  });

  function sleep(seconds: number) {
    console.log("Sleeping for " + seconds + " seconds");
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }

  /*
    1) Balance updates on bJUNO balance updates
      - Deposit for bJUNO
      - Should change reward contract balances
      - Deposit for seJUNO
      - Deposit for bJUNO from account_1
      - Should NOT change reward contract balances for account_2
      - Withdraw some bJUNO
      - Should change reward contract balances
      - Withdraw all of bJUNO
      - Reward contract balance should be zero
      - Send bJUNO from one account to another
      - Convert seJUNO to bJUNO
      - Should change reward contract balances
  */
  it("Balance updates when bjuno token balance changes (mint, burn, send)", async () => {
    // Deposit for bJUNO
    const transferAmount_1 = [{ "denom": "ujuno", "amount": "1200000" }];
    await staking_contract.stakeForBjuno(
      { account: account_2, transferAmount: transferAmount_1 },
      {referral: 0}
    );
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );
    // await staking_contract.advanceWindow(
    //   { 
    //     account: contract_owner,
    //     customFees: {
    //       amount: [{ amount: "500000", denom: "ujuno" }],
    //       gas: "1000000",
    //     }
    //   }
    // );

    // Should change reward contract balances
    const holder_res = await reward_contract.holder(
      { address: account_2.account.address }
    );
    assert.equal(holder_res.balance, "1200000");

    // Deposit for seJUNO
    const transferAmount_2 = [{ "denom": "ujuno", "amount": "1400000" }];
    await staking_contract.stake(
      { account: account_2, transferAmount: transferAmount_2 },
      {referral: 0}
    );

    // Deposit for bJUNO from account_1
    const transferAmount_3 = [{ "denom": "ujuno", "amount": "1600000" }];
    await staking_contract.stakeForBjuno(
      { account: account_1, transferAmount: transferAmount_3 },
      {referral: 0}
    );

    // Should NOT change reward contract balances for account_2
    const holder_res_1 = await reward_contract.holder(
      { address: account_2.account.address }
    );
    assert.equal(holder_res_1.balance, "1200000");

    const holder_res_2 = await reward_contract.holder(
      { address: account_1.account.address }
    );
    assert.equal(holder_res_2.balance, "1600000");

    // Withdraw some bJUNO
    await bjuno_token.send(
      { 
        account: account_2,
        customFees: {
          amount: [{ amount: "500000", denom: "ujuno" }],
          gas: "1000000",
        }
      },
      {
        amount: "800000",
        contract: staking_contract.contractAddress,
        msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
      }
    );

    // Should change reward contract balances
    const holder_res_3 = await reward_contract.holder(
      { address: account_2.account.address }
    );
    assert.equal(holder_res_3.balance, "400000");

    // Withdraw all of bJUNO
    await bjuno_token.send(
      { 
        account: account_2,
        customFees: {
          amount: [{ amount: "500000", denom: "ujuno" }],
          gas: "1000000",
        }
      },
      {
        amount: "400000",
        contract: staking_contract.contractAddress,
        msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
      }
    );

    // Reward contract balance should be zero
    const holder_res_4 = await reward_contract.holder(
      { address: account_2.account.address }
    );
    assert.equal(holder_res_4.balance, "0");

    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    // Send bJUNO from account_1 to account_2
    await bjuno_token.transfer(
      { 
        account: account_1,
        customFees: {
          amount: [{ amount: "500000", denom: "ujuno" }],
          gas: "1000000",
        }
      },
      {
        amount: "600000",
        recipient: account_2.account.address,
      }
    );

    // Should change reward contract balances
    const holder_res_5 = await reward_contract.holder(
      { address: account_2.account.address }
    );
    assert.equal(holder_res_5.balance, "600000");

    const holder_res_6 = await reward_contract.holder(
      { address: account_1.account.address }
    );
    assert.equal(holder_res_6.balance, "1000000");

    // Convert seJUNO to bJUNO for account_2
    const sejuno_balance_res = await sejuno_token.balance(
      { address: account_2.account.address }
    );
    const sejuno_balance = sejuno_balance_res.balance;
    await sejuno_token.send(
      {
        account: account_2,
        customFees: {
          amount: [{ amount: "500000", denom: "ujuno" }],
          gas: "1000000",
        }
      },
      {
        amount: sejuno_balance,
        contract: staking_contract.contractAddress,
        msg: "eyJjb252ZXJ0Ijp7fX0=" // {"convert":{}}
      }
    );

    // Should change reward contract balances
    const holder_res_7 = await reward_contract.holder(
      { address: account_2.account.address }
    );
    assert.isAbove(parseFloat(holder_res_7.balance), 2000000);

    const holder_res_8 = await reward_contract.holder(
      { address: account_1.account.address }
    );
    assert.equal(holder_res_8.balance, "1000000");
  });

  /*
    2) Amount of reward for seJUNO and bJUNO
      - Deposit for seJUNO
      - Deposit for bJUNO
      - Sleep for sometime and do claim_and_stake
      - Check rewards to be equal for bJUNO ans seJUNO
  */
  it("Amount of reward should be same for bjuno and sejuno if claim_and_stake done once", async () => {
    // Deposit for seJUNO
    const transferAmount_1 = [{ "denom": "ujuno", "amount": "1200000" }];
    await staking_contract.stake(
      { account: account_2, transferAmount: transferAmount_1 },
      {referral: 0}
    );
    // Deposit for bJUNO
    const transferAmount_2 = [{ "denom": "ujuno", "amount": "1200000" }];
    await staking_contract.stakeForBjuno(
      { account: account_2, transferAmount: transferAmount_2 },
      {referral: 0}
    );
    await staking_contract.claimAndStake(
      { 
        account: contract_owner,
        customFees: {
          amount: [{ amount: "500000", denom: "ujuno" }],
          gas: "1000000",
        }
      }
    );

    // Sleep for sometime and do claim_and_stake
    await sleep(20);
    await staking_contract.claimAndStake(
      { 
        account: contract_owner,
        customFees: {
          amount: [{ amount: "500000", denom: "ujuno" }],
          gas: "1000000",
        }
      }
    );

    // Check rewards to be equal for bJUNO ans seJUNO
    const sejuno_exch_rate_res = await staking_contract.sejunoExchangeRate();
    const sejuno_exch_rate = parseFloat(sejuno_exch_rate_res.sejuno_exchange_rate.rate);
    console.log("sejuno_exch_rate: ", sejuno_exch_rate);

    const bjuno_exch_rate_res = await staking_contract.bjunoExchangeRate();
    const bjuno_exch_rate = parseFloat(bjuno_exch_rate_res.bjuno_exchange_rate.rate);
    console.log("bjuno_exch_rate: ", bjuno_exch_rate);

    const sejuno_balance_res = await sejuno_token.balance({
      "address": account_2.account.address,
    });
    const sejuno_bal = parseFloat(sejuno_balance_res.balance);

    const bjuno_balance_res = await bjuno_token.balance({
      "address": account_2.account.address,
    });
    const bjuno_bal = parseFloat(bjuno_balance_res.balance);

    const wasmChainClient = await CosmWasmClient.connect(
      "http://localhost:26657/",
    );

    const contract_juno_before = await wasmChainClient.getBalance(reward_contract.contractAddress, "ujuno");
    console.log("contract_juno_before: ", contract_juno_before);

    await account_1.setupClient();
    const account_1_juno_before = Number((await account_1.getBalance("ujuno")).amount);
    console.log("account_1_juno_before: ", account_1_juno_before);

    // bjuno reward
    const reward_res = await reward_contract.accruedRewards(
      { address: account_2.account.address }
    );

    const claim_res = await reward_contract.claim(
      { 
        account: account_2
      },
      {
        recipient: account_1.account.address
      }
    );
    console.log("claim_res: ", JSON.stringify(claim_res, null, 2));

    const contract_juno_after = await wasmChainClient.getBalance(reward_contract.contractAddress, "ujuno");
    console.log("contract_juno_after: ", contract_juno_after);

    const account_1_juno_after = Number((await account_1.getBalance("ujuno")).amount);
    console.log("account_1_juno_after: ", account_1_juno_after);

    const sejuno_juno = (sejuno_bal * sejuno_exch_rate);
    const bjuno_juno = (bjuno_bal * bjuno_exch_rate) + parseFloat(reward_res.rewards);
    assert.isAtMost(Math.abs(sejuno_juno-bjuno_juno), 10);
  });

  /*
    3) Reward contract config and state
      - Query rewards config
      - Deposit for bJUNO
      - Deposit for seJUNO from account_1
      - Query rewards state
  */
  it("Query config and state after doing updates", async () => {
    const reward_cfg_res = await reward_contract.config();
    console.log("reward_cfg_res: ", reward_cfg_res);

    // Deposit for bJUNO
    const transferAmount_1 = [{ "denom": "ujuno", "amount": "1200000" }];
    await staking_contract.stakeForBjuno(
      { account: account_2, transferAmount: transferAmount_1 },
      {referral: 0}
    );
    // Deposit for seJUNO from account_1
    const transferAmount_2 = [{ "denom": "ujuno", "amount": "1200000" }];
    await staking_contract.stake(
      { account: account_1, transferAmount: transferAmount_2 },
      {referral: 0}
    );

    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    const rewards_state_res = await reward_contract.state();
    assert.equal(rewards_state_res.global_index, '0');
    assert.equal(rewards_state_res.total_balance, '1200000');
    assert.equal(rewards_state_res.prev_reward_balance, '0');

    await sleep(10);
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    const rewards_state_res_1 = await reward_contract.state();
    assert.isAbove(parseFloat(rewards_state_res_1.global_index), 0);
    assert.equal(rewards_state_res_1.total_balance, '1200000');
    assert.isAbove(parseFloat(rewards_state_res_1.prev_reward_balance), 0);

    await sleep(10);
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    const rewards_state_res_2 = await reward_contract.state();
    assert.isAbove(
      parseFloat(rewards_state_res_2.global_index),
      parseFloat(rewards_state_res_1.global_index)
    );
    assert.equal(rewards_state_res_2.total_balance, '1200000');
    assert.isAtMost(
      Math.abs(
        parseFloat(rewards_state_res_2.prev_reward_balance)
        - 2 * parseFloat(rewards_state_res_1.prev_reward_balance)
      ),
      200
    );

    const account_2_holder_res_1 = await reward_contract.holder(
      { address: account_2.account.address }
    );
    assert.equal(account_2_holder_res_1.balance, "1200000");
    assert.equal(account_2_holder_res_1.index, "0");
    assert.equal(account_2_holder_res_1.pending_rewards, "0");

    // Send bJUNO from account_2 to account_1
    await bjuno_token.transfer(
      { 
        account: account_2,
        customFees: {
          amount: [{ amount: "500000", denom: "ujuno" }],
          gas: "1000000",
        }
      },
      {
        amount: "600000",
        recipient: account_1.account.address,
      }
    );

    const rewards_state_res_3 = await reward_contract.state();
    assert.equal(
      parseFloat(rewards_state_res_3.global_index),
      parseFloat(rewards_state_res_2.global_index)
    );
    assert.equal(rewards_state_res_3.total_balance, '1200000');
    assert.equal(
      parseFloat(rewards_state_res_3.prev_reward_balance),
      parseFloat(rewards_state_res_2.prev_reward_balance)
    );

    const account_2_holder_res_2 = await reward_contract.holder(
      { address: account_2.account.address }
    );
    assert.equal(account_2_holder_res_2.balance, "600000");
    assert.equal(account_2_holder_res_2.index, rewards_state_res_3.global_index);
    assert.isAtMost(
      Math.abs(
        parseFloat(account_2_holder_res_2.pending_rewards)
        - parseFloat(rewards_state_res_3.prev_reward_balance)
      ),
      200
    );

    // Burn bJUNO from account_1
    await bjuno_token.send(
      { 
        account: account_1,
        customFees: {
          amount: [{ amount: "500000", denom: "ujuno" }],
          gas: "1000000",
        }
      },
      {
        amount: "600000",
        contract: staking_contract.contractAddress,
        msg: "eyJjb252ZXJ0Ijp7fX0=" // {"convert":{}}
      }
    );

    await staking_contract.claimAndStake(
      { 
        account: contract_owner,
        customFees: {
          amount: [{ amount: "500000", denom: "ujuno" }],
          gas: "1000000",
        }
      }
    );

    const account_1_holder_res_3 = await reward_contract.holder(
      { address: account_1.account.address }
    );
    assert.equal(account_1_holder_res_3.balance, "0");
    assert.equal(account_1_holder_res_3.index, rewards_state_res_3.global_index);
    assert.equal(account_1_holder_res_3.pending_rewards, "0");

    const rewards_state_res_4 = await reward_contract.state();
    assert.equal(rewards_state_res_4.total_balance, "600000");
  });
});
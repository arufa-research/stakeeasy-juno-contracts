import { use, assert, expect }  from "chai";
import { junokitChai, junokitTypes }  from "junokit";

import { StakingContractContract } from "../artifacts/typescript_schema/StakingContract";
import { SejunoTokenContract } from "../artifacts/typescript_schema/SejunoToken";
import { BjunoTokenContract } from "../artifacts/typescript_schema/BjunoToken";
import { MockSelectionContract } from "../artifacts/typescript_schema/MockSelection";
import { RewardContractContract } from "../artifacts/typescript_schema/RewardContract";

import { setup } from "./setupContracts";

use(junokitChai);

describe("bJUNO token flow", () => {
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
    1) Deposit for bJUNO multiple times
      - Deposit for bJUNO
      - Wait and deposit for bJUNO again
      - Withdraw some bJUNO
      - Deposit for seJUNO and check bJUNO exchange rate
  */
  it("bJUNO exchange rate", async () => {
    const transferAmount_1 = [{ "denom": "ujuno", "amount": "1200000" }];
    await staking_contract.stakeForBjuno(
      { account: contract_owner, transferAmount: transferAmount_1 },
      {referral: 0} 
    );
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );
    await staking_contract.advanceWindow(
      { 
        account: contract_owner,
        customFees: {
          amount: [{ amount: "500000", denom: "ujuno" }],
          gas: "1000000",
        }
      }
    );

    // assert exch rate
    const exchange_rate_1 = await staking_contract.bjunoExchangeRate();
    let rate_1 = parseFloat(exchange_rate_1.bjuno_exchange_rate.rate);
    console.log("bjuno exchange_rate_1: ", rate_1);
    assert.equal(rate_1, 1.00);

    const transferAmount_2 = [{ "denom": "ujuno", "amount": "1800000" }];
    await staking_contract.stakeForBjuno(
      { account: contract_owner, transferAmount: transferAmount_2 },
      {referral: 0} 
    );

    // assert exch rate
    const exchange_rate_2 = await staking_contract.bjunoExchangeRate();
    let rate_2 = parseFloat(exchange_rate_2.bjuno_exchange_rate.rate);
    console.log("bjuno exchange_rate_2: ", rate_2);
    assert.equal(rate_2, 1.00);

    // withdraw bJUNO
    await bjuno_token.send(
      { 
        account: contract_owner,
        customFees: {
          amount: [{ amount: "500000", denom: "ujuno" }],
          gas: "1000000",
        }
      },
      {
        amount: "1800000",
        contract: staking_contract.contractAddress,
        msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
      }
    );

    await staking_contract.claimAndStake(
      { account: contract_owner }
    );
    await staking_contract.advanceWindow(
      { 
        account: contract_owner,
        customFees: {
          amount: [{ amount: "500000", denom: "ujuno" }],
          gas: "1000000",
        }
      }
    );

    const transferAmount_3 = [{ "denom": "ujuno", "amount": "1000000" }];
    await staking_contract.stake(
      { account: contract_owner, transferAmount: transferAmount_3 },
      { referral: 0 }
    );
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    // assert exch rate
    const exchange_rate_3 = await staking_contract.bjunoExchangeRate();
    let rate_3 = parseFloat(exchange_rate_3.bjuno_exchange_rate.rate);
    console.log("bjuno exchange_rate_3: ", rate_3);
    assert.equal(rate_3, 1.00);
  });

  /*
    2) Mint bJUNO multiple times
      - Deposit for bJUNO
      - Deposit for seJUNO
      - Deposit for bJUNO from account_1
      - Check supply of bJUNO
  */
  it("Minting of bJUNO", async () => {
    const transferAmount_1 = [{ "denom": "ujuno", "amount": "1200000" }];
    await staking_contract.stakeForBjuno(
      { account: contract_owner, transferAmount: transferAmount_1 },  {referral: 0} 
    );
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    await staking_contract.advanceWindow(
      { 
        account: contract_owner,
        customFees: {
          amount: [{ amount: "500000", denom: "ujuno" }],
          gas: "1000000",
        }
      }
    );

    const transferAmount_2 = [{ "denom": "ujuno", "amount": "1000000" }];
    await staking_contract.stake(
      { account: contract_owner, transferAmount: transferAmount_2 },  {referral: 0} 
    );

    const transferAmount_3 = [{ "denom": "ujuno", "amount": "1500000" }];
    await staking_contract.stakeForBjuno(
      { account: account_1, transferAmount: transferAmount_3 },  {referral: 0} 
    );

    // assert wallet balances
    const owner_balance_res = await bjuno_token.balance({
      "address": contract_owner.account.address,
    });
    const owner_bjuno = owner_balance_res.balance;
    assert.equal(owner_bjuno, "1200000");

    const account_1_balance_res = await bjuno_token.balance({
      "address": account_1.account.address,
    });
    const account_1_bjuno = account_1_balance_res.balance;
    assert.equal(account_1_bjuno, "1500000");

    // assert total supply
    const supply_res = await bjuno_token.tokenInfo();
    assert.equal(supply_res.total_supply, "2700000");
  });

  /*
    3) Deposit and withdraw all of bJUNO
      - Deposit for bJUNO
      - Withdraw portion of amount
      - Deposit again for bJUNO
      - Withdraw all of bJUNO
      - Check when bJUNO supply is zero
      - Should get JUNO at claim
  */
  it("burning of bJUNO", async () => {
    const transferAmount_1 = [{ "denom": "ujuno", "amount": "1200000" }];
    await staking_contract.stakeForBjuno(
      { account: contract_owner, transferAmount: transferAmount_1 },  {referral: 0} 
    );
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    // withdraw some bJUNO in first window
    await bjuno_token.send(
      {
        account: contract_owner,
        customFees: {
          amount: [{ amount: "500000", denom: "ujuno" }],
          gas: "1000000",
        }
      },
      {
        amount: "1000000",
        contract: staking_contract.contractAddress,
        msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
      }
    );

    await staking_contract.advanceWindow(
      { 
        account: contract_owner,
        customFees: {
          amount: [{ amount: "500000", denom: "ujuno" }],
          gas: "1000000",
        }
      }
    );

    // query window before withdraw txn
    const window_before = await staking_contract.window();
    console.log("window before: ", window_before);

    const transferAmount_2 = [{ "denom": "ujuno", "amount": "1500000" }];
    await staking_contract.stakeForBjuno(
      { account: account_1, transferAmount: transferAmount_2 },  {referral: 0} 
    );
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    // withdraw all bJUNO in second window
    await bjuno_token.send(
      {
        account: contract_owner,
        customFees: {
          amount: [{ amount: "500000", denom: "ujuno" }],
          gas: "1000000",
        }
      },
      {
        amount: "200000",
        contract: staking_contract.contractAddress,
        msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
      }
    );

    // query window after withdraw txn
    const window_after_1 = await staking_contract.window();
    console.log("window after 1: ", window_after_1);

    // withdraw all amount for second account
    await bjuno_token.send(
      {
        account: account_1,
        customFees: {
          amount: [{ amount: "500000", denom: "ujuno" }],
          gas: "1000000",
        }
      },
      {
        amount: "1500000",
        contract: staking_contract.contractAddress,
        msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
      }
    );

    // query window after withdraw txn
    const window_after_2 = await staking_contract.window();
    console.log("window after 2: ", window_after_2);

    // assert total supply
    const supply_res = await bjuno_token.tokenInfo();
    assert.equal(supply_res.total_supply, "1700000");

    // do 7 advance window after prev adv window
    // after 7th advance window (total 8th) is done,
    // prev window will be matured and claimable
    for (let idx = 0; idx < 7; idx++) {
      await sleep(window_time);

      const owner_undelegations_res = await staking_contract.undelegations({
        "address": contract_owner.account.address
      });
      console.log("Pending: ", owner_undelegations_res.pending_claims.pending);

      const undelegations_res = await staking_contract.undelegations({
        "address": account_1.account.address
      });
      console.log("Pending: ", undelegations_res.pending_claims.pending);

      await staking_contract.claimAndStake(
        { account: contract_owner }
      );
      await staking_contract.advanceWindow(
        { 
          account: contract_owner,
          customFees: {
            amount: [{ amount: "500000", denom: "ujuno" }],
            gas: "1000000",
          }
        }
      );
    }

    // assert total supply
    const final_supply_res = await bjuno_token.tokenInfo();
    assert.equal(final_supply_res.total_supply, "0");

    // claim for owner
    const owner_claim_res = await staking_contract.userClaimable(
      { "address": contract_owner.account.address }
    );
    const owner_claim_amount = Number(owner_claim_res.claimable.claimable_amount);
    assert.isAtLeast(owner_claim_amount, 1200000 - 5);  // -5 to handle division error
    await staking_contract.claim(
        { account: contract_owner },
    );

    // claim for account_1
    const account_1_claim_res = await staking_contract.userClaimable(
      { "address": account_1.account.address }
    );
    const account_1_claim_amount = Number(account_1_claim_res.claimable.claimable_amount);
    assert.isAtLeast(account_1_claim_amount, 1500000 - 5);  // -5 to handle division error
    await staking_contract.claim(
        { account: account_1 },
    );
  });

  /*
    4) Check conversion of bJUNO to seJUNO
      - Deposit for bJUNO
      - Deposit for seJUNO
      - Convert bJUNO to seJUNO
      - Check balance of seJUNO in account
  */
  it("Convert bJUNO to seJUNO", async () => {
    // Deposit for bJUNO
    const transferAmount_1 = [{ "denom": "ujuno", "amount": "1200000" }];
    await staking_contract.stakeForBjuno(
      { account: contract_owner, transferAmount: transferAmount_1 },  {referral: 0} 
    );
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    // Deposit for seJUNO
    const transferAmount_2 = [{ "denom": "ujuno", "amount": "1600000" }];
    await staking_contract.stake(
      { account: contract_owner, transferAmount: transferAmount_2 },  {referral: 0} 
    );
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    await staking_contract.advanceWindow(
      { 
        account: contract_owner,
        customFees: {
          amount: [{ amount: "500000", denom: "ujuno" }],
          gas: "1000000",
        }
      }
    );

    const sejuno_exch_rate_res = await staking_contract.sejunoExchangeRate();
    let sejuno_exch_rate_1 = parseFloat(sejuno_exch_rate_res.sejuno_exchange_rate.rate);
    console.log("sejuno_exch_rate: ", sejuno_exch_rate_1);

    // convert all bJUNO to seJUNO
    await bjuno_token.send(
      {
        account: contract_owner,
        customFees: {
          amount: [{ amount: "500000", denom: "ujuno" }],
          gas: "1000000",
        }
      },
      {
        amount: "1200000",
        contract: staking_contract.contractAddress,
        msg: "eyJjb252ZXJ0Ijp7fX0=" // {"convert":{}}
      }
    );

    // check if seJUNO balance is within range
    const sejuno_balance_res = await sejuno_token.balance({ address: contract_owner.account.address });
    const sejuno_balance = parseFloat(sejuno_balance_res.balance);

    const expected_balance = 1600000 + (1200000 / sejuno_exch_rate_1);
    assert.isAtLeast(sejuno_balance, expected_balance - 2000);
  });

  /*
    5) Check staking reward claim for bJUNO
      - Deposit for bJUNO
      - Wait some time
      - Claim some staking reward from reward contract
      - Deposit more for bJUNO
      - Wait some time
      - Claim staking rewards (should be proportional to deposit)
  */
  it("User claim while holding bJUNO", async () => {
    // Deposit for bJUNO
    const transferAmount_1 = [{ "denom": "ujuno", "amount": "1200000" }];
    await staking_contract.stakeForBjuno(
      { account: contract_owner, transferAmount: transferAmount_1 },  {referral: 0} 
    );
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    await sleep(10);
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    const rewards_1 = await reward_contract.accruedRewards({address: contract_owner.account.address});
    console.log("rewards_1: ", rewards_1);

    // claim staking rewards
    await reward_contract.claim(
      { account: contract_owner },
      {}
    );

    // Deposit for bJUNO
    const transferAmount_2 = [{ "denom": "ujuno", "amount": "1800000" }];
    await staking_contract.stakeForBjuno(
      { account: contract_owner, transferAmount: transferAmount_2 },  {referral: 0} 
    );
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    await sleep(20);
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    const rewards_2 = await reward_contract.accruedRewards({address: contract_owner.account.address});
    console.log("rewards_2: ", rewards_2);

    // claim staking rewards
    await reward_contract.claim(
      { account: contract_owner },
      {}
    );

    // rewards_2 should be greater than rewards_1
    assert.isAtLeast(parseFloat(rewards_2.rewards), parseFloat(rewards_1.rewards));

    // withdraw all of bJUNO
    const owner_balance_res = await bjuno_token.balance({
      "address": contract_owner.account.address,
    });
    const owner_bjuno = owner_balance_res.balance;
    await bjuno_token.send(
      {
        account: contract_owner,
        customFees: {
          amount: [{ amount: "500000", denom: "ujuno" }],
          gas: "1000000",
        }
      },
      {
        amount: owner_bjuno,
        contract: staking_contract.contractAddress,
        msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond":{}}
      }
    );

    // claim staking rewards
    await reward_contract.claim(
      { account: contract_owner },
      {}
    );

    await sleep(10);
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    // claim rewards should be zero
    const rewards_3 = await reward_contract.accruedRewards({address: contract_owner.account.address});
    console.log("rewards_3: ", rewards_3);
    assert.equal(parseFloat(rewards_3.rewards), 0.00);
  });

  /*
    6) Withdraw both seJUNO and bJUNO in same window
      - Deposit for bJUNO
      - Deposit for seJUNO from account_1
      - Withdraw both in same window
      - Claim unbonded JUNO and check
  */
  it("Withdraw bJUNO and seJUNO", async () => {
    // Deposit for bJUNO
    const transferAmount_1 = [{ "denom": "ujuno", "amount": "1200000" }];
    await staking_contract.stakeForBjuno(
      { account: account_2, transferAmount: transferAmount_1 },  {referral: 0} 
    );

    // Deposit for seJUNO from account_1
    const transferAmount_2 = [{ "denom": "ujuno", "amount": "1500000" }];
    await staking_contract.stake(
      { account: account_1, transferAmount: transferAmount_2 },  {referral: 0} 
    );

    await sleep(10);
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    // Withdraw bJUNO
    const account_2_balance_res = await bjuno_token.balance({
      "address": account_2.account.address,
    });
    const account_2_bjuno = account_2_balance_res.balance;
    await bjuno_token.send(
      { 
        account: account_2,
        customFees: {
          amount: [{ amount: "500000", denom: "ujuno" }],
          gas: "1000000",
        }
      },
      {
        amount: account_2_bjuno,
        contract: staking_contract.contractAddress,
        msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
      }
    );

    // Withdraw seJUNO
    const account_1_balance_res = await sejuno_token.balance({
      "address": account_1.account.address,
    });
    const account_1_sejuno = account_1_balance_res.balance;
    await sejuno_token.send(
      { 
        account: account_1,
        customFees: {
          amount: [{ amount: "500000", denom: "ujuno" }],
          gas: "1000000",
        }
      },
      {
        amount: account_1_sejuno,
        contract: staking_contract.contractAddress,
        msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
      }
    );

    // seJUNO exch rate
    const sejuno_exch_rate_res = await staking_contract.sejunoExchangeRate();
    let sejuno_exch_rate = parseFloat(sejuno_exch_rate_res.sejuno_exchange_rate.rate);
    console.log("sejuno_exch_rate: ", sejuno_exch_rate);

    await staking_contract.advanceWindow(
      { 
        account: contract_owner,
        customFees: {
          amount: [{ amount: "500000", denom: "ujuno" }],
          gas: "1000000",
        }
      }
    );

    // 7 advance window after prev adv window
    // after 7th advance window (total 8th) is done,
    // prev window will be matured and claimable
    for (let idx = 0; idx < 7; idx++) {
      await sleep(window_time);

      const account_2_undelegations_res = await staking_contract.undelegations({
        "address": account_2.account.address
      });
      console.log("Pending: ", account_2_undelegations_res.pending_claims.pending);

      const undelegations_res = await staking_contract.undelegations({
        "address": account_1.account.address
      });
      console.log("Pending: ", undelegations_res.pending_claims.pending);

      await staking_contract.claimAndStake(
        { account: contract_owner }
      );
      await staking_contract.advanceWindow(
        { 
          account: contract_owner,
          customFees: {
            amount: [{ amount: "500000", denom: "ujuno" }],
            gas: "1000000",
          }
        }
      );
    }

    const account_2_claimable = await staking_contract.userClaimable(
      { address: account_2.account.address }
    );
    console.log("account_2_claimable: ", account_2_claimable);

    const account_1_claimable = await staking_contract.userClaimable(
      { address: account_1.account.address }
    );
    console.log("account_1_claimable: ", account_1_claimable);

    await staking_contract.claim(
      { account: account_2 }
    );
    await staking_contract.claim(
      { account: account_1 }
    );

    assert.isAtLeast(parseFloat(account_2_claimable.claimable.claimable_amount), parseFloat(account_2_bjuno) - 1000);
    assert.isAtLeast(parseFloat(account_1_claimable.claimable.claimable_amount), parseFloat(account_1_sejuno)* sejuno_exch_rate - 5);

    assert.isAtMost(parseFloat(account_2_claimable.claimable.claimable_amount), parseFloat(account_2_bjuno) + 1000);
    assert.isAtMost(parseFloat(account_1_claimable.claimable.claimable_amount), parseFloat(account_1_sejuno) * sejuno_exch_rate + 5000);
  });

  /*
    7) Withdraw both seJUNO and bJUNO in different window
      - Deposit for bJUNO
      - Deposit for seJUNO from account_1
      - Withdraw bJUNO
      - Withdraw seJUNO in next window
      - Claim unbonded JUNO and check
  */
  it("Withdraw bJUNO and seJUNO in different window", async () => {
    // Deposit for bJUNO
    const transferAmount_1 = [{ "denom": "ujuno", "amount": "1200000" }];
    await staking_contract.stakeForBjuno(
      { account: account_2, transferAmount: transferAmount_1 },
      {referral: 0}    );

    // Deposit for seJUNO from account_1
    const transferAmount_2 = [{ "denom": "ujuno", "amount": "1500000" }];
    await staking_contract.stake(
      { account: account_1, transferAmount: transferAmount_2 },
      {referral: 0} 
    );

    await sleep(10);
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    // Withdraw bJUNO
    const account_2_balance_res = await bjuno_token.balance({
      "address": account_2.account.address,
    });
    const account_2_bjuno = account_2_balance_res.balance;
    await bjuno_token.send(
      { 
        account: account_2,
        customFees: {
          amount: [{ amount: "500000", denom: "ujuno" }],
          gas: "1000000",
        }
      },
      {
        amount: account_2_bjuno,
        contract: staking_contract.contractAddress,
        msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
      }
    );

    // next window
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );
    const adv_res_1 = await staking_contract.advanceWindow(
      { 
        account: contract_owner,
        customFees: {
          amount: [{ amount: "500000", denom: "ujuno" }],
          gas: "1000000",
        }
      }
    );
    console.log("adv_res_1:", JSON.stringify(adv_res_1, null, 2));

    // Withdraw seJUNO
    const account_1_balance_res = await sejuno_token.balance({
      "address": account_1.account.address,
    });
    const account_1_sejuno = account_1_balance_res.balance;
    await sejuno_token.send(
      { 
        account: account_1,
        customFees: {
          amount: [{ amount: "500000", denom: "ujuno" }],
          gas: "1000000",
        }
      },
      {
        amount: account_1_sejuno,
        contract: staking_contract.contractAddress,
        msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
      }
    );

    // seJUNO exch rate
    const sejuno_exch_rate_res = await staking_contract.sejunoExchangeRate();
    let sejuno_exch_rate = parseFloat(sejuno_exch_rate_res.sejuno_exchange_rate.rate);
    console.log("sejuno_exch_rate: ", sejuno_exch_rate);

    await staking_contract.claimAndStake(
      { account: contract_owner }
    );
    const adv_res_2 = await staking_contract.advanceWindow(
      { 
        account: contract_owner,
        customFees: {
          amount: [{ amount: "500000", denom: "ujuno" }],
          gas: "1000000",
        }
      }
    );
    console.log("adv_res_2:", JSON.stringify(adv_res_2, null, 2));


    // 7 advance window after prev adv window
    // after 7th advance window (total 8th) is done,
    // prev window will be matured and claimable
    for (let idx = 0; idx < 7; idx++) {
      await sleep(window_time + 1);

      const owner_undelegations_res = await staking_contract.undelegations({
        "address": account_2.account.address
      });
      console.log("Pending: ", owner_undelegations_res.pending_claims.pending);

      const undelegations_res = await staking_contract.undelegations({
        "address": account_1.account.address
      });
      console.log("Pending: ", undelegations_res.pending_claims.pending);

      await staking_contract.claimAndStake(
        { account: contract_owner }
      );
      const adv_res_3 = await staking_contract.advanceWindow(
        { 
          account: contract_owner,
          customFees: {
            amount: [{ amount: "500000", denom: "ujuno" }],
            gas: "1000000",
          }
        }
      );
      console.log("adv_res_3:", idx, JSON.stringify(adv_res_3, null, 2));
    }

    const account_2_claimable = await staking_contract.userClaimable(
      { address: account_2.account.address }
    );
    console.log("account_2_claimable: ", account_2_claimable);

    const account_1_claimable = await staking_contract.userClaimable(
      { address: account_1.account.address }
    );
    console.log("account_1_claimable: ", account_1_claimable);

    await staking_contract.claim(
      { account: account_2 }
    );
    await staking_contract.claim(
      { account: account_1 }
    );

    assert.isAtLeast(parseFloat(account_2_claimable.claimable.claimable_amount), parseFloat(account_2_bjuno) - 5);
    assert.isAtLeast(parseFloat(account_1_claimable.claimable.claimable_amount), parseFloat(account_1_sejuno)* sejuno_exch_rate - 5);

    assert.isAtMost(parseFloat(account_2_claimable.claimable.claimable_amount), parseFloat(account_2_bjuno) + 5);
    assert.isAtMost(parseFloat(account_1_claimable.claimable.claimable_amount), parseFloat(account_1_sejuno) * sejuno_exch_rate + 5000);
  });
});
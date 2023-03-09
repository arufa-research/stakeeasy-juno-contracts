import { use, assert, expect }  from "chai";
import { junokitChai, junokitTypes }  from "junokit";

import { StakingContractContract } from "../artifacts/typescript_schema/StakingContract";
import { SejunoTokenContract } from "../artifacts/typescript_schema/SejunoToken";
import { BjunoTokenContract } from "../artifacts/typescript_schema/BjunoToken";
import { MockSelectionContract } from "../artifacts/typescript_schema/MockSelection";
import { RewardContractContract } from "../artifacts/typescript_schema/RewardContract";

import { setup } from "./setupContracts";

use(junokitChai);

describe("seJUNO token flow", () => {
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
    1) Deposit for seJUNO multiple times
      - Deposit for seJUNO
      - Check exchange rate
      - Wait and deposit for seJUNO again
      - Check for exchange rate, should be more than previous
      - Withdraw some seJUNO
      - Deposit for bJUNO
      - Check for exchange rate, should be more than previous
  */
  it("seJUNO exchange rate", async () => {
    const transferAmount_1 = [{ "denom": "ujuno", "amount": "1200000" }];
    await staking_contract.stake(
      { account: account_2, transferAmount: transferAmount_1 },
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
    const exchange_rate_1 = await staking_contract.sejunoExchangeRate();
    let rate_1 = parseFloat(exchange_rate_1.sejuno_exchange_rate.rate);
    console.log("sejuno exchange_rate_1: ", rate_1);
    assert.isAtLeast(rate_1, 1.00);

    const transferAmount_2 = [{ "denom": "ujuno", "amount": "1800000" }];
    await staking_contract.stake(
      { account: account_2, transferAmount: transferAmount_2 },
      {referral: 0} 
    );

    // assert exch rate
    const exchange_rate_2 = await staking_contract.sejunoExchangeRate();
    let rate_2 = parseFloat(exchange_rate_2.sejuno_exchange_rate.rate);
    console.log("sejuno exchange_rate_2: ", rate_2);
    assert.isAtLeast(rate_2, rate_1);

    // withdraw seJUNO
    await sejuno_token.send(
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
    await staking_contract.stakeForBjuno(
      { account: account_2, transferAmount: transferAmount_3 },
      {referral: 0} 
    );
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    // assert exch rate
    const exchange_rate_3 = await staking_contract.sejunoExchangeRate();
    let rate_3 = parseFloat(exchange_rate_3.sejuno_exchange_rate.rate);
    console.log("sejuno exchange_rate_3: ", rate_3);
    assert.isAtLeast(rate_3, rate_2);
  });

  /*
    2) Mint seJUNO multiple times
      - Deposit for seJUNO
      - Deposit for bJUNO
      - Deposit for seJUNO from account_1
      - Check supply of seJUNO
  */
  it("Minting of seJUNO", async () => {
    const transferAmount_1 = [{ "denom": "ujuno", "amount": "1200000" }];
    await staking_contract.stake(
      { account: account_2, transferAmount: transferAmount_1 },  {referral: 0} 
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
    await staking_contract.stakeForBjuno(
      { account: account_2, transferAmount: transferAmount_2 },  {referral: 0} 
    );

    const exchange_rate_1 = await staking_contract.sejunoExchangeRate();
    let sejuno_rate_1 = parseFloat(exchange_rate_1.sejuno_exchange_rate.rate);
    console.log("sejuno exchange_rate_1: ", sejuno_rate_1);

    const transferAmount_3 = [{ "denom": "ujuno", "amount": "1500000" }];
    await staking_contract.stake(
      { account: account_1, transferAmount: transferAmount_3 },  {referral: 0} 
    );

    // assert wallet balances
    const account_2_balance_res = await sejuno_token.balance({
      "address": account_2.account.address,
    });
    const account_2_sejuno = account_2_balance_res.balance;
    assert.equal(account_2_sejuno, "1200000");

    const account_1_balance_res = await sejuno_token.balance({
      "address": account_1.account.address,
    });
    const account_1_sejuno = account_1_balance_res.balance;
    assert.isAtMost(parseFloat(account_1_sejuno), 1500000 / sejuno_rate_1);

    // assert total supply
    const supply_res = await sejuno_token.tokenInfo();
    assert.isAtMost(parseFloat(supply_res.total_supply), 1200000 + (1500000 / sejuno_rate_1));
  });

  /*
    3) Deposit and withdraw all of seJUNO
      - Deposit for seJUNO
      - Withdraw portion of amount
      - Deposit again for seJUNO
      - Withdraw all of seJUNO
      - Check when seJUNO supply is zero
      - Should get JUNO at claim
  */
  it("burning of seJUNO", async () => {
    const transferAmount_1 = [{ "denom": "ujuno", "amount": "1200000" }];
    await staking_contract.stake(
      { account: account_2, transferAmount: transferAmount_1 },  {referral: 0} 
    );
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    // withdraw some seJUNO in first window
    await sejuno_token.send(
      {
        account: account_2,
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

    // query window before withdraw txn
    const window_before_1 = await staking_contract.window();
    console.log("window before 1: ", window_before_1);

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

    // query window before withdraw txn
    const window_before_2 = await staking_contract.window();
    console.log("window before 2: ", window_before_2);

    const exchange_rate_1 = await staking_contract.sejunoExchangeRate();
    let sejuno_rate_1 = parseFloat(exchange_rate_1.sejuno_exchange_rate.rate);
    console.log("sejuno exchange_rate_1: ", sejuno_rate_1);

    const transferAmount_2 = [{ "denom": "ujuno", "amount": "1500000" }];
    await staking_contract.stake(
      { account: account_1, transferAmount: transferAmount_2 },  {referral: 0} 
    );
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    const sejuno_balance_res = await sejuno_token.balance({ address: account_2.account.address });
    const sejuno_balance = sejuno_balance_res.balance;

    // withdraw all seJUNO in second window
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
        msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
      }
    );

    // query window after withdraw txn
    const window_after_1 = await staking_contract.window();
    console.log("window after 1: ", window_after_1);

    const sejuno_balance_res_1 = await sejuno_token.balance({ address: account_1.account.address });
    const sejuno_balance_1 = sejuno_balance_res_1.balance;

    // withdraw all amount for second account
    await sejuno_token.send(
      {
        account: account_1,
        customFees: {
          amount: [{ amount: "500000", denom: "ujuno" }],
          gas: "1000000",
        }
      },
      {
        amount: sejuno_balance_1,
        contract: staking_contract.contractAddress,
        msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
      }
    );

    // query window after withdraw txn
    const window_after_2 = await staking_contract.window();
    console.log("window after 2: ", window_after_2);

    // assert total supply
    const supply_res = await sejuno_token.tokenInfo();
    assert.isAtMost(parseFloat(supply_res.total_supply), 200000 + (1500000 / sejuno_rate_1));

    // do 7 advance window after prev adv window
    // after 7th advance window (total 8th) is done,
    // prev window will be matured and claimable
    for (let idx = 0; idx < 7; idx++) {
      await sleep(window_time);

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
    const final_supply_res = await sejuno_token.tokenInfo();
    assert.equal(final_supply_res.total_supply, "0");

    // claim for account_2
    const account_2_claim_res = await staking_contract.userClaimable(
      { "address": account_2.account.address }
    );
    const account_2_claim_amount = Number(account_2_claim_res.claimable.claimable_amount);
    assert.isAtLeast(account_2_claim_amount, 1200000 - 5);  // -5 to handle division error
    await staking_contract.claim(
        { account: account_2 },
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
    4) Check conversion of seJUNO to bJUNO
      - Deposit for bJUNO
      - Deposit for seJUNO
      - Convert seJUNO to bJUNO
      - Check balance of bJUNO in account
  */
  it("Convert seJUNO to bJUNO", async () => {
    // Deposit for bJUNO
    const transferAmount_2 = [{ "denom": "ujuno", "amount": "1600000" }];
    await staking_contract.stakeForBjuno(
      { account: account_2, transferAmount: transferAmount_2 },  {referral: 0} 
    );
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    // Deposit for seJUNO
    const transferAmount_1 = [{ "denom": "ujuno", "amount": "1200000" }];
    await staking_contract.stake(
      { account: account_2, transferAmount: transferAmount_1 },  {referral: 0} 
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

    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    const sejuno_exch_rate_res = await staking_contract.sejunoExchangeRate();
    let sejuno_exch_rate_1 = parseFloat(sejuno_exch_rate_res.sejuno_exchange_rate.rate);
    console.log("sejuno_exch_rate: ", sejuno_exch_rate_1);

    const sejuno_balance_res = await sejuno_token.balance({ address: account_2.account.address });
    const sejuno_balance = sejuno_balance_res.balance;

    // convert all seJUNO to bJUNO
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

    // check if bJUNO balance is within range
    const bjuno_balance_res = await bjuno_token.balance({ address: account_2.account.address });
    const bjuno_balance = parseFloat(bjuno_balance_res.balance);
    console.log("bjuno_balance: ", bjuno_balance);

    const expected_balance = 1600000 + (1200000 * sejuno_exch_rate_1);
    assert.isAtLeast(bjuno_balance, expected_balance - 2000);
  });
});
//check marketing , logo ....
// UDIT

import { use, assert, expect }  from "chai";
import { junokitChai, junokitTypes }  from "junokit";

import { StakingContractContract } from "../artifacts/typescript_schema/StakingContract";
import { SejunoTokenContract } from "../artifacts/typescript_schema/SejunoToken";
import { BjunoTokenContract } from "../artifacts/typescript_schema/BjunoToken";
import { MockSelectionContract } from "../artifacts/typescript_schema/MockSelection";
import { RewardContractContract } from "../artifacts/typescript_schema/RewardContract";

import { setup } from "./setupContracts";

use(junokitChai);

describe("Deposit Flow", () => {
  let contract_owner: junokitTypes.UserAccount;
  let runTs: String;
  let sejuno_token: SejunoTokenContract, staking_contract: StakingContractContract;
  let bjuno_token: BjunoTokenContract, validator_info: MockSelectionContract;
  let reward_contract: RewardContractContract;

  before(async() => {
    const result = await setup();
    runTs = result.runTs;
    contract_owner = result.contract_owner;
    sejuno_token = result.sejuno_token;
    staking_contract = result.staking_contract;
    bjuno_token = result.bjuno_token;
    validator_info = result.validator_info;
    reward_contract = result.reward_contract;
  });

  afterEach(async() => {
    const result = await setup();
    runTs = result.runTs;
    contract_owner = result.contract_owner;
    sejuno_token = result.sejuno_token;
    staking_contract = result.staking_contract;
    bjuno_token = result.bjuno_token;
    validator_info = result.validator_info;
    reward_contract = result.reward_contract;
  });

  function sleep(seconds: number) {
    console.log("Sleeping for " + seconds + " seconds");
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }
  /*
    1) Initialisation check by querying info
  */
  it("Should initialize contract with correct parameters", async () => {
    const staking_info_1 = await staking_contract.info();
    console.log(staking_info_1);
    assert.equal(staking_info_1.info.admin, contract_owner.account.address);
    assert.equal(staking_info_1.info.total_staked, '0');
    assert.equal(staking_info_1.info.sejuno_in_contract, '0');
    assert.equal(staking_info_1.info.bjuno_in_contract, '0');
    assert.equal(staking_info_1.info.juno_under_withdraw, '0');
  });
  /*
    2) Step wise Check from deposit to contract to delegation to validators
      -user deposit
      -User should get sejuno as expected
      -Check contract balance of Juno(not written here)
      -claim_and_stake
  */
  it("Deposit correct amount,send seJuno to user, Juno remains in contract, claim_stake send to validators", async () => {
    const transferAmount_2 = [{ "denom": "ujuno", "amount": "1200000" }];
    const staking_info = await staking_contract.info();
    // sejuno_token.instantiatedWithAddress(staking_info.info.token_address);
    // await staking_contract.tx.add_to_whitelist({ account: contract_owner }, { "address": contract_owner.account.address });
    // await sleep(125);
    await staking_contract.stake(
      { account: contract_owner, transferAmount: transferAmount_2 },  {referral: 0} 
    );
    const staking_info_1 = await staking_contract.info();
    console.log(staking_info_1);

    // assert.equal(staking_info_1.info.total_staked, '1200000');
    // assert.equal(staking_info_1.info.sejuno_in_contract, '0');
    // assert.equal(staking_info_1.info.juno_under_withdraw, '0');

    await expect(sejuno_token.balance({
      "address": contract_owner.account.address
    })).to.respondWith({ 'balance': '1200000' });

    await staking_contract.claimAndStake(
      { account: contract_owner }
    );
    const staking_info_2 = await staking_contract.info();
    assert.equal(staking_info_2.info.total_staked, '1199999');
    // assert.equal(staking_info_2.info.scrt_in_contract, '0');
    assert.equal(staking_info_2.info.sejuno_in_contract, '0');
    assert.equal(staking_info_2.info.juno_under_withdraw, '0');
  });
  /*
    3) Exchange rate should increase after delegation to validators
      -query x_rate_1
      -claim_and_stake
      -query x_rate_2
      -x_rate_2 > rate_1
  */
  it("Case for varying exchange rate", async () => {
    const ex_rate_1 = await staking_contract.sejunoExchangeRate();
    let rate_1 = parseFloat(ex_rate_1.sejuno_exchange_rate.rate);
    rate_1 = rate_1 * 1000000;
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );
    await sleep(50);
    const ex_rate_2 = await staking_contract.sejunoExchangeRate();
    let rate_2 = parseFloat(ex_rate_2.sejuno_exchange_rate.rate);
    rate_2 = rate_2 * 1000000;

    assert.isAbove(rate_2, rate_1);
  });
  /*
    4) Check deposit amount limit
      -deposit less than limit
      -should fail
  */
  it("Should not deposit less than 1 juno", async () => {
    const transferAmount_2 = [{ "denom": "ujuno", "amount": "200000" }];
    // await staking_contract.tx.add_to_whitelist({ account: contract_owner }, { "address": contract_owner.account.address });
    await expect(staking_contract.stake({
      account: contract_owner,
      transferAmount: transferAmount_2
    },  {referral: 0} )).to.be.revertedWith('Can only deposit a minimum of 1,000,000 ujuno (1 JUNO)');
  });

  /*
    5) Depositing at different rates and checking sejuno amount is as expecnted or not
      -query rate_1
      -deposit at this rate
      -wait for some time
      -query rate_2
      -deposit @ rate_2
      -sejuno amount shoud be as expected
  */
  it("Total staked must vary with initial total staked, User getting seJuno according to x_rate", async () => {
    const transferAmount_2 = [{ "denom": "ujuno", "amount": "1100000" }];
    const ex_rate = await staking_contract.sejunoExchangeRate();
    console.log("ex_rate => ", ex_rate);
    let rate = parseFloat(ex_rate.sejuno_exchange_rate.rate);
    // await staking_contract.tx.add_to_whitelist({ account: contract_owner }, { "address": contract_owner.account.address });
    await sleep(125);
    const bal_before_stake = await sejuno_token.balance(
      {
        "address": contract_owner.account.address,
      }
    );
    console.log("bal_before_stake => ", bal_before_stake);
    await staking_contract.stake(
      { account: contract_owner, transferAmount: transferAmount_2 },  {referral: 0} 
    );
    const exp_bal = Math.floor(1100000 / rate) + 1200000;
    const bal = await sejuno_token.balance(
      {
        "address": contract_owner.account.address,
      }
    );
    console.log("bal after stake => ", bal);
    let amount_bal = parseInt(bal.balance);
    assert.isAtMost(Math.abs(amount_bal-exp_bal), 5000);

    const staking_info_2 = await staking_contract.info();
    assert.notEqual(staking_info_2.info.total_staked, '2300000');
  });
});
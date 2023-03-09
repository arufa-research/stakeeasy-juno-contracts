// Add validators
// Stake amount
// redelegate from second to third
// remove first validator
// verify amounts in all cases
import { use, assert, expect } from "chai";
import { junokitChai, junokitTypes } from "junokit";

import { StakingContractContract } from "../artifacts/typescript_schema/StakingContract";
import { SejunoTokenContract } from "../artifacts/typescript_schema/SejunoToken";
import { BjunoTokenContract } from "../artifacts/typescript_schema/BjunoToken";
import { MockSelectionContract } from "../artifacts/typescript_schema/MockSelection";
import { RewardContractContract } from "../artifacts/typescript_schema/RewardContract";

import { setup } from "./setupContracts";

use(junokitChai);

describe("Redelegate Flow", () => {
  let contract_owner: junokitTypes.UserAccount;
  let runTs: String;
  let sejuno_token: SejunoTokenContract, staking_contract: StakingContractContract;
  let bjuno_token: BjunoTokenContract, validator_info: MockSelectionContract;
  let reward_contract: RewardContractContract;
  before(async () => {
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
    1) Delegate some amount to validator set
  */
  it("Should delegate amount and stake to current validator set", async () => {
    const stakingInfo = await staking_contract.info();
    console.log(stakingInfo, stakingInfo.info.validator_set);
    const transferAmount_2 = [{ "denom": "ujuno", "amount": "1200000" }];
    await staking_contract.stake(
      { account: contract_owner, transferAmount: transferAmount_2 },
      {referral: 0}
    );
    await expect(sejuno_token.balance({
      "address": contract_owner.account.address
    })).to.respondWith({ 'balance': '1200000' });

    await staking_contract.claimAndStake(
      {
        account: contract_owner, customFees: {
          amount: [{ amount: "2250000", denom: "ujuno" }],
          gas: "90000000",
        },
      }
    );

    const stakingInfo2 = await staking_contract.info();
    console.log(stakingInfo2, stakingInfo2.info.validator_set);
  });

  /*
  2) Redelegate from second to third
  */
  it("Should redelegate amount and delete `from` validator", async () => {
    const stakingInfo = await staking_contract.info();
    console.log(stakingInfo, stakingInfo.info.validator_set);

    await staking_contract.redelegate({ account: contract_owner, customFees: {
      amount: [{ amount: "2250000", denom: "ujuno" }],
      gas: "90000000",
    } }, {
      from: stakingInfo.info.validator_set[0].address,
      to: stakingInfo.info.validator_set[1].address
    })

    const stakingInfo2 = await staking_contract.info();
    console.log(stakingInfo2, stakingInfo2.info.validator_set);
  });

  /*
  3) Remove validator
  */
  it("Should remove validator and move amount to next validator", async () => {
    const stakingInfo = await staking_contract.info();
    console.log(stakingInfo, stakingInfo.info.validator_set);

    await staking_contract.removeValidator({ account: contract_owner }, {
      address: stakingInfo.info.validator_set[0].address,
      redelegate: true
    })

    const stakingInfo2 = await staking_contract.info();
    console.log(stakingInfo2, stakingInfo2.info.validator_set);

  });
});
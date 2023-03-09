const { Contract, getAccountByName } = require("junokit");

import { StakingContractContract } from "../artifacts/typescript_schema/StakingContract";

function sleep(seconds: number) {
  console.log("Sleeping for " + seconds + " seconds");
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function run() {
  const contract_owner = getAccountByName("account_0");

  const staking_contract = new StakingContractContract();
  await staking_contract.setUpclient();

  var count = 0;
  while (true) {
    try {
      const customFees = { // custom fees
        amount: [{ amount: "10000", denom: "ujuno" }],
        gas: "500000",
      }
      const advance_res = await staking_contract.claimAndStake(
        { account: contract_owner, customFees: customFees }
      );
      // console.log(JSON.stringify(claim_and_stake_res, null, 2));
    } catch (e) {
      console.log(e);
      console.log("Claim and stake failing, skipping");
    }

    await sleep(60 * 60 * 24); // 4 days 12 minutes
    count += 1;
  }
}

module.exports = { default: run };
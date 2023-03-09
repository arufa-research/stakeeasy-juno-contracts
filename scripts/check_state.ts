import { getAccountByName } from "junokit";
import { StakingContractContract } from "../artifacts/typescript_schema/StakingContract";
import { SejunoTokenContract } from "../artifacts/typescript_schema/SejunoToken";
import { BjunoTokenContract } from "../artifacts/typescript_schema/BjunoToken";
import { RewardContractContract } from "../artifacts/typescript_schema/RewardContract";

function sleep(seconds: number) {
  console.log("Sleeping for " + seconds + " seconds");
  return new Promise(resolve => setTimeout(resolve, seconds*1000));
}

async function run () {
  const runTs = String(new Date());
  const contract_owner = getAccountByName("admin");
  // contract_owner = getAccountByName("account_1");

  console.log("admin account fetched successfully");

  const staking_contract = new StakingContractContract();
  const sejuno_token = new SejunoTokenContract();
  const bjuno_token = new BjunoTokenContract();
  const reward_contract = new RewardContractContract();

  console.log("All contract instance created successfully");

  await staking_contract.setUpclient();
  await sejuno_token.setUpclient();
  await bjuno_token.setUpclient();
  await reward_contract.setUpclient();

  // claim and stake
  const stake_claim_res = await staking_contract.claimAndStake(
    {
      account: contract_owner,
      customFees: {
        amount: [{ amount: "75000", denom: "ujuno" }],
        gas: "3000000",
      },
    }
  );
  console.log(stake_claim_res);

  const c1 = await staking_contract.info();
  console.log("info before deposit: ",c1);

  const sejuno_rate_before_stake = await staking_contract.sejunoExchangeRate();
  console.log("sejuno_rate_before_stake",sejuno_rate_before_stake.sejuno_exchange_rate.rate);
  const bjuno_rate_before_stake = await staking_contract.bjunoExchangeRate();
  console.log("bjuno_rate_before_stake",bjuno_rate_before_stake.bjuno_exchange_rate.rate);

  const sejuno_info = await sejuno_token.tokenInfo();
  console.log("sejuno_info: ", sejuno_info);

  const bjuno_info = await bjuno_token.tokenInfo();
  console.log("bjuno_info: ", bjuno_info);

  // balances
  const sejuno_bal_res = await sejuno_token.balance(
    { address: contract_owner.account.address }
  );
  console.log("sejuno_bal owner: ", sejuno_bal_res.balance);

  const bjuno_bal_res = await bjuno_token.balance(
    { address: contract_owner.account.address }
  );
  console.log("bjuno_bal owner: ", bjuno_bal_res.balance);

  const sejuno_bal_res_1 = await sejuno_token.balance(
    { address: staking_contract.contractAddress }
  );
  console.log("sejuno_bal staking contracts: ", sejuno_bal_res_1.balance);

  const bjuno_bal_res_1 = await bjuno_token.balance(
    { address: staking_contract.contractAddress }
  );
  console.log("bjuno_bal staking contracts: ", bjuno_bal_res_1.balance);

  // // Stake 1.5 junox and get sejuno
  // const deposit_res = await staking_contract.stake(
  //   {
  //     account: contract_owner,
  //     transferAmount: [{"denom": "ujuno", "amount": "25000000"}] // 25 junox
  //   }
  // );
  // console.log(deposit_res);

  // // //stake 1.5 and get bjuno 
  // const deposit_res_bjuno = await staking_contract.stakeForBjuno(
  //   {
  //     account: contract_owner,
  //     transferAmount: [{"denom": "ujuno", "amount": "15000000"}], // 15 junox
  //     customFees: {
  //       amount: [{ amount: "75000", denom: "ujuno" }],
  //       gas: "3000000",
  //     },
  //   }
  // );
  // console.log(deposit_res_bjuno);

  // const c2 = await staking_contract.info();
  // console.log("info just after deposit ",c2);
  
}

module.exports = { default: run };

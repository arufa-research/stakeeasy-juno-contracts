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
  // const validator_info = new MockSelectionContract();
  const reward_contract = new RewardContractContract();

  console.log("All contract instance created successfully");

  await staking_contract.setUpclient();
  await sejuno_token.setUpclient();
  await bjuno_token.setUpclient();
  await reward_contract.setUpclient();
  // await validator_info.setUpclient();

  console.log("Client setup successfully");

  const staking_deploy_response = await staking_contract.deploy(
    contract_owner
    // {
    //   amount: [{ amount: "1300000", denom: "ujuno" }],
    //   gas: "50000000",
    // }
  );
  console.log(staking_deploy_response);

  console.log("staking contract deployed");

  // STAKING CONTRACT INIT
  const staking_contract_info = await staking_contract.instantiate(
    {
      "dev_address": contract_owner.account.address,
      "dev_fee": 5000,  // 5%
      "epoch_period": 3600*24*4 + 10*60,  // 4 days + 10 mins in seconds
      "underlying_coin_denom": "ujuno",
      "unbonding_period": 3600*24*28 + 10*60, // 28 days + 10 mins in seconds
      "reward_denom": "ujuno",
      "er_threshold": 970,
      "peg_recovery_fee": 10,
    },
    `Staking contract ${runTs}`,
    contract_owner
  );
  console.log(staking_contract_info);

  console.log("staking contract instantiated");

  // Reward CONTRACT DEPLOY
  const reward_contract_deploy_res = await reward_contract.deploy(
    contract_owner
    // {
    //   amount: [{amount: "1300000", denom: "ujuno" }],
    //   gas: "50000000"
    // }
  );
  console.log("reward_contract_deploy_res ",reward_contract_deploy_res);

  const reward_contract_instantiate = await reward_contract.instantiate(
    {
      "staking_contract": staking_contract.contractAddress
    },
    `reward contract ${runTs}`,
    contract_owner
  );
  console.log("reward_contract_instantiate ",reward_contract_instantiate);
  
    console.log("reward contract",reward_contract);
  // SEJUNO TOKEN DEPLOY
  const sejuno_deploy_response = await sejuno_token.deploy(
    contract_owner
    // {
    //   amount: [{ amount: "1300000", denom: "ujuno" }],
    //   gas: "35000000",
    // }
  );
  console.log(sejuno_deploy_response);

  console.log("sejuno contract deployed");

  // SEJUNO TOKEN INIT
  const sejuno_token_info = await sejuno_token.instantiate(
    {
      "name": "seJUNO",
      "symbol": "SEJUNO",
      "decimals": 6,
      "initial_balances": [],
      "mint": {minter: staking_contract.contractAddress, cap: null},
      "marketing": null,
    },
    `seJUNO token ${runTs}`,
    contract_owner
  );
  console.log(sejuno_token_info);

  console.log("sejuno contract instantiated");

  // BJUNO TOKEN DEPLOY
  const bjuno_deploy_response = await bjuno_token.deploy(
    contract_owner
    // {
    //   amount: [{ amount: "1300000", denom: "ujuno" }],
    //   gas: "35000000",
    // }
  );
  console.log(bjuno_deploy_response);

  console.log("bjuno contract deployed");

  // BJUNO TOKEN INIT
  const bjuno_token_info = await bjuno_token.instantiate(
    {
      "name": "bJUNO",
      "symbol": "BJUNO",
      "decimals": 6,
      "initial_balances": [],
      "mint": {minter: staking_contract.contractAddress, cap: null},
      "marketing": null,
      "reward_contract_addr": reward_contract.contractAddress
    },
    `bJUNO token ${runTs}`,
    contract_owner
  );
  console.log(bjuno_token_info);

  console.log("bjuno contract instantiated");

  // Add 5 validators to staking contract
  const validator_list = [
    "junovaloper1dru5985k4n5q369rxeqfdsjl8ezutch8mc6nx9",
    "junovaloper17skjxhtt54prnpxcs7a5rv9znlldpe5k3x99gp"
  ];
  for (const val_addr of validator_list) {
    await staking_contract.addValidator(
      {
        account: contract_owner
      },
      {
        address: val_addr
      }
    );
    console.log("Added validator: ", val_addr);
  }

  // ADD SEJUNO addr to STAKING CONTRACT's CONFIG
  const sejuno_update_res = await staking_contract.updateSejunoAddr(
    {
      account: contract_owner
    },
    {
      address: sejuno_token.contractAddress
    }
  );
  console.log(sejuno_update_res);

  console.log("sejuno contract address updated in staking contract");

  // ADD BJUNO addr to STAKING CONTRACT's CONFIG
  const bjuno_update_res = await staking_contract.updateBjunoAddr(
    {
      account: contract_owner
    },
    {
      address: bjuno_token.contractAddress
    }
  );
  console.log(bjuno_update_res);

  console.log("bjuno contract address updated in staking contract");

  // ADD BJUNO addr to STAKING CONTRACT's CONFIG
  const reward_update_res = await staking_contract.updateRewardsAddr(
    {
      account: contract_owner
    },
    {
      address: reward_contract.contractAddress
    }
  );
  console.log(reward_update_res);

  const reward_bjuno_res = await reward_contract.updateBjunoAddr(
    {
      account: contract_owner
    },
    {
      address: bjuno_token.contractAddress
    }
  );
  console.log(reward_bjuno_res);

  console.log("reward contract address updated in staking contract");

  const c1 = await staking_contract.info();
  console.log("info before deposit ",c1);

  const sejuno_rate_before_stake = await staking_contract.sejunoExchangeRate();
  console.log("sejuno_rate_before_stake",sejuno_rate_before_stake.sejuno_exchange_rate.rate);
  const bjuno_rate_before_stake = await staking_contract.bjunoExchangeRate();
  console.log("bjuno_rate_before_stake",bjuno_rate_before_stake.bjuno_exchange_rate.rate);

  // // Stake 1.5 junox and get sejuno
  // const deposit_res = await staking_contract.stake(
  //   {
  //     account: contract_owner,
  //     transferAmount: [{"denom": "ujuno", "amount": "25000000"}] // 25 junox
  //   }
  // );
  // console.log(deposit_res);

  // const sejuno_rate_after_stake = await staking_contract.sejunoExchangeRate();
  // console.log("sejuno_rate_after_stake",sejuno_rate_after_stake.sejuno_exchange_rate.rate);
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

  // const bjuno_rate_after_stake = await staking_contract.bjunoExchangeRate();
  // console.log("rate_after_stake",bjuno_rate_after_stake.bjuno_exchange_rate.rate);

  // const c2 = await staking_contract.info();
  // console.log("info just after deposit ",c2);

  // // claim and stake
  // const stake_claim_res = await staking_contract.claimAndStake(
  //   {
  //     account: contract_owner,
  //     customFees: {
  //       amount: [{ amount: "75000", denom: "ujuno" }],
  //       gas: "3000000",
  //     },
  //   }
  // );
  // console.log(stake_claim_res);

  // const sejuno_rate_after_claimstake = await staking_contract.sejunoExchangeRate();
  // console.log("sejuno_rate_after_claimstake",sejuno_rate_after_claimstake.sejuno_exchange_rate.rate);

  // const c3 = await staking_contract.info();
  // console.log("info after claim and stake deposit ",c3);
/*
  const unstaking_res = await sejuno_token.send(
    {
      account: contract_owner
    },
    {
      amount: "1500000",
      contract: staking_contract.contractAddress,
      msg: ""
    }
  );
  console.log(unstaking_res);

  const c4 = await staking_contract.info();
  console.log("info after sending sejuno deposit ",c4);

  const sejuno_rate = await staking_contract.sejuno_exchange_rate();
  console.log("sejuno_rate after sending sejuno to contract",sejuno_rate.sejuno_exchange_rate.rate);
  let amount = sejuno_rate.sejuno_exchange_rate.rate * 1500000;
  console.log("amount",amount);

  // advance withdraw window
  const adv_window_res = await staking_contract.advance_window(
    {
      account: contract_owner,
      customFees: {
        amount: [{ amount: "75000", denom: "ujuno" }],
        gas: "3000000",
      },
    }
  );
  console.log(adv_window_res);

  for(let i=0;i<7;i++){

    const sejuno_res = await staking_contract.sejuno_exchange_rate();
    console.log("sejuno rate after advance window calls",sejuno_res.sejuno_exchange_rate.rate);

    const info_query = await staking_contract.info();
    console.log("info after claim ",info_query);

    console.log("sleeping ",i);
    await sleep(20);
    await staking_contract.advance_window(
      {
        account: contract_owner,
        customFees: {
          amount: [{ amount: "75000", denom: "ujuno" }],
          gas: "3000000",
        },
      }
    );

  }

  const c5 = await staking_contract.info();
  console.log("info after advance window call ",c5);

  const claim_res = await staking_contract.claim(
    {account: contract_owner}
  );
  console.log(claim_res);

  const c6 = await staking_contract.info();
  console.log("info after claim ",c6);

  const user_claimable_res = await staking_contract.user_claimable(
    {address: contract_owner.account.address}
  );
  console.log("user_claimable_res.claimable.claimable_amount ",user_claimable_res.claimable.claimable_amount);

  const sejuno_res = await staking_contract.sejuno_exchange_rate();
  console.log(sejuno_res);

  const bjuno_res = await staking_contract.bjuno_exchange_rate();
  console.log(bjuno_res);

  const info_response = await staking_contract.info();
  console.log(info_response);
  
  // console.log(info_response.info.validator_set);
*/
  
}

module.exports = { default: run };
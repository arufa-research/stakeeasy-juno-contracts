import { getAccountByName, junokitTypes }  from "junokit";

import { BjunoTokenMigrateContract } from "../artifacts/typescript_schema/BjunoTokenMigrate";
import { StakingContractMigrateContract } from "../artifacts/typescript_schema/StakingContractMigrate";

export async function setupMigrate(
): Promise<any> {
  const runTs: string = String(new Date());
  const contract_owner: junokitTypes.UserAccount = getAccountByName("admin");

  console.log("admin account fetched successfully");

  const bjuno_migrate_contract: BjunoTokenMigrateContract = new BjunoTokenMigrateContract();
  const staking_migrate_contract: StakingContractMigrateContract = new StakingContractMigrateContract();

  console.log("All contract instance created successfully");

  await bjuno_migrate_contract.setUpclient();
  await staking_migrate_contract.setUpclient();

  console.log("Client setup successfully");

  /*
   * Deploy all contracts
   */
  const bjuno_migrate_deploy = await bjuno_migrate_contract.deploy(
    contract_owner,
    {
      amount: [{ amount: "2250000", denom: "ujuno" }],
      gas: "90000000",
    }
  );
  console.log("bjuno migrate contract deployed ", bjuno_migrate_deploy);

  const staking_migrate_deploy = await staking_migrate_contract.deploy(
    contract_owner,
    {
      amount: [{ amount: "2250000", denom: "ujuno" }],
      gas: "90000000",
    }
  );
  console.log("staking migrate contract deployed ", staking_migrate_deploy);

  return {
    runTs, contract_owner,
    bjuno_migrate_contract, staking_migrate_contract
  }
}
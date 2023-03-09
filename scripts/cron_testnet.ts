const { Contract, getAccountByName } = require("junokit");

import { StakingContractContract } from "../artifacts/typescript_schema/StakingContract";

function sleep(seconds: number) {
  console.log("Sleeping for " + seconds + " seconds");
  return new Promise(resolve => setTimeout(resolve, seconds*1000));
}

async function run () {
    const contract_owner = getAccountByName("account_0");

    const staking_contract = new StakingContractContract();
    await staking_contract.setUpclient();

    while(true) {
    // compounding txn
    try {
        const claim_and_stake_res = await staking_contract.claimAndStake(
            {
                account: contract_owner,
                customFees: {
                    amount: [{ amount: "2250000", denom: "ujuno" }],
                    gas: "90000000",
                },
            }
        );
        // console.log(JSON.stringify(claim_and_stake_res, null, 2));
    } catch(e) {
        console.log(e);
        await sleep(10);
        try {
            const claim_and_stake_res = await staking_contract.claimAndStake(
                {
                    account: contract_owner,
                    customFees: {
                    amount: [{ amount: "2250000", denom: "ujuno" }],
                    gas: "90000000",
                    },
                }
            );
            // console.log(JSON.stringify(claim_and_stake_res, null, 2));
        } catch(e) {
            console.log(e);
            await sleep(10);
            try {
                const claim_and_stake_res = await staking_contract.claimAndStake(
                    {
                        account: contract_owner,
                        customFees: {
                            amount: [{ amount: "2250000", denom: "ujuno" }],
                            gas: "90000000",
                        },
                    }
                );
                // console.log(JSON.stringify(claim_and_stake_res, null, 2));
            } catch {
                console.log("Claim and stake failing, skipping");
            }
        }
    }

    // advance window txn
    try {
        const adv_window_res = await staking_contract.advanceWindow(
            {
                account: contract_owner,
                customFees: {
                    amount: [{ amount: "2250000", denom: "ujuno" }],
                    gas: "90000000",
                },
            }
        );
        // console.log(JSON.stringify(adv_window_res, null, 2));
    } catch(e) {
        console.log(e);
        await sleep(10);
        try {
            const adv_window_res = await staking_contract.advanceWindow(
                {
                    account: contract_owner,
                    customFees: {
                        amount: [{ amount: "2250000", denom: "ujuno" }],
                        gas: "90000000",
                    },
                }
            );
            // console.log(JSON.stringify(adv_window_res, null, 2));
        } catch(e) {
            console.log(e);
            await sleep(10);
            try {
                const adv_window_res = await staking_contract.advanceWindow(
                    {
                        account: contract_owner,
                        customFees: {
                            amount: [{ amount: "2250000", denom: "ujuno" }],
                            gas: "90000000",
                        },
                    }
                );
                // console.log(JSON.stringify(adv_window_res, null, 2));
            } catch {
                console.log("Advance window failing, skipping");
            }
        }
    }

    await sleep(3600*24*4); // 4 days
    }
}

module.exports = { default: run };
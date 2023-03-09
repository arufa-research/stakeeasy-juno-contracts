// TODO : Check on Exchange rate
// UDIT
import { use, assert, expect }  from "chai";
import { junokitChai, junokitTypes, getLogs }  from "junokit";

import { StakingContractContract } from "../artifacts/typescript_schema/StakingContract";
import { SejunoTokenContract } from "../artifacts/typescript_schema/SejunoToken";
import { BjunoTokenContract } from "../artifacts/typescript_schema/BjunoToken";
import { MockSelectionContract } from "../artifacts/typescript_schema/MockSelection";
import { RewardContractContract } from "../artifacts/typescript_schema/RewardContract";

import { setup } from "./setupContracts";

use(junokitChai);

describe("Withdraw Flow", () => {
    let contract_owner: junokitTypes.UserAccount;
    let account_1: junokitTypes.UserAccount;
    let account_2: junokitTypes.UserAccount;
    let runTs: String;
    let sejuno_token: SejunoTokenContract, staking_contract: StakingContractContract;
    let bjuno_token: BjunoTokenContract, validator_info: MockSelectionContract;
    let reward_contract: RewardContractContract;
    let window_time: number, unbonding_time: number;
    before(async () => {
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

    afterEach(async () => {
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

    function sleep(seconds:number) {
        console.log("Sleeping for " + seconds + " seconds");
        return new Promise(resolve => setTimeout(resolve, seconds * 1000));
    }

    /*
        1)   With 0 deposit
            -query info (variables should be as expected)
    */
    it("Claim should be 0 with 0 seJuno unstaking", async () => {
        await sleep(20);
        await staking_contract.advanceWindow(
            { account: contract_owner }
        );
        await expect(
            staking_contract.userClaimable(
                { "address": contract_owner.account.address }
            )
        ).to.respondWith({ claimable: { claimable_amount: '0' } });
        await staking_contract.claim(
            { account: contract_owner },
        );
        const staking_info = await staking_contract.info();
        assert.equal(staking_info.info.admin, contract_owner.account.address);
        assert.equal(staking_info.info.sejuno_in_contract, '0');
        assert.equal(staking_info.info.juno_under_withdraw, '0');
    });

    /*
        2) User should be able to deposit even during their unbonding period
            -deposit juno
            -withdraw juno(send sejuno to contract)
            -Advance window called
            -Deposit again(Should work fine)
     */
    it("Should be able to Stake during unbonding period", async () => {
        const transferAmount_2 = [{ "denom": "ujuno", "amount": "1200000" }];
        await staking_contract.stake(
            { account: contract_owner, transferAmount: transferAmount_2 },
            {referral: 0}
        );
        await staking_contract.claimAndStake(
            { account: contract_owner }
        );
        const balance_res = await sejuno_token.balance({
            "address": contract_owner.account.address,
        });
        const transferAmount_sejuno = balance_res.balance;
        console.log("send amount ", transferAmount_sejuno);
        await sejuno_token.send(
            { 
                account: contract_owner,
                customFees: {
                    amount: [{ amount: "500000", denom: "ujuno" }],
                    gas: "1000000",
                }
            },
            {
                amount: transferAmount_sejuno,
                contract: staking_contract.contractAddress,
                msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
            }
        );
        await expect(sejuno_token.balance({
            "address": contract_owner.account.address,
        })).to.respondWith({ 'balance': '0' });

        await staking_contract.advanceWindow(
            { 
                account: contract_owner,
                customFees: {
                    amount: [{ amount: "500000", denom: "ujuno" }],
                    gas: "1000000",
                }
            }
        );
        await staking_contract.stake(
            { account: contract_owner, transferAmount: transferAmount_2 },
            {referral: 0}
        );
        await expect(sejuno_token.balance({
            "address": contract_owner.account.address,
        })).to.respondWith({ 'balance': '1200000' });

        // do 7 advance window after prev adv window
        // after 7th advance window (total 8th) is done,
        // prev window will be matured and claimable
        for (let idx = 0; idx < 7; idx++) {
            await sleep(window_time);
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
        const claimable = await staking_contract.userClaimable(
            { "address": contract_owner.account.address }
        );
        const claimable_amount = claimable.claimable.claimable_amount;
        assert.isAtLeast(parseInt(claimable_amount), 1200000);

        await staking_contract.claim(
            { account: contract_owner },
        );
        const staking_info_3 = await staking_contract.info();
        assert.equal(staking_info_3.info.admin, contract_owner.account.address);
        assert.equal(staking_info_3.info.sejuno_in_contract, '0');
        assert.equal(staking_info_3.info.juno_under_withdraw, '0');
    });

    /*
        3) Without advance window call claimable amount should be zero
            -deposit
            -claim_and_stake
            -withdraw
            -check claimbale amount(Should be zero)
    */
    it("Claim without advance_window Call", async () => {
        const transferAmount_2 = [{ "denom": "ujuno", "amount": "1100000" }];
        await staking_contract.stake(
            { account: contract_owner, transferAmount: transferAmount_2 },
            {referral: 0}
        );
        await staking_contract.claimAndStake(
            { account: contract_owner }
        );
        const balance_res = await sejuno_token.balance({
            "address": contract_owner.account.address,
        });

        const transferAmount_sejuno = balance_res.balance;
        await sejuno_token.send(
            { 
                account: contract_owner,
                customFees: {
                    amount: [{ amount: "500000", denom: "ujuno" }],
                    gas: "1000000",
                }
            },
            {
                amount: transferAmount_sejuno,
                contract: staking_contract.contractAddress,
                msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
            }
        );

        const claimable_res = await staking_contract.userClaimable(
            { "address": contract_owner.account.address }
        );
        const claimable_amount = claimable_res.claimable.claimable_amount;
        assert.equal(parseInt(claimable_amount), 0);
        const claim_res = await staking_contract.claim(
            { account: contract_owner },
        );
    });

    /*
        4) trying to send sejuno to contract with 0 balance
            -should fail
    */
    it("Without depositing making request for unstaking", async () => {
        const staking_info_1 = await staking_contract.info();
        console.log(staking_info_1);
        const balance_res = await sejuno_token.balance({
            "address": contract_owner.account.address,
        });
        console.log(balance_res);

        const transferAmount_sejuno = "1100000";
        await expect(sejuno_token.send(
            { 
                account: contract_owner,
                customFees: {
                    amount: [{ amount: "500000", denom: "ujuno" }],
                    gas: "1000000",
                }
            },
            {
                amount: transferAmount_sejuno,
                contract: staking_contract.contractAddress,
                msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
            }
        )).to.be.revertedWith('insufficient funds');    // confirm the error here-----------
        // TODO: check
        // Got error: failed to execute message; message index: 0: Overflow: Cannot Sub with 0 and 1100000: execute wasm contract failed
    });

    /*
        5) Happy flow
            -stake
            -claim_and_stake
            -send(withdraw)
            -advance window
            -claim(after waiting)
     */
    it("Check Withdrawal with a Happy flow", async () => {
        const transferAmount_2 = [{ "denom": "ujuno", "amount": "12000000" }];
        await staking_contract.stake(
            { account: contract_owner, transferAmount: transferAmount_2 },
            {referral: 0}
        );
        await staking_contract.claimAndStake(
            { account: contract_owner }
        );
        const balance_res = await sejuno_token.balance({
            "address": contract_owner.account.address,
        });
        const transferAmount_sejuno = balance_res.balance;
        console.log("send amount ", transferAmount_sejuno);
        await sejuno_token.send(
            { 
                account: contract_owner,
                customFees: {
                    amount: [{ amount: "500000", denom: "ujuno" }],
                    gas: "1000000",
                }
            },
            {
                amount: transferAmount_sejuno,
                contract: staking_contract.contractAddress,
                msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
            }
        );
        await expect(sejuno_token.balance({
            "address": contract_owner.account.address,
        })).to.respondWith({ 'balance': '0' });

        await staking_contract.advanceWindow(
            { 
                account: contract_owner,
                customFees: {
                    amount: [{ amount: "500000", denom: "ujuno" }],
                    gas: "1000000",
                }
            }
        );
        await staking_contract.stake(
            { account: contract_owner, transferAmount: transferAmount_2 },
            {referral: 0}
        );
        await expect(sejuno_token.balance({
            "address": contract_owner.account.address,
        })).to.respondWith({ 'balance': '12000000' });

        // do 7 advance window after prev adv window
        // after 7th advance window (total 8th) is done,
        // prev window will be matured and claimable
        for (let idx = 0; idx < 7; idx++) {
            await sleep(window_time);
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
        const claimable_res = await staking_contract.userClaimable(
            { "address": contract_owner.account.address }
        );
        const claimable_amount = claimable_res.claimable.claimable_amount;
        assert.isAtLeast(parseInt(claimable_amount), 12000000);

        await contract_owner.setupClient();
        const juno_balance_before = Number((await contract_owner.getBalance("ujuno")).amount);
        await staking_contract.claim(
            { 
                account: contract_owner,
                customFees: {
                    amount: [{ amount: "500000", denom: "ujuno" }],
                    gas: "1000000",
                }
            }
        );
        const juno_balance_after = Number((await contract_owner.getBalance("ujuno")).amount);
        assert.isAtLeast(juno_balance_after-juno_balance_before, 12000000-500000);
        const staking_info_3 = await staking_contract.info();
        assert.equal(staking_info_3.info.admin, contract_owner.account.address);
        assert.equal(staking_info_3.info.sejuno_in_contract, '0');
        assert.equal(staking_info_3.info.juno_under_withdraw, '0');
    });

    /*
        6) Checking withdraw if claim_and_stake not called
            -Deposit
            -claim_and_stake
            -deposit again
            -Advance window call(without claim_and_stake)
            -claim(Should be as expected by user)
    */
    it("Double deposit and claim_stake not called after second deposit", async () => {
        const transferAmount_2 = [{ "denom": "ujuno", "amount": "1100000" }];
        await staking_contract.stake(
            { account: contract_owner, transferAmount: transferAmount_2 },
            {referral: 0}
        );
        await staking_contract.claimAndStake(
            { account: contract_owner }
        );
        const transferAmount_3 = [{ "denom": "ujuno", "amount": "1200000" }];
        await staking_contract.stake(
            { account: contract_owner, transferAmount: transferAmount_3 },
            {referral: 0}
        );
        const balance_after_two_deposit = await sejuno_token.balance({
            "address": contract_owner.account.address,
        });
        
        const transferAmount_sejuno = balance_after_two_deposit.balance;
        await sejuno_token.send(
            { 
                account: contract_owner,
                customFees: {
                    amount: [{ amount: "500000", denom: "ujuno" }],
                    gas: "1000000",
                }
            },
            {
                amount: transferAmount_sejuno,
                contract: staking_contract.contractAddress,
                msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
            }
        );

        const query_window_1 = await staking_contract.window();
        console.log("query window 1 => ", query_window_1);

        await expect(sejuno_token.balance({
            "address": contract_owner.account.address,
        })).to.respondWith({ 'balance': '0' });

        const staking_info_2 = await staking_contract.info();
        console.log("info: ", staking_info_2);
        assert.isAtLeast(parseInt(staking_info_2.info.total_staked), 2300000);  /////////////////check again

        // TODO: check this later in contract
        // assert.equal(staking_info_2.info.sejuno_in_contract, transferAmount_sejuno);
        assert.equal(staking_info_2.info.juno_under_withdraw, '0');

        // do 7 advance window after prev adv window
        // after 7th advance window (total 8th) is done,
        // prev window will be matured and claimable
        for (let idx = 0; idx < 7; idx++) {
            await sleep(window_time);

            const undelegations_res = await staking_contract.undelegations({
                "address": contract_owner.account.address
            });
            console.log("Pending:  ", undelegations_res.pending_claims.pending);

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

        const claimable = await staking_contract.userClaimable(
            { "address": contract_owner.account.address }
        );
        const claimable_amount = claimable.claimable.claimable_amount;
        assert.isAtLeast(parseInt(claimable_amount), 2300000);

        await staking_contract.claim(
            { account: contract_owner },
        );
        const staking_info_3 = await staking_contract.info();
        assert.equal(staking_info_3.info.admin, contract_owner.account.address);
        assert.equal(staking_info_3.info.sejuno_in_contract, '0');
        assert.equal(staking_info_3.info.juno_under_withdraw, '0');
    });

    /*
        7) Sending more sejuno than in balance
            -should fail
    */
    it("Sending more sejuno than in balance", async () => {
        const transferAmount_2 = [{ "denom": "ujuno", "amount": "1200000" }];
        await staking_contract.stake(
            { account: contract_owner, transferAmount: transferAmount_2 },
            {referral: 0}
        );
        await staking_contract.claimAndStake(
            { account: contract_owner }
        );
        const transferAmount_sejuno = "30000000";
        await expect(sejuno_token.send(
            { 
                account: contract_owner,
                customFees: {
                    amount: [{ amount: "500000", denom: "ujuno" }],
                    gas: "1000000",
                }
            },
            {
                amount: transferAmount_sejuno,
                contract: staking_contract.contractAddress,
                msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
            }
        )).to.be.revertedWith('insufficient funds');
        // TODO: geeting different error
        // failed to execute message; message index: 0: Overflow: Cannot Sub with 1200000 and 30000000: execute wasm contract failed
    });

    /*
        8) Sending less sejuno than limit to withdraw
            -should fail
    */
    it("unstaking less sejuno than limit", async () => {
        const transferAmount_2 = [{ "denom": "ujuno", "amount": "1200000" }];
        await staking_contract.stake(
            { account: contract_owner, transferAmount: transferAmount_2 },
            {referral: 0}
        );
        await staking_contract.claimAndStake(
            { account: contract_owner }
        );
        const transferAmount_sejuno = "8000";

        await expect(sejuno_token.send(
            { 
                account: contract_owner,
                customFees: {
                    amount: [{ amount: "500000", denom: "ujuno" }],
                    gas: "1000000",
                }
            },
            {
                amount: transferAmount_sejuno,
                contract: staking_contract.contractAddress,
                msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
            }
        )).to.be.revertedWith('Amount withdrawn below minimum of 10000 usejuno');
    });

    // **********NEED TWO ACCOUNTS************

    /*
        9) Two users partial withdraw seJUNO
            - first user deposit
            - second user deposit
            - first user withdraws some part of seJUNO
            - second user withdraws some part of seJUNO
            - claim for first user
            - claim for second user
            - both withdraws in the same window
    */
    it("Two User partial withdraw-Test", async () => {
        // First user desposits
        const transferAmount_1 = [{ "denom": "ujuno", "amount": "4000000" }];
        await staking_contract.stake(
            { account: contract_owner, transferAmount: transferAmount_1 },
            {referral: 0}
        );
        await staking_contract.claimAndStake(
            { account: contract_owner }
        );

        // Second user deposits
        const transferAmount_2 = [{ "denom": "ujuno", "amount": "2000000" }];
        await staking_contract.stake(
            { account: account_1, transferAmount: transferAmount_2 },
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

        // First user withdraws some portion of seJUNO
        await sejuno_token.send(
            { 
                account: contract_owner,
                customFees: {
                    amount: [{ amount: "500000", denom: "ujuno" }],
                    gas: "1000000",
                }
            },
            { 
                amount: "2000000", 
                contract: staking_contract.contractAddress,
                msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
            }
        );

        // Second user withdraws some portion of seJUNO
        await sejuno_token.send(
            { 
                account: account_1,
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

        const exchange_rate_1 = await staking_contract.sejunoExchangeRate();
        let rate_1 = parseFloat(exchange_rate_1.sejuno_exchange_rate.rate);
        console.log("exchange_rate_1: ", rate_1);
        const user_1_juno_amount = Math.floor(rate_1 * 2000000);
        const user_2_juno_amount = Math.floor(rate_1 * 1000000);

        // do 7 advance window after prev adv window
        // after 7th advance window (total 8th) is done,
        // prev window will be matured and claimable
        for (let idx = 0; idx < 7; idx++) {
            await sleep(window_time);

            const undelegations_res = await staking_contract.undelegations({
                "address": contract_owner.account.address
            });
            console.log("Pending:  ", undelegations_res.pending_claims.pending);

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

        const user_1_claimable = await staking_contract.userClaimable(
            { "address": contract_owner.account.address }
        );
        await staking_contract.claim(
            { account: contract_owner },
        )
        const user_1_claimable_amount = user_1_claimable.claimable.claimable_amount;
        console.log("(user_1_claimable_amount - user_1_juno_amount) => ", (user_1_claimable_amount - user_1_juno_amount));
        assert.isAtMost((user_1_claimable_amount - user_1_juno_amount), 10000);

        console.log("user_2_juno_amount should be=> ", user_2_juno_amount);
        const user_2_claimable = await staking_contract.userClaimable(
            { "address": account_1.account.address }
        );
        const user_2_claimable_amount = user_2_claimable.claimable.claimable_amount;
        console.log("(user_2_claimable_amount - user_2_juno_amount) => ", (user_2_claimable_amount - user_2_juno_amount));
        await staking_contract.claim(
            { account: account_1 }
        )
        assert.isAtMost((user_2_claimable_amount - user_2_juno_amount), 10000);
        // xrate after both partial withdraw
        const XR_BPW = await staking_contract.sejunoExchangeRate();
        let XR_after_both_partial_withdraw = parseFloat(XR_BPW.sejuno_exchange_rate.rate);
        console.log("exchange_rate_3: ", XR_after_both_partial_withdraw);
        assert.isAtLeast(XR_after_both_partial_withdraw, rate_1);
    });

    /*
        10) Two users fully withdraw seJUNO
            - first user deposit
            - second user deposit
            - first user withdraws all of seJUNO
            - second user withdraws all of seJUNO
            - claim for first user
            - claim for second user
            - both withdraws in different window
    */
    it("Two User FULL withdraw-Test", async () => {
        // First user desposits
        const transferAmount_1 = [{ "denom": "ujuno", "amount": "4000000" }];
        await staking_contract.stake(
            { account: contract_owner, transferAmount: transferAmount_1 },
            {referral: 0}
        );
        await staking_contract.claimAndStake(
            { account: contract_owner }
        );

        const balance_res = await sejuno_token.balance({
            "address": contract_owner.account.address,
        });
        const owner_sejuno = balance_res.balance;

        // Second user deposits
        const transferAmount_2 = [{ "denom": "ujuno", "amount": "2000000" }];
        await staking_contract.stake(
            { account: account_1, transferAmount: transferAmount_2 },
            {referral: 0}
        );
        await staking_contract.claimAndStake(
            { account: contract_owner }
        );

        const balance_res_1 = await sejuno_token.balance({
            "address": account_1.account.address,
        });
        const account_1_sejuno = balance_res_1.balance;

        // First user withdraws some portion of seJUNO
        await sejuno_token.send(
            { 
                account: contract_owner,
                customFees: {
                    amount: [{ amount: "500000", denom: "ujuno" }],
                    gas: "1000000",
                }
            },
            { 
                amount: owner_sejuno, 
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

        // Second user withdraws some portion of seJUNO
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

        const exchange_rate_1 = await staking_contract.sejunoExchangeRate();
        let rate_1 = parseFloat(exchange_rate_1.sejuno_exchange_rate.rate);
        console.log("exchange_rate_1: ", rate_1);
        const user_1_juno_amount = Math.floor(rate_1 * owner_sejuno);
        const user_2_juno_amount = Math.floor(rate_1 * account_1_sejuno);

        // do 7 advance window after prev adv window
        // after 7th advance window (total 8th) is done,
        // prev window will be matured and claimable
        for (let idx = 0; idx < 7; idx++) {
            await sleep(window_time);

            const undelegations_res = await staking_contract.undelegations({
                "address": contract_owner.account.address
            });
            console.log("Pending:  ", undelegations_res.pending_claims.pending);

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

        const user_1_claimable = await staking_contract.userClaimable(
            { "address": contract_owner.account.address }
        );
        await staking_contract.claim(
            { account: contract_owner },
        )
        const user_1_claimable_amount = user_1_claimable.claimable.claimable_amount;
        console.log("(user_1_claimable_amount - user_1_juno_amount) => ", (user_1_claimable_amount - user_1_juno_amount));
        assert.isAtMost((user_1_claimable_amount - user_1_juno_amount), 20000);

        console.log("user_2_juno_amount should be=> ", user_2_juno_amount);
        const user_2_claimable = await staking_contract.userClaimable(
            { "address": account_1.account.address }
        );
        const user_2_claimable_amount = user_2_claimable.claimable.claimable_amount;
        console.log("(user_2_claimable_amount - user_2_juno_amount) => ", (user_2_claimable_amount - user_2_juno_amount));
        await staking_contract.claim(
            { account: account_1 }
        )
        assert.isAtMost((user_2_claimable_amount - user_2_juno_amount), 20000);
    });
})
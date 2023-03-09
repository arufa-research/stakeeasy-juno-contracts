use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use cosmwasm_std::{Decimal, Uint128};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct InstantiateMsg {
    pub staking_contract: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum ExecuteMsg {
    ////////////////////
    /// Owner's operations
    ///////////////////

    /// Update the global index
    UpdateGlobalIndex {},

    ////////////////////
    /// bAsset's operations
    ///////////////////

    /// Increase user staking balance
    /// Withdraw rewards to pending rewards
    /// Set current reward index to global index
    IncreaseBalance { address: String, amount: Uint128 },
    /// Decrease user staking balance
    /// Withdraw rewards to pending rewards
    /// Set current reward index to global index
    DecreaseBalance { address: String, amount: Uint128 },

    ////////////////////
    /// User's operations
    ///////////////////

    /// return the accrued reward in juno to the user.
    Claim { recipient: Option<String> },

    WhitelistClaim {
        contract_address: String,
        recipient: Option<String>
    },

    UpdateBjunoAddr {address: String},

    AddToWhitelist {address: String},
    RemoveFromWhitelist {address: String},
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum QueryMsg {
    Config {},
    State {},
    AccruedRewards {
        address: String,
    },
    Holder {
        address: String,
    },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct ConfigResponse {
    pub staking_contract: String,
    pub bjuno_contract: Option<String>
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct StateResponse {
    pub global_index: Decimal,
    pub total_balance: Uint128,
    pub prev_reward_balance: Uint128,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct AccruedRewardsResponse {
    pub rewards: Uint128,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct HolderResponse {
    pub address: String,
    pub balance: Uint128,
    pub index: Decimal,
    pub pending_rewards: Decimal,
    pub is_whitelisted: bool,
}

// NOT IMPLEMENTED HOLDER_RESPONSE FOR ALL HOLDERS AT ONCE
// #[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
// pub struct HoldersResponse {
//     pub holders: Vec<HolderResponse>,
// }

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct MigrateMsg {}

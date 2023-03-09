#[cfg(not(feature = "library"))]
use cosmwasm_std::entry_point;

use cw2::set_contract_version;
use cosmwasm_std::{
    to_binary, Binary, Decimal, Deps, DepsMut,
    Env, MessageInfo, Response, StdResult, Uint128, StdError,
};

use crate::claim::{
    try_claim_simple_rewards, try_increase_balance,
    try_decrease_balance, query_accrued_rewards, try_whitelist_claim_rewards
};
use crate::error::{ContractError, self};
use crate::global::try_update_global_index;
use crate::msg::{ExecuteMsg, InstantiateMsg, QueryMsg, ConfigResponse, StateResponse};

use crate::state::{
    State, Config, store_config, store_state,
    read_config, read_state, query_holder, read_holder, store_holder
};

// version info for migration info
const CONTRACT_NAME: &str = "stake-easy-rewards";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    let config = Config {
        admin: info.sender,
        staking_contract: deps.api.addr_canonicalize(&msg.staking_contract)?,
        bjuno_contract: None,
        whitelisted_contracts: vec![],
    };

    store_config(deps.storage, &config)?;
    store_state(
        deps.storage,
        &State {
            global_index: Decimal::zero(),
            total_balance: Uint128::zero(),
            prev_reward_balance: Uint128::zero(),
        },
    )?;

    Ok(Response::default())
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        //giving option to user to send rewards to other addresses
        ExecuteMsg::Claim { recipient } => {
            try_claim_simple_rewards(deps, env, info, recipient)
        },
        ExecuteMsg::WhitelistClaim { contract_address, recipient } => {
            try_whitelist_claim_rewards(deps, env, info, contract_address, recipient)
        },
        //staking contract will update global index
        ExecuteMsg::UpdateGlobalIndex {} => {
            try_update_global_index(deps, env, info)
        },

        //token balance change will inc and dec balance
        ExecuteMsg::IncreaseBalance { address, amount } => {
            try_increase_balance(deps, env, info, address, amount)
        }
        ExecuteMsg::DecreaseBalance { address, amount } => {
            try_decrease_balance(deps, env, info, address, amount)
        }

        ExecuteMsg::UpdateBjunoAddr {address} => {
            try_update_bjuno_addr(deps, env, info, address)
        }

        ExecuteMsg::AddToWhitelist {address} => {
            try_add_to_whitelist(deps, env, info, address)
        }
        ExecuteMsg::RemoveFromWhitelist {address} => {
            try_remove_from_whitelist(deps, env, info, address)
        }
    }
}

pub fn try_update_bjuno_addr(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    address: String,
) -> Result<Response, ContractError> {
    let mut config = read_config(deps.storage)?;
    if info.sender != config.admin {
        return Err(error::ContractError::Std(StdError::generic_err("unauthorized")));
    }
    config.bjuno_contract = Some(deps.api.addr_canonicalize(&address)?);
    store_config(deps.storage, &config)?;
    let res = Response::default();
    Ok(res)
}

pub fn try_add_to_whitelist(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    address: String,
) -> Result<Response, ContractError> {
    let config = read_config(deps.storage)?;
    if info.sender != config.admin {
        return Err(error::ContractError::Std(StdError::generic_err("unauthorized")));
    }
    let address_raw = deps.api.addr_canonicalize(&address)?;

    let mut holder = read_holder(deps.storage, &address_raw)?;
    holder.is_whitelisted = true;
    store_holder(deps.storage, &address_raw, &holder)?;

    let res = Response::default();
    Ok(res)
}

pub fn try_remove_from_whitelist(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    address: String,
) -> Result<Response, ContractError> {
    let config = read_config(deps.storage)?;
    if info.sender != config.admin {
        return Err(error::ContractError::Std(StdError::generic_err("unauthorized")));
    }
    let address_raw = deps.api.addr_canonicalize(&address)?;

    let mut holder = read_holder(deps.storage, &address_raw)?;
    holder.is_whitelisted = false;
    store_holder(deps.storage, &address_raw, &holder)?;

    let res = Response::default();
    Ok(res)
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(
    deps: Deps,
    _env: Env,
    msg: QueryMsg,
) -> StdResult<Binary> {
    match msg {
        QueryMsg::Config {} => to_binary(&query_config(deps)?),
        QueryMsg::State {} => to_binary(&query_state(deps)?),
        QueryMsg::AccruedRewards { address } => to_binary(&query_accrued_rewards(deps, address)?),
        QueryMsg::Holder { address } => to_binary(&query_holder(deps, address)?), 
    }
}


fn query_config(deps: Deps) -> StdResult<ConfigResponse> {
    let config: Config = read_config(deps.storage)?;
    
    if let Some(cannonical) = config.bjuno_contract {
        // bjuno_addr = cannonical;
        return Ok(ConfigResponse {
            staking_contract: deps.api.addr_humanize(&config.staking_contract)?.to_string(),
            bjuno_contract: Some(deps.api.addr_humanize(&cannonical)?.to_string()),
        })
    } else {
        return Ok(ConfigResponse {
            staking_contract: deps.api.addr_humanize(&config.staking_contract)?.to_string(),
            bjuno_contract: None,
        })
    }
    
}

fn query_state(deps: Deps) -> StdResult<StateResponse> {
    let state: State = read_state(deps.storage)?;
    Ok(StateResponse {
        global_index: state.global_index,
        total_balance: state.total_balance,
        prev_reward_balance: state.prev_reward_balance,
    })
}
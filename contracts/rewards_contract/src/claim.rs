use crate::{state::{
    read_config, read_holder, read_state, store_holder, store_state, Config, Holder,
    State
}, error::{ContractError, self}, math::{decimal_multiplication_in_256, decimal_subtraction_in_256}};
use crate::msg::{AccruedRewardsResponse};

use cosmwasm_std::{
    attr, BankMsg, Coin, CosmosMsg, Decimal, Deps, DepsMut, Env, MessageInfo, Response, StdError,
    StdResult, Uint128, Addr,
};

use crate::math::{
    decimal_summation_in_256,
};

pub fn try_claim_simple_rewards(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    recipient: Option<String>,
) -> Result<Response, ContractError> {
    let holder_addr = info.sender;
    let holder_addr_raw = deps.api.addr_canonicalize(holder_addr.as_str())?;

    let recipient = match recipient {
        Some(value) => deps.api.addr_validate(value.as_str())?,
        None => holder_addr.clone(),
    };

    let mut holder: Holder = read_holder(deps.storage, &holder_addr_raw)?;
    if holder.is_whitelisted == true {
        return Err(error::ContractError::Std(StdError::generic_err(
            "Address whitelisted as contract address, only admin can claim"
        )));
    }

    let mut state: State = read_state(deps.storage)?;
    let _config: Config = read_config(deps.storage)?;

    let reward_with_decimals =
        calculate_decimal_rewards(state.global_index, holder.index, holder.balance);

    // It would not overflow at any time as per total supply of juno coins
    // let all_reward_with_decimals = reward_with_decimals + holder.pending_rewards;
    let all_reward_with_decimals = decimal_summation_in_256(reward_with_decimals, holder.pending_rewards);

    let rewards = all_reward_with_decimals * Uint128::new(1);
    let decimals = all_reward_with_decimals - Decimal::from_ratio(rewards, Uint128::new(1));

    if rewards.is_zero() {
        return Err(error::ContractError::Std(StdError::generic_err("No rewards have accrued yet")));
    }

    // check this unwrap
    let new_balance = (state.prev_reward_balance.checked_sub(rewards)).unwrap();
    state.prev_reward_balance = new_balance;
    store_state(deps.storage, &state)?;

    holder.pending_rewards = decimals;
    holder.index = state.global_index;
    store_holder(deps.storage, &holder_addr_raw, &holder)?;

    let mut messages: Vec<CosmosMsg> = vec![];
    messages.push(CosmosMsg::Bank(BankMsg::Send {
        to_address: recipient.to_string(),
        amount: vec![Coin {
            denom: "ujuno".to_string(),
            amount: Uint128::from(rewards),
        }],
    }));

    let res = Response::new()
        .add_attributes(vec![
            attr("action", "claim_reward"),
            attr("holder_address", holder_addr),
            attr("rewards", rewards),
        ])
        .add_messages(messages
    );

    Ok(res)
}

pub fn try_whitelist_claim_rewards(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    contract_address: String,
    recipient: Option<String>,
) -> Result<Response, ContractError> {
    let config = read_config(deps.storage)?;
    let admin_addr = info.sender.clone();
    let contract_addr_raw = deps.api.addr_canonicalize(&contract_address)?;

    if info.sender != config.admin {
        return Err(error::ContractError::Std(StdError::generic_err("unauthorized")));
    }

    let recipient = match recipient {
        Some(value) => deps.api.addr_validate(value.as_str())?,
        None => admin_addr.clone(),
    };

    let mut holder: Holder = read_holder(deps.storage, &contract_addr_raw)?;
    if holder.is_whitelisted == false {
        return Err(error::ContractError::Std(StdError::generic_err(
            "Address NOT whitelisted as contract address"
        )));
    }

    let mut state: State = read_state(deps.storage)?;
    let _config: Config = read_config(deps.storage)?;

    let reward_with_decimals =
        calculate_decimal_rewards(state.global_index, holder.index, holder.balance);

    // It would not overflow at any time as per total supply of juno coins
    // let all_reward_with_decimals = reward_with_decimals + holder.pending_rewards;
    let all_reward_with_decimals = decimal_summation_in_256(reward_with_decimals, holder.pending_rewards);

    let rewards = all_reward_with_decimals * Uint128::new(1);
    let decimals = all_reward_with_decimals - Decimal::from_ratio(rewards, Uint128::new(1));

    if rewards.is_zero() {
        return Err(error::ContractError::Std(StdError::generic_err("No rewards have accrued yet")));
    }

    // check this unwrap
    let new_balance = (state.prev_reward_balance.checked_sub(rewards)).unwrap();
    state.prev_reward_balance = new_balance;
    store_state(deps.storage, &state)?;

    holder.pending_rewards = decimals;
    holder.index = state.global_index;
    store_holder(deps.storage, &contract_addr_raw, &holder)?;

    let mut messages: Vec<CosmosMsg> = vec![];
    messages.push(CosmosMsg::Bank(BankMsg::Send {
        to_address: recipient.to_string(),
        amount: vec![Coin {
            denom: "ujuno".to_string(),
            amount: Uint128::from(rewards),
        }],
    }));

    let res = Response::new()
        .add_attributes(vec![
            attr("action", "claim_reward"),
            attr("admin_address", admin_addr),
            attr("contract_address", contract_address),
            attr("rewards", rewards),
        ])
        .add_messages(messages);

    Ok(res)
}

//only bjuno contract should increase or decrease (or add any account to the reward contract)
pub fn try_increase_balance(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    address: String,
    amount: Uint128,
) -> Result<Response, ContractError> {
    let config = read_config(deps.storage)?;
    let mut token_address = Addr::unchecked("");
    if config.bjuno_contract == None {
        return Err(error::ContractError::Std(StdError::generic_err(
            "bjuno not registered"
        )));
    }else {
        if let Some(cannonical) = config.bjuno_contract {
            token_address = deps.api.addr_humanize(&cannonical)?;
        }
    }
    // let token_address = deps.api.addr_humanize(&bjuno_addr)?;
    let address_raw = deps.api.addr_canonicalize(&address)?;
    let sender = info.sender;

    // Check sender is token contract
    if sender != token_address {
        return Err(error::ContractError::Std(StdError::generic_err("unauthorized")));
    }

    let mut state: State = read_state(deps.storage)?;
    let mut holder: Holder = read_holder(deps.storage, &address_raw)?;

    // get decimals
    let rewards = calculate_decimal_rewards(state.global_index, holder.index, holder.balance);

    holder.index = state.global_index;
    holder.pending_rewards = decimal_summation_in_256(rewards, holder.pending_rewards);
    holder.balance += amount;
    state.total_balance += amount;

    store_holder(deps.storage, &address_raw, &holder)?;
    store_state(deps.storage, &state)?;

    let attributes = vec![
        attr("action", "increase_balance"),
        attr("holder_address", address),
        attr("amount", amount),
    ];

    let res = Response::new().add_attributes(attributes);
    Ok(res)
}

pub fn try_decrease_balance(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    address: String,
    amount: Uint128,
) -> Result<Response, ContractError> {

    let config = read_config(deps.storage)?;
    let mut token_address = Addr::unchecked("");
    if config.bjuno_contract == None {
        return Err(error::ContractError::Std(StdError::generic_err(
            "bjuno not registered"
        )));
    }else {
        if let Some(cannonical) = config.bjuno_contract {
            token_address = deps.api.addr_humanize(&cannonical)?;
        }
    }
    // let token_address = deps.api.addr_humanize(&bjuno_addr)?;
    let address_raw = deps.api.addr_canonicalize(&address)?;
    let sender = info.sender;

    // Check sender is token contract
    if sender != token_address {
        return Err(error::ContractError::Std(StdError::generic_err("unauthorized")));
    }

    let mut state: State = read_state(deps.storage)?;
    let mut holder: Holder = read_holder(deps.storage, &address_raw)?;

    if holder.balance < amount {
        return Err(error::ContractError::Std(StdError::generic_err(format!(
            "Decrease amount cannot exceed user balance: {}",
            holder.balance
        ))));
    }

    let rewards = calculate_decimal_rewards(state.global_index, holder.index, holder.balance);

    holder.index = state.global_index;
    holder.pending_rewards = decimal_summation_in_256(rewards, holder.pending_rewards);
    holder.balance = (holder.balance.checked_sub(amount)).unwrap();
    state.total_balance = (state.total_balance.checked_sub(amount)).unwrap();

    store_holder(deps.storage, &address_raw, &holder)?;
    store_state(deps.storage, &state)?;

    let attributes = vec![
        attr("action", "decrease_balance"),
        attr("holder_address", address),
        attr("amount", amount),
    ];

    let res = Response::new().add_attributes(attributes);

    Ok(res)
}


// calculate the reward based on the sender's index and the global index.
// rewards = balance * (global_index)
fn calculate_decimal_rewards(
    global_index: Decimal,
    user_index: Decimal,
    user_balance: Uint128,
) -> Decimal {
    let decimal_balance = Decimal::from_ratio(user_balance, Uint128::new(1));
    decimal_multiplication_in_256(
        decimal_subtraction_in_256(global_index, user_index),
        decimal_balance,
    )
}


pub fn query_accrued_rewards(deps: Deps, address: String) -> StdResult<AccruedRewardsResponse> {
    let global_index = read_state(deps.storage)?.global_index;

    let holder: Holder = read_holder(deps.storage, &deps.api.addr_canonicalize(&address)?)?;
    let reward_with_decimals =
        calculate_decimal_rewards(global_index, holder.index, holder.balance);
    let all_reward_with_decimals =
        decimal_summation_in_256(reward_with_decimals, holder.pending_rewards);

    let rewards = all_reward_with_decimals * Uint128::new(1);

    Ok(AccruedRewardsResponse { rewards })
}


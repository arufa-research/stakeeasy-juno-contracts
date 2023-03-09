use crate::{math::decimal_summation_in_256, error::{ContractError, self}, state::{read_state, State, read_config, store_state}};

use cosmwasm_std::{
    attr, Decimal, DepsMut, Env, MessageInfo, Response, StdError,
};

/// Increase global_index according to claimed rewards amount
/// Only staking_contract is allowed to change the global index
pub fn try_update_global_index(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
) -> Result<Response, ContractError> {
    let mut state: State = read_state(deps.storage)?;

    let config = read_config(deps.storage)?;
    let owner_addr = deps
        .api
        .addr_humanize(&config.staking_contract)?;

    if info.sender != owner_addr {
        return Err(error::ContractError::Std(StdError::generic_err("unauthorized")));
    }

    // Zero staking balance check
    if state.total_balance.is_zero() {
        return Ok(Response::new());
    }

    // Load the reward contract balance
    let balance = deps
        .querier
        .query_balance(env.contract.address, "ujuno".to_string())?;

    let previous_balance = state.prev_reward_balance;

    // claimed_rewards = current_balance - prev_balance;
    let claimed_rewards = balance.amount.checked_sub(previous_balance).unwrap();

    state.prev_reward_balance = balance.amount;

    // global_index += claimed_rewards / total_balance;
    state.global_index = decimal_summation_in_256(
        state.global_index,
        Decimal::from_ratio(claimed_rewards, state.total_balance),
    );
    store_state(deps.storage, &state)?;

    let attributes = vec![
        attr("action", "update_global_index"),
        attr("claimed_rewards", claimed_rewards),
    ];
    let res = Response::new().add_attributes(attributes);

    Ok(res)
}

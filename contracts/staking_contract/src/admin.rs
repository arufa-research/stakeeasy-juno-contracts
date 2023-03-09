use crate::state::{STATE};
use crate::ContractError;
use cosmwasm_std::{
    to_binary, BankMsg, Coin, CosmosMsg, DepsMut, Env, 
    MessageInfo, Response, StdError, WasmMsg, Uint128,
    WasmQuery, QueryRequest, attr
};
use cw20::Cw20ExecuteMsg;

use crate::types::validator_set::{VALIDATOR_SET};
use crate::msg::{ExecuteMsg, RewardClaim, QueryRewards, AccruedRewardsResponse};
use crate::staking::{redelegate_msg, sejuno_exchange_rate, bjuno_exchange_rate};
use crate::deposit::calc_bjuno_reward;
use crate::types::config::CONFIG;
use crate::types::killswitch::KillSwitch;

pub fn admin_commands(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    let mut config = CONFIG.load(deps.storage)?;

    if info.sender != config.admin {
        return Err(ContractError::Std(StdError::generic_err(
            "Admin commands can only be ran from deployer address",
        )));
    }

    match msg {
        ExecuteMsg::ChangeDevFee {
            dev_fee,
            dev_address,
        } => {
            if let Some(dev_fee) = dev_fee {
                config.dev_fee = dev_fee;
            }
            if let Some(dev_address) = dev_address {
                config.dev_address = dev_address;
            }
            CONFIG.save(deps.storage, &config)?;

            Ok(Response::new())
        }

        ExecuteMsg::ChangePegRecoveryFee {
            peg_recovery_fee,
        } => {
            config.peg_recovery_fee = peg_recovery_fee;
            CONFIG.save(deps.storage, &config)?;

            Ok(Response::new())
        }

        ExecuteMsg::ChangeReferralContract {
            referral_contract
        } => {
            config.referral_contract = Some(referral_contract);
            CONFIG.save(deps.storage, &config)?;

            Ok(Response::new())
        }

        ExecuteMsg::ChangeThreshold {
            er_threshold,
        } => {
            config.er_threshold = er_threshold.min(1000u64);
            CONFIG.save(deps.storage, &config)?;

            Ok(Response::new())
        }

        ExecuteMsg::AddValidator { address } => {
            let mut messages: Vec<CosmosMsg> = vec![];
            let vals = deps.querier.query_all_validators()?;

            if !vals.iter().any(|v| v.address == address) {
                return Err(ContractError::Std(StdError::generic_err(format!(
                    "{} is not in the current validator set",
                    address
                ))));
            }

            let mut validator_set = VALIDATOR_SET.load(deps.storage)?;
            validator_set.add(address.to_string());
            VALIDATOR_SET.save(deps.storage, &validator_set)?;

            Ok(Response::new().add_messages(messages))
        }

        ExecuteMsg::KillSwitchOpenWithdraws {} => {
            config.kill_switch = KillSwitch::Open.into();
            CONFIG.save(deps.storage, &config)?;

            Ok(Response::new())
        }

        ExecuteMsg::ChangeOwner { new_owner } => {
            let mut config = CONFIG.load(deps.storage)?;
            config.admin = new_owner;
            CONFIG.save(deps.storage, &config)?;
            Ok(Response::new())
        }

        _ => Err(ContractError::Std(StdError::generic_err(
            "Invalid message type".to_string(),
        ))),
    };

    Ok(Response::new())
}

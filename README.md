# JUNO StakeEasy contracts

This repo contains seJUNO and bJUNO contracts. There are four components:

- Staking contract: This contains logic for staking, unstaking, validator list, claim.

- SeJUNO Token: This is the token minted by staking contract against a asset. It accures rewards over time.

- BJUNO Token: This is the token minted by staking contract against a asset. It is always backed by 1 onchain Juno. 1:1 ratio. Rewards can be claimed using rewards contract.

- Reward Contract: This contains the logic for distributing rewards accumulated via bJUNO tokens.

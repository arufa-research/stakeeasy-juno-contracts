use cosmwasm_std::Decimal;

/// return a * b
pub fn decimal_multiplication_in_256(a: Decimal, b: Decimal) -> Decimal {
    let c_u256: Decimal = b * a;
    c_u256
}

/// return a + b
pub fn decimal_summation_in_256(a: Decimal, b: Decimal) -> Decimal {
    let c_u256: Decimal = b + a;
    c_u256
}

/// return a - b
pub fn decimal_subtraction_in_256(a: Decimal, b: Decimal) -> Decimal {
    let c_u256: Decimal = a - b;
    c_u256
}

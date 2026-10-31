//! Native-NEAR policy vault. The same model is used by Wasm and native unit tests.
pub mod model;

#[cfg(target_arch = "wasm32")]
mod contract;

#[cfg(test)]
mod tests;

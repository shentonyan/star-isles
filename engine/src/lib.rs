//! A dependency-free terrain kernel. Coordinates and output are in tiles.
//! Exported directly to WebAssembly, with no binding generator required.
#[no_mangle]
pub extern "C" fn terrain_height(x: u32) -> i32 {
    let t = x.min(559) as f64;
    31 + ((t * 0.035).sin() * 2.0 + (t * 0.093).sin() * 1.2 + (t * 0.011).sin() * 3.0).round() as i32
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn terrain_is_traversable() {
        for x in 0..560 {
            assert!((24..=38).contains(&terrain_height(x)));
            if x > 0 { assert!((terrain_height(x) - terrain_height(x - 1)).abs() <= 1); }
        }
    }
    #[test] fn clamps_world_edge() { assert_eq!(terrain_height(559), terrain_height(u32::MAX)); }
}

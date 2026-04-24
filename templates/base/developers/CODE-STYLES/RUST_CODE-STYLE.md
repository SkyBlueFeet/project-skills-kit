# Rust 代码规范（工程执行版）

## 1. 模块与职责

- 核心业务逻辑与边界适配层分离。
- 新增复杂能力优先模块化拆分，避免单文件持续膨胀。

## 2. 安全与错误处理

- 所有外部输入先校验，再访问内存或执行业务逻辑。
- `unsafe` 范围最小化，仅包裹必要语句。
- 每个 `unsafe` 块必须说明安全前提与验证来源。
- 错误必须可定位，避免无上下文 panic。

## 3. 可读性与命名

- 函数命名使用动词短语，类型命名使用名词短语。
- 公共接口命名稳定，变更需考虑兼容性。
- 对复杂边界逻辑补充功能语义注释。

## 4. 质量门禁（建议）

```bash
cargo fmt -- --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test --all-features
cargo build --release
```

## 5. 变更留痕（强制）

- 每次改动后，必须在 `developers/SESSIONS/NOTE_YY_MM_DD.md` 追加记录。

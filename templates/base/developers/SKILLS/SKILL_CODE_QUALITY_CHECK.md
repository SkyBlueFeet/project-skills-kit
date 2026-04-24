# 技能：代码质量检查（通用）

> 用途：执行跨项目、跨语言的统一质量检查流程。
> 适用场景：功能开发完成后验收、提交前自检、阶段性质量巡检。

---

## 执行步骤

1. 根据项目语言栈选择对应检查命令（格式化、静态检查、单测、构建）。
2. 运行最小必需命令集并记录结果。
3. 对失败项进行修复后完整复检。
4. 在 `developers/SESSIONS/NOTE_YY_MM_DD.md` 追加检查结论。

---

## 参考命令模板（按项目启用）

### JavaScript / TypeScript

```bash
npm run lint
npm run test
npm run build
```

### Python

```bash
ruff check .
pytest
```

### Java

```bash
mvn -q test
```

### Rust

```bash
cargo fmt -- --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test --all-features
```

---

## 判定标准

- 已执行当前项目所需的格式化/静态检查/测试/构建。
- 关键改动路径至少覆盖 1 条成功路径与 1 条失败路径验证。
- 结果可复现，并完成会话留痕。

---

## 失败处理建议

1. 格式化失败：先格式化再复检。
2. 静态检查失败：优先修复告警根因。
3. 测试失败：先定位回归，再跑全量。
4. 构建失败：区分依赖问题、环境问题、代码问题并分别处理。

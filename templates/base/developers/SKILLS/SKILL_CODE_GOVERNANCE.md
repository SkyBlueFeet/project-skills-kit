# 技能：代码治理（SKILL_CODE_GOVERNANCE）

> 用途：规范代码改动的完整流程，从语言规范路由到质量门禁，确保每次改动可追溯、合规。
> 适用场景：功能实现、问题修复、重构、接口变更时。

---

## 何时触发

- 开始任何代码改动前（新功能、修复、重构）
- `SKILL_ROUTER.md` 路由表中"功能实现"或"问题修复"行触发

---

## 执行流程

### Step 1：语言规范路由

根据改动涉及的文件类型，读取对应语言规范：

| 文件类型 | 读取规范 |
|---|---|
| `.ts` / `.tsx` | `developers/CODE-STYLES/TYPESCRIPT_CODE-STYLE.md` |
| `.js` / `.mjs` / `.cjs` | `developers/CODE-STYLES/JAVASCRIPT_CODE-STYLE.md` |
| `.java` | `developers/CODE-STYLES/JAVA_CODE-STYLE.md` |
| `.py` | `developers/CODE-STYLES/PYTHON_CODE-STYLE.md` |
| `.rs` | `developers/CODE-STYLES/RUST_CODE-STYLE.md` |
| `.html` | `developers/CODE-STYLES/HTML_CODE-STYLE.md` |
| `.css` / `.scss` | `developers/CODE-STYLES/CSS_CODE-STYLE.md` |
| 多语言混合 | 按各文件类型分别路由 |

通用约束始终适用：`developers/CODE-STYLE.md`（总则）。

### Step 2：改动前核查

- [ ] 改动范围是否最小化（不引入与任务无关的改动）？
- [ ] 对外接口是否有变更？若有，是否版本化或提供兼容路径？
- [ ] 是否有外部输入？若有，是否在进入核心逻辑前完成校验？

### Step 3：改动中约束

- 单一职责：每个函数/模块职责可用一句话说明。
- 命名语义化：避免缩写堆叠，名称体现用途。
- 错误可追踪：错误信息包含可定位字段（参数名、路径、模块、阶段）。
- 不留临时代码：调试用 `console.log` / `print` / 注释块在提交前清除。

### Step 4：质量门禁

改动完成后执行 [`SKILL_CODE_QUALITY_CHECK.md`](./SKILL_CODE_QUALITY_CHECK.md) 对应命令：

| 语言 | 最小必检项 |
|---|---|
| TypeScript / JavaScript | `npm run lint` → `npm run test` → `npm run build` |
| Python | `ruff check .` → `pytest` |
| Java | `mvn -q test` |
| Rust | `cargo fmt -- --check` → `cargo clippy` → `cargo test` |

**高风险变更**（接口、并发、序列化协议）额外要求：
- 覆盖 1 条成功路径 + 1 条失败路径验证
- 补充回归验证

### Step 5：接口变更同步

若改动涉及对外接口（API、协议、公共函数签名），必须同步更新：
- `README.md`（如有接口说明）
- 相关示例代码
- 对应语言规范或分析文档

### Step 6：代码索引同步

**前置判断**：读取 `skills.lock.json` 中的 `codeIndexGranularity`。
- 若为 `null` 或字段缺失 → 跳过本步骤。
- 若有值 → 必须执行以下操作。

**判断本次改动是否影响索引**：

| 改动类型 | 是否需要更新索引 |
|---|---|
| 新增 / 删除 / 重命名文件或目录 | **必须更新** |
| 新增 / 删除 / 重命名类、接口、枚举、公共函数 | **必须更新**（module / function 粒度） |
| 修改函数签名（参数 / 返回类型） | **必须更新**（function 粒度） |
| 仅修改函数内部实现，签名不变 | 无需更新 |
| 仅修改注释、格式 | 无需更新 |

**更新方式**：按 [`SKILL_CODE_INDEX.md`](./SKILL_CODE_INDEX.md) Step 2-3 仅更新受影响条目，**无需全量重建**。更新后同步文档头部"最后更新"日期。

---

## 完成后必做

按 [`SKILL_ROUTER.md`](./SKILL_ROUTER.md) 的"功能实现/问题修复"行：

1. **质量检查**：执行 Step 4 质量门禁，记录结论。
2. **代码索引同步**：执行 Step 6，若有更新则在会话留痕中注明。
3. **会话留痕**：在 `developers/SESSIONS/NOTE_YY_MM_DD.md` 追加：

```
### [功能实现/问题修复] [简述]
- 时间：YYYY-MM-DD HH:mm
- 改动范围：[文件列表]
- 语言规范：已遵守 [语言] 规范
- 质量检查：通过 / 部分通过（说明：…）
- 接口变更：无 / 有（已同步：…）
- 代码索引：未启用 / 无需更新 / 已更新（受影响条目：…）
- 遗留事项：…
```

4. **计划进度更新**：在 `AGENTS.md` 计划索引更新当前任务对应的计划状态。

---

## 常见问题

**Q：改动很小（单行修复），是否需要全套流程？**  
A：Step 1-3 必须，Step 4 可简化（人工确认即可），Step 5 按实际情况判断。会话留痕不可省略。

**Q：语言规范文件不存在怎么办？**  
A：执行 `npx @skybluefeet/skills-kit add language <name>` 安装，或使用总则 `CODE-STYLE.md` 作为基线。

**Q：多人协作，接口变更如何协调？**  
A：接口变更必须在 SESSIONS 留痕并注明影响范围，让团队成员可以通过 SESSIONS 感知。
# 技能：任务路由器（SKILL_ROUTER）

> **所有任务的统一入口**。Agent 接到任何任务时，首先查阅本文件，确认读取集与收尾要求，再开始执行。

---

## 使用方式

```
1. 按任务类型找到对应行
2. 执行前：读取"最小读取集"列出的文档
3. 执行中：遵守"执行约束"
4. 完成后：**逐项执行"完成后必做"，不可跳过**
```

> "完成后必做"是本规范的核心机制。收尾动作是任务的一部分，不是可选步骤。

---

## 任务路由表

| 任务类型 | 执行前最小读取集 | 执行约束 | 完成后必做 |
|---|---|---|---|
| **功能实现** | `AGENTS.md` → 对应语言规范 | CODE-STYLE 强制遵守 | ① 质量检查 → ② 代码索引同步 → ③ 会话留痕 → ④ 计划进度更新 |
| **问题修复 / Bug Fix** | `AGENTS.md` → 对应语言规范 | 定位根因再改动，不引入新问题 | ① 质量检查 → ② 代码索引同步 → ③ 会话留痕 → ④ 计划进度更新 |
| **方案设计 / 文档输出** | `AGENTS.md` → `DOC-RULES.md` | 遵守文档命名与版本锚点规则 | ① DOC-RULES 合规检查 → ② 会话留痕 |
| **文档修改** | `AGENTS.md` → `DOC-RULES.md` | 不改动 `docs/` 除非明确授权 | ① DOC-RULES 合规检查 → ② 会话留痕 |
| **计划创建** | `AGENTS.md`（计划索引部分） | 计划 ID 唯一，格式符合索引规范 | ① 在 `AGENTS.md` 计划索引登记 → ② 会话留痕 |
| **计划进度更新** | `AGENTS.md`（计划索引部分） | 仅更新 `AGENTS.md` 计划索引，不在其他文件重复 | ① 更新 `AGENTS.md` 计划索引 → ② 会话留痕 |
| **计划完成 / 验收** | `AGENTS.md` → `SKILL_ACCEPTANCE.md` | 按技术栈路由到对应专项验收文档 | ① 验收结论写入计划文档 → ② 更新 `AGENTS.md` 计划索引状态 → ③ 会话留痕 |
| **代码质量巡检** | `SKILL_CODE_QUALITY_CHECK.md` | 按项目语言栈执行对应命令 | ① 检查结论追加到 SESSIONS → ② 会话留痕 |
| **新项目初始化** | `SKILL_BOOTSTRAP.md` | 按 Bootstrap 检查清单逐项确认 | ① Bootstrap 验收 → ② 会话留痕 |
| **上下文重建 / 快照** | `SKILL_SNAPSHOT.md` | 快照生成后才开始其他任务 | ① 会话留痕（注明快照状态） |
| **代码索引维护** | `SKILL_CODE_INDEX.md` | 粒度由 `skills.lock.json` 决定；无索引文档时先建立全量索引 | ① 更新 `developers/CODE-INDEX.md` → ② 会话留痕 |

---

## 完成后必做——操作细则

> 各"完成后必做"动作的详细操作步骤，见对应治理 Skill：
> - 代码改动 → [`SKILL_CODE_GOVERNANCE.md`](./SKILL_CODE_GOVERNANCE.md)
> - 文档变更 → [`SKILL_DOC_GOVERNANCE.md`](./SKILL_DOC_GOVERNANCE.md)
> - 计划管理 → [`SKILL_PLAN_INDEX.md`](./SKILL_PLAN_INDEX.md)

### ① 质量检查

按 [`SKILL_CODE_QUALITY_CHECK.md`](./SKILL_CODE_QUALITY_CHECK.md) 执行，将结论追加到当日 SESSIONS 文件。

### ② 代码索引同步

仅当 `skills.lock.json` 中 `codeIndexGranularity` 有值时执行。
按 [`SKILL_CODE_GOVERNANCE.md`](./SKILL_CODE_GOVERNANCE.md) Step 6 判断本次改动是否影响索引，受影响时更新 `developers/CODE-INDEX.md`。

### ③ 会话留痕

在 `developers/SESSIONS/NOTE_YY_MM_DD.md` 追加本次任务记录，包含：

```
### [任务类型] [简述]
- 时间：YYYY-MM-DD HH:mm
- 改动范围：…
- 结论：完成 / 部分完成（说明：…）
- 遗留事项：…
```

若当日文件不存在，从 `developers/SESSIONS/TEMPLATE.md` 复制后再追加。

### ④ 计划进度更新

在 `AGENTS.md` 的计划索引表中更新对应行的"完成情况"与"最后更新时间"。  
计划索引是**唯一权威源**，不在其他文件重复维护。

---

## 必做 vs 按需

| 标记 | 含义 |
|---|---|
| **必做**（路由表中列出） | 每次任务结束强制执行，不可跳过 |
| **按需**（未在路由表中列出） | 由任务实际情况决定是否执行 |

> 若任务很小（如单行注释修改），质量检查可简化为人工确认，但**会话留痕不可省略**。

---

## 相关文档

| 文档 | 用途 |
|---|---|
| [`SKILL_BOOTSTRAP.md`](./SKILL_BOOTSTRAP.md) | 新项目初始化与最低可用检查 |
| [`SKILL_CODE_QUALITY_CHECK.md`](./SKILL_CODE_QUALITY_CHECK.md) | 质量检查执行步骤 |
| [`SKILL_ACCEPTANCE.md`](./SKILL_ACCEPTANCE.md) | 计划目标验收（总则与路由） |
| [`SKILL_SNAPSHOT.md`](./SKILL_SNAPSHOT.md) | 代码快照管理 |
| [`SKILL_CODE_INDEX.md`](./SKILL_CODE_INDEX.md) | 代码索引建立与维护 |

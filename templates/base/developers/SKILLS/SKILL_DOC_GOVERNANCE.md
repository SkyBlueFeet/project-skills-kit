# 技能：文档治理（SKILL_DOC_GOVERNANCE）

> 用途：规范文档新建、修改、归档的完整流程，确保每次文档变更可追溯、合规、不遗漏留痕。
> 适用场景：新建任何 `developers/` 文档、修改规范文档、归档分析或报告时。

---

## 何时触发

- 新建 `developers/` 下任何文档（规范、分析、报告、技能）
- 修改现有规范文档（`DOC-RULES.md`、`CODE-STYLE.md`、`AGENTS.md` 等）
- 归档分析文档或质量报告
- `SKILL_ROUTER.md` 路由表中"文档新建/修改"行触发

---

## 执行流程

### Step 1：确认文档类型与归档位置

| 文档类型 | 归档目录 | 命名规则 |
|---|---|---|
| 规范文档 | `developers/` 根层 | 全大写短横线，如 `CODE-STYLE.md` |
| 技能文档 | `developers/SKILLS/` | `SKILL_[主题].md` |
| 分析文档 | `developers/ANALYSIS/` | `ANALYSIS_[主题].md` |
| 质量报告 | `developers/REPORTS/` | `CODE_QUALITY_REPORT_YYYY-MM-DD_HH-mm-ss.md` |
| 会话留痕 | `developers/SESSIONS/` | `NOTE_YY_MM_DD.md` |

### Step 2：检查版本锚点要求

分析文档与质量报告必须包含以下字段（其他文档无强制要求）：

```markdown
- 创建时间：YYYY-MM-DD HH:mm +08:00
- 最后更新：YYYY-MM-DD HH:mm +08:00
- 代码快照日期：YYYY-MM-DD
- Git 分支：main
- Git Commit：abc1234
```

### Step 3：检查内容规范

**技能文档必须包含：**
- 适用场景说明
- 何时触发
- 执行步骤（可操作，不模糊）
- 完成后必做（引用或内联）

**规范文档必须包含：**
- 适用范围
- 强制约束（明确标注"强制"）
- 禁止事项

### Step 4：检查链接有效性

- 文档中所有本地链接必须指向实际存在的文件。
- 新建文档后，检查 `developers/INDEX.md` 是否需要补充条目。
- 新建 Skill 后，检查 `developers/SKILLS/README.md` 是否需要补充条目。

### Step 5：`docs/` 边界检查

- 无明确授权时，禁止改动 `docs/` 下的软件使用文档。
- 若改动涉及用户可见功能，提示人工确认是否同步 `docs/`。

---

## 完成后必做

按 [`SKILL_ROUTER.md`](./SKILL_ROUTER.md) 的"文档新建/修改"行：

1. **DOC-RULES 合规检查**：确认以上 Step 1-5 均通过。
2. **会话留痕**：在 `developers/SESSIONS/NOTE_YY_MM_DD.md` 追加记录：

```
### [文档治理] [文档名称] [新建/修改]
- 时间：YYYY-MM-DD HH:mm
- 改动范围：…
- 合规检查：通过 / 不通过（说明：…）
- 遗留事项：…
```

---

## 常见问题

**Q：修改规范文档后需要同步哪些地方？**  
A：视改动范围：若影响 Skill 文档中的引用，同步更新对应 Skill；若影响索引链接，更新 `INDEX.md`；计划索引变更只更新 `AGENTS.md`。

**Q：分析文档要不要更新 INDEX.md？**  
A：分析文档通常不在 INDEX.md 主表中列出，但如果是重要的长期参考文档，可在"分析与报告"区块补充。

**Q：SESSIONS 文件当天已存在怎么办？**  
A：同一天的记录追加到同一个文件末尾，不新建文件。
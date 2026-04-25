# 技能：新项目初始化（SKILL_BOOTSTRAP）

> 用途：在新项目中初始化 project-rules 规范体系，并验证最低可用状态。
> 适用场景：`project-rules-kit init` 执行后、接入已有项目时、迁移改造后的首次验收。

---

## 初始化流程

### Step 1：安装规范文件

```bash
# 全新项目（交互模式）
npx @skybluefeet/skills-kit init

# CI / 脚本模式（默认 TypeScript，可通过 --languages 指定）
npx @skybluefeet/skills-kit init --yes --languages=typescript,python --project-type=typescript-general
```

### Step 2：按需添加语言规范

```bash
npx @skybluefeet/skills-kit add language python
npx @skybluefeet/skills-kit add language java
```

### Step 3：按需添加 CLAUDE.md

```bash
npx @skybluefeet/skills-kit add claude
```

### Step 4：运行体检

```bash
npx @skybluefeet/skills-kit doctor
```

---

## 最低可用检查清单

完成初始化后，逐项确认：

### 必需文件

- [ ] `AGENTS.md` 存在，且包含计划索引表
- [ ] `developers/INDEX.md` 存在，且包含 SKILL_ROUTER 入口
- [ ] `developers/SKILLS/SKILL_ROUTER.md` 存在
- [ ] `developers/SKILLS/SKILL_CODE_QUALITY_CHECK.md` 存在
- [ ] `developers/SESSIONS/TEMPLATE.md` 存在

### 语言规范

- [ ] `developers/CODE-STYLES/` 下至少存在一份与项目语言匹配的规范文件
- [ ] `developers/CODE-STYLE.md`（总则）存在
- [ ] `skills.lock.json` 已记录正确的 `projectType`

### 可选文件

- [ ] `CLAUDE.md`（Claude Code 用户需要）
- [ ] `developers/SKILLS/SKILL_ACCEPTANCE.md`（有计划验收需求时）
- [ ] `developers/PLANS/TEMPLATE.md`（有计划管理需求时，建议保留）
- [ ] `developers/CODE-INDEX.md`（启用代码索引时；粒度见 `skills.lock.json` → `codeIndexGranularity`，建立方式见 [`SKILL_CODE_INDEX.md`](./SKILL_CODE_INDEX.md)）

---

## 验收判定

| 判定 | 条件 |
|---|---|
| **通过** | 必需文件全部存在，语言规范至少一份匹配 |
| **部分通过** | 必需文件存在，语言规范缺失或不匹配，有明确补充计划 |
| **不通过** | 必需文件缺失，`doctor` 报错未修复 |

---

## 常见问题

**Q：`doctor` 报"缺失必需文件"**  
A：执行 `npx @skybluefeet/skills-kit doctor --fix` 自动补齐，或手动从模板复制。

**Q：语言规范文件全部缺失**  
A：执行 `add language <name>` 按需添加，支持：`typescript / javascript / java / python / rust / web`。

**Q：TypeScript / JavaScript 通用项目应走哪份验收文档？**  
A：若项目不属于前端或 Node.js 后端形态，优先使用 `SKILL_ACCEPTANCE_TYPESCRIPT.md` 或 `SKILL_ACCEPTANCE_JAVASCRIPT.md` 做收束验收。

**Q：CLI 猜测出的项目类型是否可以直接当最终值？**  
A：不可以。CLI 基于 `package.json` 的猜测仅作建议提示，最终 `projectType` 仍由 Agent 或维护者按项目形态确认；若未确定，可先留空，由 `doctor` 给出警告与完整候选项。

**Q：已有项目接入，担心覆盖现有文件**  
A：优先执行 `migrate --check` 预览合并结果，确认后再执行 `migrate --apply`；若后续还需补齐模板文件差异，再执行 `sync --check`。

---

## 完成后必做

按 [`SKILL_ROUTER.md`](./SKILL_ROUTER.md) 的"新项目初始化"行执行：

1. 在 `developers/SESSIONS/NOTE_YY_MM_DD.md` 追加初始化记录（改动范围、验收结论）。
2. 若已创建项目计划，在 `AGENTS.md` 计划索引登记。

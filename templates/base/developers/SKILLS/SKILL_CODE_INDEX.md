# 技能：代码索引管理（SKILL_CODE_INDEX）

> 用途：在项目中建立并维护代码索引文档，让 AI 与开发者在最少上下文下快速定位代码结构。
> 粒度在 `npx @skybluefeet/skills-kit init` 时通过交互确定，记录于 `skills.lock.json`（`codeIndexGranularity` 字段）。

---

## 粒度级别

| 粒度值 | 索引内容 |
|---|---|
| `file` | 文件路径 + 单行用途描述 |
| `module` | 文件级 + 类 / 接口 / 导出符号 + 单行描述 |
| `function` | 模块级 + 函数 / 方法签名 + 参数与返回值描述 |

当前项目粒度由 `skills.lock.json` 的 `codeIndexGranularity` 字段决定。若字段为 `null` 或缺失，表示未启用代码索引。

---

## 索引文件位置

`developers/CODE-INDEX.md`

---

## 何时建立 / 更新

- 初始化项目后首次建立索引（覆盖全量代码）。
- 新增 / 删除 / 重命名模块、类、公共函数时。
- 代码重构影响对外接口或目录结构时。
- `SKILL_CODE_QUALITY_CHECK.md` 巡检发现索引与实际代码不一致时。

---

## 推荐检索工具

> Agent 定位代码时应按以下优先级顺序检索，**禁止直接全量遍历源码**。

### 检索优先级

```
1. developers/CODE-INDEX.md   ← 人/AI 可读的结构索引（本文档维护）
2. tags 文件（ctags）         ← 机器可读的符号→位置映射，一次查询即可定位
3. ast-grep（sg）             ← 语法结构搜索，语义级精确匹配
4. ripgrep（rg）              ← 文本级精确搜索
5. 全量快照（Repomix）        ← 仅在以上方式均无法定位时使用
```

### 工具说明

> **容错原则**：每个工具在使用前先检测是否可用，不可用时降级到下一级，**不强制要求安装**。

#### 工具可用性检测

```bash
# 检测 ctags
ctags --version 2>/dev/null && echo "可用" || echo "不可用，跳过"

# 检测 ast-grep（全局安装）
sg --version 2>/dev/null && echo "可用" || echo "不可用，尝试 npx"

# 检测 ripgrep
rg --version 2>/dev/null && echo "可用" || echo "不可用，跳过"
```

#### 回退顺序（当工具不可用时）

```
ctags 不可用  → 跳过②，直接用 ast-grep 或 ripgrep
sg 不可用     → 先尝试 npx @ast-grep/cli，仍不可用则跳过③，用 ripgrep
rg 不可用     → 用系统 grep 替代（功能受限但可用）
以上全不可用  → 直接使用 Repomix 快照（⑤）
```

---

#### 1. universal-ctags — 符号索引

> **非必须**：未安装时跳过此步骤，降级到 ast-grep 或 ripgrep。

生成 `tags` 文件，把所有类 / 函数 / 变量映射到文件 + 行号：

```bash
# 使用前先检测
ctags --version 2>/dev/null || { echo "ctags 未安装，跳过"; exit 0; }

# 生成索引（建议加入 .gitignore）
ctags -R --languages=TypeScript,Python,Java --fields=+n src/

# 查询示例
grep "^UserService" tags          # 快速定位类
grep "^handleLogin" tags          # 快速定位函数
```

安装（可选）：`brew install universal-ctags` / `apt install universal-ctags` / [Windows 二进制](https://github.com/universal-ctags/ctags-win32/releases)

#### 2. ast-grep（sg）— 语法结构搜索

> **npx 可直接使用**，无需全局安装。

按代码语法模式匹配，不误匹配注释或字符串：

```bash
# 优先使用全局安装（快）
sg --version 2>/dev/null \
  && sg -p 'async function $NAME($_) { $$$ }' -l ts src/ \
  || npx @ast-grep/cli -p 'async function $NAME($_) { $$$ }' -l ts src/

# 常用模式（sg / npx @ast-grep/cli 均适用）
sg -p 'class $NAME extends $BASE' src/
sg -p '$OBJ.findOne({ $$$ })' src/
```

全局安装（可选，提升速度）：`npm i -g @ast-grep/cli` / `brew install ast-grep`

#### 3. ripgrep（rg）— 文本精确搜索

> **通常预装**（VS Code、GitHub Codespaces、大多数 CI 环境内置）；不可用时用系统 `grep` 替代。

```bash
# 优先 rg
rg --version 2>/dev/null \
  && rg "class UserService" --type ts \
  || grep -r "class UserService" src/ --include="*.ts"

rg "def handle_" --type py -l     # 只列文件名
rg "implements IRepository" -n    # 显示行号
```

---

## 如何建立代码索引

### Step 1：确认粒度

读取 `skills.lock.json` 中的 `codeIndexGranularity`，按对应粒度执行后续步骤。

### Step 2：扫描代码结构

**优先使用工具收集信息，避免手动遍历文件**：

| 粒度 | 推荐命令 |
|---|---|
| `file` | `rg --files src/` 列出所有源文件 |
| `module` | `ctags -R --fields=+n src/` 后 `grep` tags 文件提取类/接口/导出符号 |
| `function` | `ctags` 提取函数签名；或 `sg -p 'export function $F($_): $R { $$$ }'` |

按粒度逐级收集信息：

**file 级**
- 运行 `rg --files src/`，记录每个文件的相对路径与用途（单行）。

**module 级（在 file 级基础上）**
- 运行 `ctags -R --fields=+n src/`，grep tags 文件提取每个文件导出的类 / 接口 / 枚举 / 常量，记录类型与单行描述。

**function 级（在 module 级基础上）**
- 从 tags 文件提取公共函数 / 方法的签名（参数类型 + 返回类型）与单行描述。
- 私有实现细节不纳入索引。

### Step 3：写入索引文档

按下方模板更新 `developers/CODE-INDEX.md`，并在文档头部更新"最后更新"日期。

### Step 4：会话留痕

在 `developers/SESSIONS/NOTE_YY_MM_DD.md` 追加记录：

```
### [代码索引] 建立 / 更新索引
- 时间：YYYY-MM-DD HH:mm
- 粒度：file / module / function
- 覆盖范围：…
- 结论：完成 / 部分完成（说明：…）
```

---

## 索引文档模板

> 复制到 `developers/CODE-INDEX.md` 后按实际项目填写。

```markdown
# 代码索引（Code Index）

> 粒度：file          <!-- 替换为 file / module / function -->
> 最后更新：YYYY-MM-DD

---

## <模块名>

### `src/<路径>/<文件名>.ts`

> 用途：<单行描述>

<!-- module 及以上粒度：列出导出符号 -->
#### 导出符号

| 符号 | 类型 | 描述 |
|---|---|---|
| `SymbolName` | class / interface / enum / const | <描述> |

<!-- function 粒度：列出公共函数/方法 -->
#### 公共函数 / 方法

| 签名 | 描述 |
|---|---|
| `funcName(param: Type): ReturnType` | <描述> |
```

---

## 通过 CLI 按需添加本技能

若初始化时未启用代码索引，可事后添加：

```bash
npx @skybluefeet/skills-kit add skill code-index
```

若需更改粒度，直接修改 `skills.lock.json` 中的 `codeIndexGranularity` 字段后重新建立索引。

---

## 相关文档

| 文档 | 用途 |
|---|---|
| [`SKILL_SNAPSHOT.md`](./SKILL_SNAPSHOT.md) | 无上下文时先生成快照，再建立索引 |
| [`SKILL_CODE_QUALITY_CHECK.md`](./SKILL_CODE_QUALITY_CHECK.md) | 巡检时检查索引是否过期 |
| [`AI-CONTEXT-LOADING.md`](../AI-CONTEXT-LOADING.md) | 利用代码索引控制 token 读取策略 |

# 技能：计划目标验收（总则与路由）

> 用途：在计划阶段性完成或全部完成时，逐项核对计划目标是否真正达到可交付状态。
> 与 `SKILL_CODE_QUALITY_CHECK.md` 的区别：质量检查关注代码健康度；本技能关注**计划承诺的目标是否兑现**。

---

## 何时触发

- 计划中某个里程碑/子任务标记为"完成"前
- 计划全部完成、准备更新计划索引为"已验收"前
- 用户明确要求"验收"或"收束"时

---

## 执行流程

```
1. 读取当前计划文档，列出所有目标条目
2. 按技术栈路由到对应专项验收文档（见下表）
3. 逐条核对目标，填写验收结论
4. 输出"验收通过 / 部分通过 / 不通过"判定
5. 将验收结论追加到 developers/SESSIONS/NOTE_YY_MM_DD.md
6. 如通过，同步更新三处计划索引状态为"已验收"
```

---

## 技术栈路由

| 项目类型 | 专项验收文档 |
|---|---|
| Node.js 后端（Express / Koa / NestJS 等） | [SKILL_ACCEPTANCE_NODE_BACKEND.md](./SKILL_ACCEPTANCE_NODE_BACKEND.md) |
| 前端（React / Vue / 原生 Web 等） | [SKILL_ACCEPTANCE_FRONTEND.md](./SKILL_ACCEPTANCE_FRONTEND.md) |
| Java 后端（Spring Boot / Spring MVC 等） | [SKILL_ACCEPTANCE_JAVA_BACKEND.md](./SKILL_ACCEPTANCE_JAVA_BACKEND.md) |
| Python（FastAPI / Django / 脚本 / 数据处理等） | [SKILL_ACCEPTANCE_PYTHON.md](./SKILL_ACCEPTANCE_PYTHON.md) |
| 多技术栈混合项目 | 按各层分别路由，逐层验收 |

---

## 验收结论格式（追加到 SESSIONS）

```
### 验收结论 — [计划ID] [计划名称]

- 验收时间：YYYY-MM-DD HH:mm
- 技术栈：XXX
- 目标完成情况：
  - [x] 目标 1
  - [x] 目标 2
  - [ ] 目标 3（未完成，原因：…）
- 非功能检查：通过 / 部分通过（说明：…）
- 最终判定：通过 / 部分通过 / 不通过
- 遗留事项：…
```

---

## 判定标准说明

| 判定 | 条件 |
|---|---|
| **通过** | 所有计划目标条目达成，非功能检查无阻断项 |
| **部分通过** | 核心目标达成，存在次要目标未完成或非功能警告项，已明确遗留处理方式 |
| **不通过** | 存在核心目标未达成，或非功能检查存在阻断项 |

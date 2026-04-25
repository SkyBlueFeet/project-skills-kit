# 技能：计划目标验收 — Python

> 适用栈：FastAPI / Django / Flask / 脚本工具 / 数据处理 / 机器学习工程等 Python 项目。
> 上级入口：[SKILL_ACCEPTANCE.md](./SKILL_ACCEPTANCE.md)

---

## 一、功能目标核对

根据项目类型选择对应检查维度：

### 1A — Web 服务（FastAPI / Django / Flask）

- [ ] 计划中声明的所有 API 端点均已实现，路径、方法与设计一致
- [ ] 请求参数校验已落地（Pydantic 模型 / Django Form / marshmallow）
- [ ] 响应结构与约定格式（字段、状态码）一致
- [ ] 数据库操作（ORM / 原生查询）覆盖计划要求的业务场景
- [ ] 鉴权逻辑（依赖注入 / 装饰器 / 中间件）覆盖需要保护的接口

### 1B — 脚本 / 工具

- [ ] 脚本入口参数与计划设计一致（`argparse` / `click` / `typer`）
- [ ] 输入校验与错误提示清晰，非法参数有明确退出码与提示
- [ ] 计划中承诺的处理逻辑（转换、过滤、生成）已实现并可重现

### 1C — 数据处理 / 机器学习工程

- [ ] 数据管道各步骤（读取、清洗、特征工程、输出）符合计划定义
- [ ] 关键中间结果可复现（随机种子固定、版本锁定）
- [ ] 产出物（模型文件、报告、数据集）与计划约定格式一致

---

## 二、代码质量检查

```bash
# 格式化与静态检查
ruff check .           # 静态分析（首选）
ruff format --check .  # 格式检查

# 类型检查（如项目使用类型注解）
mypy .                 # 或 pyright

# 单元测试
pytest                 # 默认
pytest --cov=src       # 含覆盖率（可选）
```

**判定要求：**
- ruff 无 error（E/F 类别）
- mypy / pyright 无类型错误（如项目开启了类型检查）
- 与计划目标直接相关的测试用例全部通过

---

## 三、非功能检查

### 3.1 错误处理与日志

- [ ] 外部调用（HTTP / 数据库 / 文件 IO）有异常捕获，失败有明确错误信息
- [ ] 使用 `logging` 模块（非 `print`），日志级别与场景匹配
- [ ] Web 服务有全局异常处理，不向客户端暴露原始堆栈

### 3.2 安全基线

- [ ] 数据库查询使用参数化（SQLAlchemy ORM 或 `cursor.execute(sql, params)`），无 f-string 拼接 SQL
- [ ] 敏感配置（密钥、数据库密码）读自环境变量（`python-dotenv` / `os.getenv`），未硬编码
- [ ] 依赖无已知高危漏洞（`pip audit`）

### 3.3 性能基线

- [ ] I/O 密集型操作使用 `asyncio` / 线程池，未在异步框架中调用阻塞 IO（FastAPI / ASGI 项目）
- [ ] 数据量大的处理使用迭代器 / 生成器 / 分批读取，不一次性全量加载到内存
- [ ] 高频数据库查询有必要的索引（结合计划中的查询场景）

### 3.4 依赖与环境

- [ ] `requirements.txt` / `pyproject.toml` 已锁定或注明版本范围，可在干净环境中复现安装
- [ ] Python 版本约束已声明（如 `.python-version`、`pyproject.toml` `requires-python`）
- [ ] 无废弃的未使用依赖

### 3.5 可运维性（Web 服务）

- [ ] 健康检查接口已实现（`/health` 或等价）
- [ ] 优雅关闭已考虑（SIGTERM 处理）
- [ ] 容器部署场景下日志输出到 stdout，不仅写文件

---

## 四、验收结论输出

按 [SKILL_ACCEPTANCE.md](./SKILL_ACCEPTANCE.md) 中的“验收结论格式”写入对应计划文档。

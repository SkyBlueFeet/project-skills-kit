# 技能：计划目标验收 — Java 后端

> 适用栈：Spring Boot / Spring MVC / Spring Cloud / Quarkus 等 Java 后端项目。
> 上级入口：[SKILL_ACCEPTANCE.md](./SKILL_ACCEPTANCE.md)

---

## 一、功能目标核对

对照计划文档，逐条确认以下问题：

- [ ] 计划中声明的所有 Controller 端点均已实现，路径、HTTP 方法与设计一致
- [ ] 请求体/参数使用 JSR-303（`@Valid` / `@Validated`）完成校验，违规返回 400
- [ ] Service 层业务逻辑覆盖计划要求的核心场景（正常路径 + 异常路径）
- [ ] Repository / DAO 层的数据操作符合计划中的持久化要求
- [ ] 事务边界（`@Transactional`）设置正确，涉及多步写操作的场景已保护
- [ ] 对外依赖（外部 HTTP 调用、消息中间件、缓存）的集成符合计划要求

---

## 二、代码质量检查

```bash
# 编译与单元测试
mvn -q clean test          # Maven 项目
./gradlew clean test       # Gradle 项目

# 静态分析（如项目集成）
mvn checkstyle:check       # Checkstyle
mvn spotbugs:check         # SpotBugs
mvn pmd:check              # PMD

# 构建
mvn -q clean package -DskipTests   # 验证可打包
```

**判定要求：**
- 编译无报错
- 单元测试全部通过（或计划相关测试通过）
- 静态分析无 error 级别问题（warning 记录但不阻断）
- 可正常打包为可部署产物

---

## 三、非功能检查

### 3.1 接口健壮性

- [ ] 全局异常处理（`@ControllerAdvice` / `@RestControllerAdvice`）已配置
- [ ] 业务异常与系统异常有区分，响应体结构统一（code / message / data）
- [ ] 非法输入不暴露内部异常堆栈到响应体

### 3.2 日志规范

- [ ] 关键操作使用结构化日志（SLF4J + Logback/Log4j2），包含可追踪 ID
- [ ] 日志级别使用合理（DEBUG 用于开发诊断，INFO 用于关键流程，ERROR 用于异常）
- [ ] 敏感字段（密码、手机号、token）在日志中已脱敏

### 3.3 安全基线

- [ ] 数据库操作使用 JPA / MyBatis 参数绑定，无字符串拼接 SQL
- [ ] 密码类敏感字段存储已加密（BCrypt 或等价），不明文持久化
- [ ] Spring Security / 鉴权过滤器覆盖了需要保护的接口（如有鉴权需求）
- [ ] 依赖无已知高危 CVE（`mvn dependency:analyze` + OWASP Dependency Check，如集成）

### 3.4 性能基线

- [ ] 数据库实体关联查询避免了 `FetchType.EAGER` 导致的 N+1（JPA 项目）
- [ ] 高频查询字段加有索引（结合计划中的查询场景）
- [ ] 长耗时任务（报表、批量导入）使用异步处理（`@Async` / 消息队列），不阻塞请求线程

### 3.5 可运维性

- [ ] Spring Actuator 健康检查端点已开启（`/actuator/health`）
- [ ] 配置通过 `application.yml` / 环境变量外部化，未硬编码敏感信息
- [ ] Bean 加载与依赖注入无循环依赖（启动时会报错，确认启动日志无异常）
- [ ] 优雅关闭已配置（`server.shutdown=graceful`）

---

## 四、验收结论输出

按 [SKILL_ACCEPTANCE.md](./SKILL_ACCEPTANCE.md) 中的"验收结论格式"在 SESSIONS 中追加记录。

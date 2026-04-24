# 技能：代码快照管理（Repomix）

> 用途：在无上下文或快照失效时，使用 repomix 重新生成代码快照；在创建分析文档时归档当前快照。

## 何时需要重新生成快照

满足任一条件时先生成当前快照：
- `repomix-output.xml` 不存在。
- 代码引用出现错误（文件不存在、符号找不到）。
- 当前任务是新建 `developers/ANALYSIS/` 文档。
- 上次快照后源码有明显改动。

## 操作一：生成当前快照

```bash
npx repomix --ignore "**/node_modules/**,**/target/**,**/dist/**,**/*.{tif,shp,db,dll,so,exe},**/log/**"
```

## 操作二：归档快照

```bash
cp repomix-output.xml snapshots/repomix_YY-MM-DD.xml
```

## 操作三：有效性检查

失效信号：
- 文件路径不存在
- 符号已重命名或删除
- 快照日期明显落后且期间有改动

处理：重新生成当前快照；需追溯时同时归档。

## 相关规范

- 归档规则与版本锚点见：[`developers/DOC-RULES.md`](../DOC-RULES.md)

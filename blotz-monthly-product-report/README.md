# Blotz 中文产品月报

独立的 Claude Code / Codex skill：采集 App Store Connect 与 PostHog 聚合指标，并生成面向 PM 的中文 HTML 月报。

## 配置

仓库提交 `.env` 作为空值配置模板；本机真实的只读凭证写入 `.env.example`，该文件已被 Git 忽略。App Store `.p8` 文件必须放在仓库外，并在 `.env.example` 中使用绝对路径。

运行时先读取 `.env`，其中值为空的变量再从 `.env.example` 补齐。Shell 中已经存在的非空环境变量优先级最高。不要通过仓库分发 `.env.example` 或 `.p8` 私钥。

## Claude Code

从本仓库启动 Claude Code，然后输入：

```text
使用 monthly-product-report 生成 YYYY-MM 中文产品月报。
```

## Codex

从本仓库启动 Codex，然后输入：

```text
使用 $monthly-product-report 生成 YYYY-MM 中文产品月报。
```

最终产物写入 `reports/YYYY-MM/monthly-report.html`。原始 API 响应只在系统临时目录处理，并在聚合完成后自动删除。

部分查询失败时仍会生成可用数据，并在 snapshot 中标记来源为 `partial`。所有被请求的数据源均失败时，命令会保留诊断 snapshot 并返回非零退出码，不生成最终 HTML 报告。

## 测试

测试使用本地 fixture，不访问 App Store Connect 或 PostHog：

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v
```

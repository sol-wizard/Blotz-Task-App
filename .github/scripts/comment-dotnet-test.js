// .github/scripts/comment-dotnet-test.js
const fs = require("fs");
const path = require("path");

/**
 * 读取 ./blotztask-test/TestResults 下的 test_results.trx 和 coverage.cobertura.xml
 * 然后在当前 PR 下发一条评论
 */
module.exports = async function commentDotnetTest({ github, context }) {
  // 1. 路径
  const resultsDir = path.join(process.cwd(), "blotztask-test", "TestResults");
  const trxPath = path.join(resultsDir, "test_results.trx");

  // 2. 解析 TRX
  let total = 0;
  let executed = 0;
  let passed = 0;
  let failed = 0;
  let outcome = "Unknown";

  try {
    const trxXml = fs.readFileSync(trxPath, "utf8");

    // <ResultSummary outcome="Passed">
    const outcomeMatch = trxXml.match(/<ResultSummary[^>]*outcome="([^"]+)"/i);
    if (outcomeMatch) {
      outcome = outcomeMatch[1];
    }

    // <Counters total="2" executed="2" passed="2" failed="0" ... />
    const countersMatch = trxXml.match(
      /<Counters[^>]*total="(\d+)"[^>]*executed="(\d+)"[^>]*passed="(\d+)"[^>]*failed="(\d+)"/i
    );

    if (countersMatch) {
      total = Number(countersMatch[1]);
      executed = Number(countersMatch[2]);
      passed = Number(countersMatch[3]);
      failed = Number(countersMatch[4]);
    }
  } catch (e) {
    console.warn("Failed to read TRX file:", e);
  }

  let lineRatePct = null;

  try {
    const files = fs.readdirSync(resultsDir);
    const coverageFile = files.find((f) =>
      f.toLowerCase().endsWith("coverage.cobertura.xml")
    );

    if (coverageFile) {
      const coveragePath = path.join(resultsDir, coverageFile);
      const covXml = fs.readFileSync(coveragePath, "utf8");

      // <coverage line-rate="0.75" ...
      const covMatch = covXml.match(/<coverage[^>]*line-rate="([\d.]+)"/i);
      if (covMatch) {
        const lineRate = parseFloat(covMatch[1]); // 0.75
        if (!Number.isNaN(lineRate)) {
          lineRatePct = (lineRate * 100).toFixed(1); // 75.0
        }
      }
    }
  } catch (e) {
    console.warn("Failed to read coverage file:", e);
  }

  const lines = [];

  lines.push("### 🧪 .NET Test & Coverage Report");
  lines.push("");
  lines.push(
    `**Outcome:** ${
      failed > 0 || outcome.toLowerCase() === "failed"
        ? "❌ Failed"
        : "✅ Passed"
    } (${outcome})`
  );
  lines.push(`**Tests:** ${executed || total}/${total} executed`);
  lines.push(`**Passed:** ${passed}`);
  lines.push(`**Failed:** ${failed}`);

  if (lineRatePct !== null) {
    lines.push(`**Line coverage:** ${lineRatePct}%`);
  }

  lines.push("");
  lines.push(
    "<sub>Generated automatically from `test_results.trx` and XPlat Code Coverage.</sub>"
  );

  const body = lines.join("\n");

  await github.rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number,
    body,
  });
};

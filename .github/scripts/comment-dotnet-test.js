// .github/scripts/comment-dotnet-test.js
const fs = require("fs");
const path = require("path");

module.exports = async function commentDotnetTest({ github, context }) {
  // 1. 路径
  const resultsDir = path.join(process.cwd(), "blotztask-test", "TestResults");
  const trxPath = path.join(resultsDir, "test_results.trx");

  // 2. 解析 TRX（测试结果）
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

  // 3. 解析覆盖率 (XPlat Code Coverage → cobertura)
  function findCoverageFile(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(dir, file.name);

      if (file.isDirectory()) {
        const found = findCoverageFile(fullPath);
        if (found) return found;
      } else if (file.name.toLowerCase().endsWith("coverage.cobertura.xml")) {
        return fullPath;
      }
    }

    return null;
  }
  let coverageSummary = null;
  const coveragePackages = [];

  try {
    const coverageFilePath = findCoverageFile(resultsDir);

    if (coverageFilePath) {
      const covXml = fs.readFileSync(coverageFilePath, "utf8");

      // 根节点 summary：<coverage line-rate="0.75" branch-rate="0" lines-covered="402" lines-valid="33078" branches-covered="0" branches-valid="462" ...>
      const summaryMatch = covXml.match(
        /<coverage[^>]*line-rate="([\d.]+)"[^>]*branch-rate="([\d.]+)"[^>]*lines-covered="(\d+)"[^>]*lines-valid="(\d+)"[^>]*branches-covered="(\d+)"[^>]*branches-valid="(\d+)"/i
      );

      if (summaryMatch) {
        const lineRate = parseFloat(summaryMatch[1]); // 0.75
        const branchRate = parseFloat(summaryMatch[2]); // 0
        const linesCovered = Number(summaryMatch[3]);
        const linesValid = Number(summaryMatch[4]);
        const branchesCovered = Number(summaryMatch[5]);
        const branchesValid = Number(summaryMatch[6]);

        coverageSummary = {
          lineRatePct: (lineRate * 100).toFixed(1),
          branchRatePct: (branchRate * 100).toFixed(1),
          linesCovered,
          linesValid,
          branchesCovered,
          branchesValid,
        };
      } else {
        // 如果拿不到详细字段，至少取 line-rate
        const covMatch = covXml.match(/<coverage[^>]*line-rate="([\d.]+)"/i);
        if (covMatch) {
          const lineRate = parseFloat(covMatch[1]);
          coverageSummary = {
            lineRatePct: (lineRate * 100).toFixed(1),
          };
        }
      }

      // 每个 package：<package name="BlotzTask" line-rate="0.01" branch-rate="0" ...>
      const pkgRegex =
        /<package[^>]*name="([^"]+)"[^>]*line-rate="([\d.]+)"[^>]*branch-rate="([\d.]+)"/gi;
      let m;
      while ((m = pkgRegex.exec(covXml)) !== null) {
        const name = m[1];
        const lineRate = parseFloat(m[2]);
        const branchRate = parseFloat(m[3]);
        coveragePackages.push({
          name,
          lineRatePct: (lineRate * 100).toFixed(1),
          branchRatePct: (branchRate * 100).toFixed(1),
        });
      }
    }
  } catch (e) {
    console.warn("Failed to read coverage file:", e);
  }

  const healthEmoji = (ratePctStr) => {
    if (!ratePctStr) return "❓";
    const rate = parseFloat(ratePctStr);
    if (Number.isNaN(rate)) return "❓";
    if (rate >= 80) return "✅";
    if (rate >= 50) return "🟡";
    return "❌";
  };

  // 4. 组装评论内容
  const lines = [];

  // --- 测试结果 ---
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
  lines.push("");

  // --- 覆盖率表格 ---
  if (coverageSummary) {
    const summaryLine =
      coverageSummary.linesCovered != null && coverageSummary.linesValid != null
        ? `${coverageSummary.lineRatePct}% (${coverageSummary.linesCovered} / ${coverageSummary.linesValid})`
        : `${coverageSummary.lineRatePct}%`;

    const summaryBranchLine =
      coverageSummary.branchesCovered != null &&
      coverageSummary.branchesValid != null
        ? `${coverageSummary.branchRatePct}% (${coverageSummary.branchesCovered} / ${coverageSummary.branchesValid})`
        : coverageSummary.branchRatePct
        ? `${coverageSummary.branchRatePct}%`
        : "N/A";

    // 顶部小标签（类似 Code Coverage 1%）
    lines.push(`**Code Coverage:** ${coverageSummary.lineRatePct ?? "N/A"}%`);
    lines.push("");

    // Markdown 表格
    lines.push("| Package | Line Rate | Branch Rate | Health |");
    lines.push("|---------|-----------|-------------|--------|");

    // 每个 package 一行
    if (coveragePackages.length > 0) {
      for (const pkg of coveragePackages) {
        const health = healthEmoji(pkg.lineRatePct);
        lines.push(
          `| ${pkg.name} | ${pkg.lineRatePct}% | ${pkg.branchRatePct}% | ${health} |`
        );
      }
    }

    // Summary 行
    const summaryHealth = healthEmoji(coverageSummary.lineRatePct);
    lines.push(
      `| Summary | ${summaryLine} | ${summaryBranchLine} | ${summaryHealth} |`
    );
  } else {
    lines.push(
      "_No coverage data found (XPlat Code Coverage output not detected)._"
    );
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

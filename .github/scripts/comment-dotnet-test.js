// .github/scripts/comment-dotnet-test.js
const fs = require("fs");
const path = require("path");

module.exports = async function commentDotnetTest({ github, context }) {
  const resultsDir = path.join(process.cwd(), "blotztask-test", "TestResults");
  const trxPath = path.join(resultsDir, "test_results.trx");

  // 解析 TRX（测试结果）
  const testResults = parseTrxFile(trxPath);

  // 解析覆盖率
  const coverageFilePath = findCoverageFile(resultsDir);
  const { summary, packages } = parseCoverageFile(coverageFilePath);

  // 生成评论并发送
  const body = generateComment(testResults, summary, packages);

  await github.rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number,
    body,
  });
};

// ========== 辅助函数 ==========

function parseTrxFile(trxPath) {
  const defaults = {
    total: 0,
    executed: 0,
    passed: 0,
    failed: 0,
    outcome: "Unknown",
  };

  try {
    const trxXml = fs.readFileSync(trxPath, "utf8");

    const outcomeMatch = trxXml.match(/<ResultSummary[^>]*outcome="([^"]+)"/i);
    const countersMatch = trxXml.match(
      /<Counters[^>]*total="(\d+)"[^>]*executed="(\d+)"[^>]*passed="(\d+)"[^>]*failed="(\d+)"/i
    );

    if (!countersMatch) return defaults;

    return {
      outcome: outcomeMatch?.[1] || defaults.outcome,
      total: Number(countersMatch[1]),
      executed: Number(countersMatch[2]),
      passed: Number(countersMatch[3]),
      failed: Number(countersMatch[4]),
    };
  } catch (e) {
    console.warn("Failed to read TRX file:", e);
    return defaults;
  }
}

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

function parseCoverageFile(coverageFilePath) {
  if (!coverageFilePath) return { summary: null, packages: [] };

  try {
    const covXml = fs.readFileSync(coverageFilePath, "utf8");

    // 解析 summary
    const summaryMatch = covXml.match(
      /<coverage[^>]*line-rate="([\d.]+)"[^>]*branch-rate="([\d.]+)"[^>]*lines-covered="(\d+)"[^>]*lines-valid="(\d+)"[^>]*branches-covered="(\d+)"[^>]*branches-valid="(\d+)"/i
    );

    const summary = summaryMatch
      ? {
          lineRatePct: (parseFloat(summaryMatch[1]) * 100).toFixed(1),
          branchRatePct: (parseFloat(summaryMatch[2]) * 100).toFixed(1),
          linesCovered: Number(summaryMatch[3]),
          linesValid: Number(summaryMatch[4]),
          branchesCovered: Number(summaryMatch[5]),
          branchesValid: Number(summaryMatch[6]),
        }
      : extractFallbackLineRate(covXml);

    // 解析 packages
    const packages = [];
    const pkgRegex =
      /<package[^>]*name="([^"]+)"[^>]*line-rate="([\d.]+)"[^>]*branch-rate="([\d.]+)"/gi;
    let m;

    while ((m = pkgRegex.exec(covXml)) !== null) {
      packages.push({
        name: m[1],
        lineRatePct: (parseFloat(m[2]) * 100).toFixed(1),
        branchRatePct: (parseFloat(m[3]) * 100).toFixed(1),
      });
    }

    return { summary, packages };
  } catch (e) {
    console.warn("Failed to read coverage file:", e);
    return { summary: null, packages: [] };
  }
}

function extractFallbackLineRate(covXml) {
  const covMatch = covXml.match(/<coverage[^>]*line-rate="([\d.]+)"/i);
  return covMatch
    ? { lineRatePct: (parseFloat(covMatch[1]) * 100).toFixed(1) }
    : null;
}

function healthEmoji(ratePctStr) {
  if (!ratePctStr) return "❓";
  const rate = parseFloat(ratePctStr);
  if (Number.isNaN(rate)) return "❓";
  if (rate >= 80) return "✅";
  if (rate >= 50) return "🟡";
  return "❌";
}

function generateComment(testResults, coverageSummary, coveragePackages) {
  const lines = [];

  // 测试结果
  lines.push("### 🧪 .NET Test & Coverage Report");
  lines.push("");

  const testFailed =
    testResults.failed > 0 || testResults.outcome.toLowerCase() === "failed";
  lines.push(
    `**Outcome:** ${testFailed ? "❌ Failed" : "✅ Passed"} (${
      testResults.outcome
    })`
  );
  lines.push(
    `**Tests:** ${testResults.executed || testResults.total}/${
      testResults.total
    } executed`
  );
  lines.push(`**Passed:** ${testResults.passed}`);
  lines.push(`**Failed:** ${testResults.failed}`);
  lines.push("");

  // 覆盖率
  if (coverageSummary) {
    lines.push(`**Code Coverage:** ${coverageSummary.lineRatePct ?? "N/A"}%`);
    lines.push("");

    lines.push("| Package | Line Rate | Branch Rate | Health |");
    lines.push("|---------|-----------|-------------|--------|");

    // 每个 package
    coveragePackages.forEach((pkg) => {
      lines.push(
        `| ${pkg.name} | ${pkg.lineRatePct}% | ${
          pkg.branchRatePct
        }% | ${healthEmoji(pkg.lineRatePct)} |`
      );
    });

    // Summary 行
    const summaryLine = formatCoverageRate(
      coverageSummary.lineRatePct,
      coverageSummary.linesCovered,
      coverageSummary.linesValid
    );

    const summaryBranchLine = formatCoverageRate(
      coverageSummary.branchRatePct,
      coverageSummary.branchesCovered,
      coverageSummary.branchesValid
    );

    lines.push(
      `| Summary | ${summaryLine} | ${summaryBranchLine} | ${healthEmoji(
        coverageSummary.lineRatePct
      )} |`
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

  return lines.join("\n");
}

function formatCoverageRate(ratePct, covered, valid) {
  if (covered != null && valid != null) {
    return `${ratePct}% (${covered} / ${valid})`;
  }
  return ratePct ? `${ratePct}%` : "N/A";
}

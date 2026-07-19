---
name: generate-whatsnew
description: 每月做 Blotz app 的「What's New」更新引导页时用 —— 读未发布 release 草稿、挑出值得介绍给用户的新功能、截图 + 写文案、生成可左右滑的引导页预览 artifact(带「本次涵盖」审核清单),审核批准后把内容放进 app。Use when creating the monthly "What's New" / update-onboarding for an upcoming Blotz release.
---

# 生成 What's New 更新引导页

用户下载新版、第一次打开 app 时,用几张可滑的卡片介绍这一版的新功能。目标:**让新功能被看见、被用起来** —— 对容易忽略静默更新的 ADHD 用户尤其重要。

> 🚧 **这是初稿,整套流程还没真正跑通过一次。** 最贵、最容易卡住的是第③步(出 build 截图)。第一次认真跑这套的人:**边跑边把踩到的坑补进这个文件。**

## 谁做什么(重要)

- **🤖 Claude(每月)** —— 读草稿、挑功能、出 build 截图、生成 artifact 预览、按反馈改到满意、批准后把内容放进 app。**这个 skill 就是 Claude 这部分的作业手册。**
- **🛠 开发同事(只一次)** —— 在 app 里搭好一个 onboarding 式的 What's New 页(可滑卡片 + 更新时触发一次),并留一个**干净、集中的内容位置**(比如一个卡片数组:标题/正文/图片/语言)给 Claude 每月填。之后每月只**审核批准**。
- 完整背景 + 分工见 plan(交给同事的那份文档)。

## 每月流程

### ① 读内容源 —— 未发布 release 草稿

内容来自 GitHub Releases 里的 **`Next release (unreleased)` 草稿**(`sol-wizard/Blotz-Task-App`)。它由 AI 从每次合并的 PR 自动整理,已经分好「新功能 / Bug 修复 / Beta」,不用自己翻 PR。

```
gh api repos/sol-wizard/Blotz-Task-App/releases --jq '.[] | select(.draft==true) | .body'
```

GitHub 账号必须是 `sol-wizard`(`gh api user -q .login` 确认)。另一个账号 `Ben0189` 没有 `project` 权限,连私有仓库都解析不了,报错看起来像仓库没了、不像权限问题。**账号不对或任何 gh 认证问题:停下告诉 Ben,说清当前是哪个账号,别自己 `gh auth switch`** —— 那会改他全局的 gh 状态。

### ② 挑功能 + 决定配图还是文字

只挑**用户会注意、会在意**的功能。判断表:

| 功能类型 | 处理 | 为什么 |
|---|---|---|
| 有独立画面、好截图(如 Badge 详情页) | **配图** | 一张真实截图最直观 |
| 小功能 / 难截图(手势、滚动动作) | **纯文字** | 静图拍不出动作;必要时用 GIF,不用静图 |
| 后台 / 开发类改动(遥测、重构、版本号、时区内部逻辑) | **不进** | 用户不会为这些看一张卡 |

**记下你挑了什么、跳过了什么及原因** —— 第 ④ 步的审核清单要用。

### ③ 出素材(需要图的功能才做)

要截**真实**画面,不能网上找、不能凭空画。而且必须用**含这些未发布功能的 build**:旧 build 里没有,截不到。

⚠️ **这一步很贵** —— 出一个 build 排队 + 编译要 20 分钟起。所以:**先把②确定下来,一次性截完所有要的图**,别边想边截。如果这个月一张图都不需要(全是纯文字卡),整个③跳过。

#### 1. 拉最新 main

```
git -C development/Blotz-Task-App fetch origin --quiet
git -C development/Blotz-Task-App pull --ff-only origin main
git -C development/Blotz-Task-App log --oneline -1        # 记下截图用的是哪个 commit
```

Ben 的本地 main 是 origin 的**只读镜像**(他从不在上面写代码),所以**自动 pull,不用问**。`--ff-only` 是保险:它只会拒绝、不会合并。**万一 pull 失败(不是快进 / 会覆盖本地改动)—— 停下告诉 Ben。** 别用 `git stash` / `reset` / `checkout --` / merge 去「修」,那会毁掉别人的工作。

#### 2. 出 simulator build

在 `development/Blotz-Task-App/blotztask-mobile` 下跑,**默认加 `--local`**:

```
npx --yes eas-cli@latest build --profile preview-simulator --platform ios --local --non-interactive
```

**为什么一定要 `--local`(Ben 定,2026-07-19):** 不加就是跑 EAS 的云构建,**要消耗他们账号的构建配额**。他们本来每月就有 ~20 次发版构建,截图这种事没理由再占一次。`--local` 在 Ben 的 Mac 上编译,不走 EAS 服务器、不计费,代价只是占机器 15–30 分钟。

> ⚠️ `--local` **还没实际跑通过一次**(定这条规矩时只跑过云构建)。第一次跑的人:要是它挂了(缺 Xcode 组件、CocoaPods、fastlane 之类),**先把报错记到这里**,再决定是修本地环境还是这次先退回云构建。**退回云构建要先问 Ben** —— 那是花他钱。

- **`eas` 没装、也不是本地依赖** —— `eas` 和 `npx eas` 都会失败(`command not found` / `could not determine executable to run`)。必须 `npx --yes eas-cli@latest`。`--yes` 是关键:少了它 npx 会弹确认,半夜无人时直接卡死。
- **没有 `--simulator` 这个 flag**(eas-cli 21 已移除)。模拟器是配在 `eas.json` 的 `preview-simulator` profile 里的 —— 那个 profile 目前**未提交**,只在 Ben 本地。确认:`eas build:list --json` 里 `isForIosSimulator: true`。
- 用 `preview-simulator` 而不是 `npx expo run:ios`:后者是 debug build,和用户装到的东西不是一回事。
- 建议**后台跑**,这期间去写文案。跑之前先 `build:list` 看一眼:如果最新那个 simulator build 的 commit 就是现在的 main,直接拿来用,别重复出。
- `--local` 的产物直接落在当前目录(不用下载);云构建才需要下 `.tar.gz`。

装进模拟器:下载 `.tar.gz` 产物 → 解压 → `xcrun simctl install booted BlotzTask.app` → `xcrun simctl launch booted com.Blotz.BlotzTask.staging`。

#### 3. 驱动 app 截图(Maestro 2.6.1)

**先确认账号**:Settings → Account 要显示 `blotztest1@gmail.com`(显示名是 "Nicole",这就是测试号)。模拟器的 Safari cookie 会跨重装保留 Auth0 session,登录常被静默跳过 —— 别假设当前是谁。

踩过的坑:

- **按文字点基本点不中** —— app 里大多数元素没有可访问性名字,`tapOn: "Account"` 这类经常失败。用坐标百分比 `point: "X%,Y%"`。
- **百分比必须是整数** —— `92.5%` 会抛 `NumberFormatException`。
- **键盘会顶起布局** —— 对着底部控件的坐标点击可能落在键盘上。先收键盘。
- **等动画** —— 用 `extendedWaitUntil`。刚跳转就截图/点击,多半是时机问题不是坏了。
- **系统弹窗 Maestro 看不见**(比如通知授权),只能按坐标点。
- **截图报 "Macintosh HD is read only"** → `killall -9 com.apple.CoreSimulator.CoreSimulatorService`,然后重启模拟器。截图一律写 `/private/tmp` 下,别写 `$HOME`。
- **缺 testID 不要自己加。** (testID = 给按钮加个隐藏名牌,让点击不会落错位置;一个按钮一行代码,得开发来加。)记下来告诉 Ben,产品代码改不改是他的事。跟他提的时候**每次都从头解释**,别甩这个词 —— 他不是做自动化的。

截到的图放 `/private/tmp/blotz-onboarding-shots/`,缩到宽 ~480 再用(`sips --resampleWidth 480`)。

### ④ 生成预览 artifact(带审核清单)

做一个手机样子的、可左右滑的 What's New 引导页,**顶/底附一个「本次涵盖」清单**:左边放了哪些功能(带 图/文字/占位 标记),右边跳过了哪些(每条一句原因)。审核的人对着清单看很快。

- 参考已有原型和生成脚本(在 Ben 的 scratchpad:`blotz-whatsnew.html` / `gen_whatsnew.py`)—— 截图用 base64 内嵌(artifact 不能连外部图),深浅色都做。
- 视觉取 app 本身:檸檬绿强调、深墨绿灰文字、圆体标题(`ui-rounded`)、吉祥物渐层。
- 发布前按 `artifact-design` skill 走一遍。

### ⑤ 审核 · 改到满意

把 artifact 给审核的人(开发同事 / Ben)。不满意就改 —— 文案、选哪些功能、截图对不对。**改到对方说 OK 为止**,别自己拍板放行。

### ⑥ 放进 app

批准后,**Claude 直接改代码,但不提 PR**(Ben 定,2026-07-19)。

1. 开一个分支,把文案和图片填进开发同事留好的卡片位置。
2. 交给开发,告诉他分支名和改了哪些文件。
3. **开发在本地打开 app,把引导页滑一遍,确认显示正常 —— 然后由开发提 PR。**

Claude 不提 PR、不合并、不自己判定「能用」。理由:引导页是每个用户升级后第一眼看到的东西,而 Claude 没在真机/本地跑过就不知道它长什么样。开发本地看那一眼是这条流程唯一的把关点,不能跳。

## 内容规范

- **中英双语** —— 每张卡中英各一版,跟随用户语言(app 已支持中英)。
- 文案从用户角度写,短、具体、说清「这个新功能能帮你做什么」。
- 卡片形式:一页一个功能,图或文字 + 标题 + 一句说明;底部圆点 + 下一步/跳过。

## 注意

- 原型里的截图/文案是一次性示意,**不要直接上线**。
- 现在**不做**:自动化流水线、远程配置/CMS、A/B —— 都留到以后。
- 只放**未发布**的功能;已 released 的用户早看过了,别放。

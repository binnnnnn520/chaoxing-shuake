import type { ChaoXingTask } from "../shared/contracts";

export class ScanError extends Error {
  constructor(message: string, readonly hint?: string) {
    super(message);
  }
}

/**
 * 扫描当前 active tab。要求用户在课程章节学习页(studentstudy)。
 * 通过右侧目录提取所有章节,每个章节作为一个任务点。
 */
export async function scanActiveTab(): Promise<ChaoXingTask[]> {
  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!activeTab?.id || !activeTab.url) {
    throw new ScanError("没有找到活动标签页", "请先打开学习通课程章节页再扫描");
  }

  const url = new URL(activeTab.url);
  if (!url.hostname.endsWith("chaoxing.com")) {
    throw new ScanError(
      "当前页面不是学习通",
      `当前 URL 是 ${url.hostname},请打开 chaoxing.com 域名下的课程章节页`
    );
  }

  if (!url.pathname.includes("studentstudy")) {
    throw new ScanError(
      "当前不是课程章节页",
      "请进入某门课的章节学习页(URL 含 mycourse/studentstudy)再扫描"
    );
  }

  const now = Date.now();

  const results = await chrome.scripting.executeScript({
    target: { tabId: activeTab.id, allFrames: false },
    func: parseTasksFromActiveTab,
    args: [now],
  });

  const tasks = (results[0]?.result as ChaoXingTask[] | undefined) ?? [];
  console.log(`[chaoxing-scan] 最终返回 ${tasks.length} 个任务`, tasks);

  return tasks;
}

/**
 * 在标签页上下文中执行的 DOM 解析函数。
 * 必须是纯函数,不能引用外部闭包(因为会被序列化注入)。
 *
 * 解析策略(按可靠性排序):
 * 1. 从 hidden input 读 curCourseId / curClazzId / curCpi (学习通章节页固定有)
 * 2. 从右侧目录 #selector 里的章节链接提取所有 chapterId
 * 3. 每个章节构造完整 URL,作为一个任务
 * 4. 兜底: 找不到目录时,只把当前页加为任务
 */
function parseTasksFromActiveTab(now: number): ChaoXingTask[] {
  // ── 1. 从 hidden input 提取课程上下文 ──────────────
  function getInputValue(id: string): string {
    return (
      (document.getElementById(id) as HTMLInputElement | null)?.value ?? ""
    );
  }

  const courseId = getInputValue("curCourseId");
  const clazzId = getInputValue("curClazzId");
  const cpi = getInputValue("curCpi");
  const currentChapterId = getInputValue("curChapterId");

  if (!courseId || !clazzId) {
    console.warn(
      "[chaoxing-scan] 未找到 curCourseId / curClazzId hidden input,可能不是标准章节页"
    );
    return [];
  }

  console.log("[chaoxing-scan] 课程上下文:", {
    courseId,
    clazzId,
    cpi,
    currentChapterId,
  });

  // ── 2. 取课程名 ───────────────────────────────────
  function getCourseName(): string {
    const title = document.title?.split(/[-_]/)[0]?.trim();
    if (title && title !== "学生学习页面") return title;
    const h1 = document.querySelector("h1, h2")?.textContent?.trim();
    return h1 || "学习通课程";
  }
  const courseName = getCourseName();

  // ── 3. 从右侧目录提取所有章节链接 ─────────────────
  // 学习通章节目录:#selector 容器 → .chapter#content1 → 章节列表
  // 每个章节是一个 <div class="chapterItem"> 或类似,内含 onclick 跳转/数据属性

  const seenChapterIds = new Set<string>();
  const chapterTasks: ChaoXingTask[] = [];

  function buildTaskUrl(chapterId: string): string {
    const u = new URL("https://mooc1.chaoxing.com/mycourse/studentstudy");
    u.searchParams.set("chapterId", chapterId);
    u.searchParams.set("courseId", courseId);
    u.searchParams.set("clazzid", clazzId);
    if (cpi) u.searchParams.set("cpi", cpi);
    return u.toString();
  }

  function pushTask(chapterId: string, title: string, progress = 0) {
    if (!chapterId || seenChapterIds.has(chapterId)) return;
    seenChapterIds.add(chapterId);
    chapterTasks.push({
      id: `${courseId}_${chapterId}`,
      courseId,
      chapterId,
      taskId: chapterId,
      title: title.slice(0, 80),
      courseName,
      taskUrl: buildTaskUrl(chapterId),
      state: "pending",
      progress,
      tabId: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
      restoreAttempts: 0,
    });
  }

  // 策略 3a: 找带 onclick 跳转 chapterId 的元素 (学习通最常见模式)
  // 例如 onclick="getTeacherAjax('261191355','145218721','1129066261')"
  const allClickable = document.querySelectorAll<HTMLElement>(
    "#selector [onclick*='chapterId'], #selector [onclick*='getTeacherAjax'], #selector [onclick*='Catalog']"
  );
  console.log(`[chaoxing-scan] 目录中带 onclick 的元素数量: ${allClickable.length}`);

  allClickable.forEach((el) => {
    const onclickAttr = el.getAttribute("onclick") || "";
    // 试图从 onclick 提取 chapterId / 第三参数(常见格式 getTeacherAjax(courseId,clazzId,chapterId))
    let chapterId = "";
    const cidMatch = onclickAttr.match(/chapterId['"]?\s*[:=]\s*['"]?(\d+)/);
    if (cidMatch) chapterId = cidMatch[1];
    if (!chapterId) {
      const argsMatch = onclickAttr.match(/\(\s*['"](\d+)['"]\s*,\s*['"](\d+)['"]\s*,\s*['"](\d+)['"]/);
      if (argsMatch) chapterId = argsMatch[3];
    }
    const title = el.textContent?.trim() || `章节 ${chapterId}`;
    if (chapterId) pushTask(chapterId, title);
  });

  // 策略 3b: 找 data-chapterid 属性的元素
  document.querySelectorAll<HTMLElement>("#selector [data-chapterid]").forEach((el) => {
    const chapterId = el.getAttribute("data-chapterid") || "";
    const title = el.textContent?.trim() || `章节 ${chapterId}`;
    if (chapterId) pushTask(chapterId, title);
  });

  // 策略 3c: 找带 chapterId 参数的链接
  document.querySelectorAll<HTMLAnchorElement>("#selector a[href*='chapterId']").forEach((el) => {
    try {
      const u = new URL(el.href, location.href);
      const chapterId = u.searchParams.get("chapterId") || "";
      const title = el.textContent?.trim() || `章节 ${chapterId}`;
      if (chapterId) pushTask(chapterId, title);
    } catch {
      // 忽略无效链接
    }
  });

  console.log(`[chaoxing-scan] 从目录提取到 ${chapterTasks.length} 个章节任务`);

  // ── 4. 兜底: 如果目录提取失败,把当前页本身作为一个任务 ─
  if (chapterTasks.length === 0 && currentChapterId) {
    console.log("[chaoxing-scan] 目录扫不到,使用当前章节作为单任务兜底");
    pushTask(currentChapterId, document.title || "当前章节");
  }

  return chapterTasks;
}

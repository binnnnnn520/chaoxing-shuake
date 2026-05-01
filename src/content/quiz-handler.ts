// 学习通随堂题常见容器选择器（从常用到兜底）
const QUIZ_SELECTORS = [
  ".pptquestion",
  ".Questionnaire",
  ".ans-job-icon-question",
  "[id*='question']",
];

export function startQuizHandler(checkIntervalMs = 3_000): ReturnType<typeof setInterval> {
  return setInterval(() => {
    for (const sel of QUIZ_SELECTORS) {
      const modal = document.querySelector(sel);
      if (!modal) continue;

      // 随机选一个选项
      const options = modal.querySelectorAll<HTMLInputElement>(
        'input[type="radio"], input[type="checkbox"]'
      );
      if (options.length > 0) {
        const pick = options[Math.floor(Math.random() * options.length)];
        pick.click();
      }

      // 点提交按钮
      const submitBtn = modal.querySelector<HTMLElement>(
        'button[type="submit"], .submitBtn, [class*="submit"], .sure'
      );
      submitBtn?.click();
      break;
    }
  }, checkIntervalMs);
}

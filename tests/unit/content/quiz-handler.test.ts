import { afterEach, describe, expect, it, vi } from "vitest";
import { startQuizHandler } from "../../../src/content/quiz-handler";

describe("startQuizHandler", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("检测到 .pptquestion 时随机点击一个 radio 并点提交", () => {
    document.body.innerHTML = `
      <div class="pptquestion">
        <input type="radio" name="q" value="A" />
        <input type="radio" name="q" value="B" />
        <button class="submitBtn">提交</button>
      </div>
    `;

    const radios = document.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    const clickedValues: string[] = [];
    radios.forEach((r) => r.addEventListener("click", () => clickedValues.push(r.value)));

    const submitBtn = document.querySelector<HTMLElement>(".submitBtn")!;
    const submitSpy = vi.spyOn(submitBtn, "click");

    vi.useFakeTimers();
    const timer = startQuizHandler(1000);
    vi.advanceTimersByTime(1000);

    expect(clickedValues).toHaveLength(1); // 只点了一个
    expect(submitSpy).toHaveBeenCalledOnce();

    clearInterval(timer);
    vi.useRealTimers();
  });
});

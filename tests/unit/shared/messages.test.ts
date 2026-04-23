import { describe, expect, expectTypeOf, it } from "vitest";
import type { TaskRecord } from "../../../src/shared/contracts";
import type { RuntimeCommandMessage } from "../../../src/shared/messages";

describe("RuntimeCommandMessage", () => {
  it("uses command-specific payload shapes", () => {
    expectTypeOf<
      Extract<RuntimeCommandMessage, { type: "tasks/add" }>["payload"]
    >().toEqualTypeOf<{ tasks: TaskRecord[] }>();

    expectTypeOf<
      Extract<RuntimeCommandMessage, { type: "tasks/start" }>["payload"]
    >().toEqualTypeOf<{ taskIds: string[] }>();

    expectTypeOf<
      Extract<RuntimeCommandMessage, { type: "tasks/pause" }>["payload"]
    >().toEqualTypeOf<{ taskIds: string[] }>();

    expectTypeOf<
      Extract<RuntimeCommandMessage, { type: "tasks/stop" }>["payload"]
    >().toEqualTypeOf<{ taskIds: string[] }>();

    expectTypeOf<
      Extract<RuntimeCommandMessage, { type: "tasks/delete" }>["payload"]
    >().toEqualTypeOf<{ taskIds: string[] }>();

    expectTypeOf<
      Extract<RuntimeCommandMessage, { type: "tasks/set-audio" }>["payload"]
    >().toEqualTypeOf<{
      taskId: string;
      muted: boolean;
      volume: number;
      rate: number;
    }>();

    const snapshotRequest: RuntimeCommandMessage = {
      type: "tasks/snapshot-request"
    };

    expect(snapshotRequest.type).toBe("tasks/snapshot-request");
  });

  it("rejects mismatched payloads at compile time", () => {
    const invalidMessage: RuntimeCommandMessage = {
      type: "tasks/start",
      // @ts-expect-error tasks/start requires taskIds instead of task records
      payload: { tasks: [] }
    };

    expect(invalidMessage.type).toBe("tasks/start");
  });
});

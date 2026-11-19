import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Exercise the production request builders without loading the native UI or adding a test framework.
const filename = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/feature/ai-coach/models/review-list.ts",
);
const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const loaded = new Module(filename);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded._compile(compiled, filename);
const {
  reviewedItems,
  noteTextLength,
  prepareReviewConfirmation,
  reviewConfirmationSaved,
  isDefiniteConfirmationRejection,
} = loaded.exports;

function snapshot() {
  const list = {
    id: "batch-1",
    version: 4,
    status: "pending",
    isReviewList: true,
    payload: {
      items: [
        {
          kind: "task",
          itemId: "task-1",
          title: "Read",
          description: null,
          date: "2026-10-20",
          startTime: "09:00",
          endTime: "10:00",
          timeZoneId: "Australia/Perth",
          labelId: 6,
          recurrence: { frequency: "Daily", interval: 2 },
          suggestedFields: ["endTime"],
        },
        {
          kind: "note",
          itemId: "note-1",
          title: "APA",
          description: "Use seventh edition",
          date: null,
          startTime: null,
          endTime: null,
          timeZoneId: "Australia/Perth",
          labelId: null,
          recurrence: null,
          persistedTaskId: null,
          persistedNoteId: null,
          suggestedFields: [],
        },
      ],
    },
  };
  return {
    conversationId: "conversation-1",
    conversationVersion: 8,
    pendingList: list,
    artifacts: [list],
  };
}

test("note confirmation excludes every task-only and saved-result field", () => {
  const note = reviewedItems(snapshot().pendingList).items[1];
  assert.deepEqual(note, {
    kind: "note",
    itemId: "note-1",
    title: "APA",
    description: "Use seventh edition",
  });
});

test("task confirmation preserves its own zone, label and recurrence", () => {
  const input = snapshot();
  const task = reviewedItems(input.pendingList).items[0];
  assert.equal(task.timeZoneId, "Australia/Perth");
  assert.equal(task.labelId, 6);
  assert.deepEqual(task.recurrence, input.pendingList.payload.items[0].recurrence);
  assert.equal(Object.hasOwn(task, "suggestedFields"), false);
});

test("add_all includes every item and omits selectedItemIds", () => {
  const operation = prepareReviewConfirmation(snapshot(), "command-1", null);
  assert.equal(operation.request.action, "add_all");
  assert.equal(operation.request.commandId, "command-1");
  assert.equal(operation.request.expectedConversationVersion, 8);
  assert.equal(operation.request.expectedDraftVersion, 4);
  assert.equal(operation.request.editedDraft.items.length, 2);
  assert.equal(Object.hasOwn(operation.request, "selectedItemIds"), false);
});

test("an uncertain retry keeps the exact original ID, versions, content and conflict token", () => {
  const original = prepareReviewConfirmation(snapshot(), "command-1", null, true, "conflict-1");
  const before = JSON.stringify(original);
  const changed = snapshot();
  changed.conversationVersion = 99;
  changed.pendingList.version = 44;
  changed.pendingList.payload.items[1].description = "New remote content";
  const retry = prepareReviewConfirmation(changed, "command-2", original, false, "different-token");
  assert.equal(retry, original);
  assert.equal(JSON.stringify(retry), before);
});

test("retry can retain the original request while current pendingList is temporarily absent", () => {
  const original = prepareReviewConfirmation(snapshot(), "command-1", null);
  const next = { ...snapshot(), pendingList: null };
  assert.equal(prepareReviewConfirmation(next, "command-2", original), original);
  assert.equal(prepareReviewConfirmation(next, "command-2", null), null);
});

test("a corrected attempt after definite rejection uses new reviewed content and a new command", () => {
  const changed = snapshot();
  changed.pendingList.payload.items[1].description = "Corrected content";
  const operation = prepareReviewConfirmation(changed, "new-command", null);
  assert.equal(operation.request.commandId, "new-command");
  assert.equal(operation.request.editedDraft.items[1].description, "Corrected content");
});

test("network errors and generic server errors do not prove rejection", () => {
  for (const status of [undefined, 500, 502, 503, 504])
    assert.equal(isDefiniteConfirmationRejection(status), false);
  for (const status of [400, 409, 422]) assert.equal(isDefiniteConfirmationRejection(status), true);
});

test("completed snapshot settles only the matching conversation and batch", () => {
  const operation = prepareReviewConfirmation(snapshot(), "command-1", null);
  const completed = snapshot();
  completed.artifacts[0].status = "completed";
  assert.equal(reviewConfirmationSaved(operation, completed), true);
  assert.equal(reviewConfirmationSaved(operation, snapshot()), false);
  assert.equal(
    reviewConfirmationSaved(operation, { ...completed, conversationId: "another-conversation" }),
    false,
  );
  assert.equal(
    reviewConfirmationSaved({ ...operation, draftId: "another-batch" }, completed),
    false,
  );
});

test("note character limit uses trimmed title and body plus exactly one newline", () => {
  assert.equal(noteTextLength(" APA ", " Use seventh edition "), 3 + 1 + 19);
  assert.equal(noteTextLength(" APA ", "   "), 3);
  assert.equal(noteTextLength("T", "x".repeat(1998)), 2000);
  assert.equal(noteTextLength("T", "x".repeat(1999)), 2001);
});

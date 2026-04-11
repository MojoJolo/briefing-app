# Briefing — Swift/SwiftUI Universal App: Implementation Plan

## Context

**Briefing** is a task management tool for engineering leaders. Users type free-form work notes; Claude AI parses them into categorized, actionable tasks. The current app is a React + FastAPI + PostgreSQL web app. This document specifies a **complete native rewrite** as a universal Swift/SwiftUI app (macOS 14+ and iOS 17+) with local SwiftData persistence — eliminating the Python backend entirely. The Swift app calls the Anthropic API directly over HTTPS.

---

## 1. Project Setup

### Xcode Configuration

- **Template**: Multiplatform App (SwiftUI + SwiftData checked)
- **Project name**: `Briefing`
- **Bundle ID**: `com.briefing.app`
- **Deployment targets**: iOS 17.0, macOS 14.0
- **Swift version**: 5.10+
- **No third-party dependencies** — URLSession only

### Capabilities

- Keychain access (store API key securely)
- Outbound HTTPS is allowed by default on both platforms

---

## 2. Architecture: MVVM + SwiftData

```
SwiftUI Views
  ContentView → TimelineView → TaskRowView
             → CommentSectionView → InputBarView
       ↕ @EnvironmentObject
AppViewModel (ObservableObject, @MainActor)
  • openTasks / doneTasks (derived from SwiftData)
  • selectedTab, inputText, isProcessing, submitError
  • justMarkedDone: Set<UUID>
  • expandedTaskIDs: Set<UUID>
       ↕                    ↕
SwiftData ModelContext     AnthropicService (struct)
  TaskItem @Model            extractTasks(from:) async throws
  CommentItem @Model
       ↕
KeychainService (static helpers)
```

- `AppViewModel` is the single source of truth for UI state; owns `ModelContext`; all mutations go through it
- Views observe via `@EnvironmentObject`; pass only what they need via `let` / `@Binding`
- `AnthropicService` is a pure struct injected into the ViewModel
- `KeychainService` is a static helper — API key stored in the Keychain on first launch

---

## 3. Data Layer — SwiftData Models

### `Models/TaskItem.swift`

```swift
import SwiftData
import Foundation

@Model
final class TaskItem {
    @Attribute(.unique) var id: UUID
    var task: String            // AI-processed text
    var originalInput: String   // raw user input
    var showOriginal: Bool      // false = show AI text
    var category: String        // "BLOCKER"|"ISSUE"|"PENDING"|"DELEGATED"|"IDEA"|""
    var status: Int             // 0=open, 1=done, -1=deleted
    var createdAt: Date
    var updatedAt: Date

    @Relationship(deleteRule: .cascade, inverse: \CommentItem.task)
    var comments: [CommentItem] = []

    var commentCount: Int { comments.count }

    init(id: UUID = UUID(), task: String, originalInput: String, category: String = "", status: Int = 0) {
        self.id = id
        self.task = task
        self.originalInput = originalInput
        self.showOriginal = false
        self.category = category
        self.status = status
        self.createdAt = Date()
        self.updatedAt = Date()
    }
}
```

### `Models/CommentItem.swift`

```swift
import SwiftData
import Foundation

@Model
final class CommentItem {
    @Attribute(.unique) var id: UUID
    var comment: String
    var createdAt: Date
    var updatedAt: Date
    var task: TaskItem?

    init(id: UUID = UUID(), comment: String, task: TaskItem) {
        self.id = id
        self.comment = comment
        self.task = task
        self.createdAt = Date()
        self.updatedAt = Date()
    }
}
```

### `BriefingApp.swift` container setup

```swift
@main
struct BriefingApp: App {
    var body: some Scene {
        WindowGroup {
            ModelContainerView()
        }
        #if os(macOS)
        Settings { SettingsView() }
        #endif
    }
}

// Bridges modelContext into AppViewModel
struct ModelContainerView: View {
    @Environment(\.modelContext) private var ctx
    var body: some View {
        ContentView().environmentObject(AppViewModel(modelContext: ctx))
    }
}
```

Add `.modelContainer(for: [TaskItem.self, CommentItem.self])` to the `WindowGroup`.

---

## 4. Networking — Anthropic API (Direct HTTPS)

### Endpoint

```
POST https://api.anthropic.com/v1/messages
Headers:
  x-api-key: <ANTHROPIC_API_KEY>
  anthropic-version: 2023-06-01
  content-type: application/json
```

### Request Body

```json
{
  "model": "claude-haiku-4-5",
  "max_tokens": 1024,
  "system": "<SYSTEM_PROMPT>",
  "tools": [<TOOL_DEFINITION>],
  "tool_choice": { "type": "tool", "name": "extract_tasks" },
  "messages": [{ "role": "user", "content": "<user input>" }]
}
```

### System Prompt (copy verbatim from `backend/app/llm/claude.py` lines 6–24)

```
You are a task parser for a work briefing app. Given free-form input from a user, extract one or more actionable tasks. Most tasks should have no label (empty string). Only assign a label when the text clearly implies one.

For each task return:
- text: fix spelling errors and unclear phrasing only. Do not change the grammatical structure or voice of the input — if the user writes a noun phrase, keep it a noun phrase; do not convert to imperative form. Always preserve URLs and links exactly as provided. For DELEGATED tasks, always preserve the person's name exactly as written.
- category: a label for the task. Use "" (empty string) for normal tasks. Only assign a label when clearly implied:
  - BLOCKER: progress is blocked (e.g. "blocked", "cannot proceed", "failing", "stuck because")
  - ISSUE: a problem needing investigation (e.g. "issue", "bug", "investigate", "check why")
  - PENDING: waiting or follow-up needed (e.g. "follow up", "waiting for", "pending reply", "check back later")
  - DELEGATED: another person is expected to do the work (e.g. "X to check", "ask X to", "Gene to investigate", "Kris to confirm"). Always keep the person's name in the text.
  - IDEA: a suggestion, proposal, or thing to consider (e.g. "idea", "what if", "we could", "might be worth")
  - "": everything else — most tasks should use this

Do not force classification. When in doubt, leave the category as "".

Always call the extract_tasks tool with your result.
```

### Tool Definition (copy verbatim from `backend/app/llm/claude.py` lines 26–48)

```json
{
  "name": "extract_tasks",
  "description": "Extract and classify tasks from the user's input.",
  "input_schema": {
    "type": "object",
    "properties": {
      "tasks": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "text": { "type": "string" },
            "category": {
              "type": "string",
              "enum": ["BLOCKER", "ISSUE", "PENDING", "DELEGATED", "IDEA", ""]
            }
          },
          "required": ["text", "category"]
        }
      }
    },
    "required": ["tasks"]
  }
}
```

### Response Parsing

Walk `response.content`; find the element where `type == "tool_use"` and `name == "extract_tasks"`; decode `input.tasks`.

```swift
struct MessagesResponse: Decodable {
    let content: [ContentBlock]
}
struct ContentBlock: Decodable {
    let type: String
    let name: String?
    let input: ToolInput?
}
struct ToolInput: Decodable {
    let tasks: [RawTask]
}
struct RawTask: Decodable {
    let text: String
    let category: String
}
```

### `Services/AnthropicService.swift`

```swift
struct ExtractedTask {
    let text: String
    let category: String
}

enum AnthropicError: LocalizedError {
    case missingAPIKey
    case networkError(Error)
    case unexpectedResponse
    case apiError(String)
}

struct AnthropicService {
    private let apiKey: String
    private let model = "claude-haiku-4-5"
    private let endpoint = URL(string: "https://api.anthropic.com/v1/messages")!

    init(apiKey: String) { self.apiKey = apiKey }

    func extractTasks(from input: String) async throws -> [ExtractedTask] {
        guard !apiKey.isEmpty else { throw AnthropicError.missingAPIKey }
        // Build body dict, set headers, URLSession.shared.data(for:)
        // Decode MessagesResponse, find tool_use block
        // Return [ExtractedTask]
    }
}
```

### `Services/KeychainService.swift`

```swift
struct KeychainService {
    static func saveAPIKey(_ key: String)      // SecItemAdd / SecItemUpdate
    static func loadAPIKey() -> String?         // SecItemCopyMatching
    static func deleteAPIKey()                  // SecItemDelete
}
```

Use `kSecClassGenericPassword`, service = `"com.briefing.app"`, account = `"anthropic-api-key"`.

---

## 5. ViewModel

### `ViewModels/AppViewModel.swift`

```swift
@MainActor
final class AppViewModel: ObservableObject {
    @Published var selectedTab: Tab = .open
    @Published var inputText: String = ""
    @Published var isProcessing = false
    @Published var submitError: String? = nil
    @Published var justMarkedDone: Set<UUID> = []
    @Published var expandedTaskIDs: Set<UUID> = []
    @Published var apiKey: String = ""

    private var modelContext: ModelContext

    enum Tab { case open, done }

    init(modelContext: ModelContext) {
        self.modelContext = modelContext
        self.apiKey = KeychainService.loadAPIKey() ?? ""
    }

    // MARK: - Computed queries
    var openTasks: [TaskItem]     // fetch: status != -1, sorted createdAt desc
                                  // filter: status == 0 || justMarkedDone.contains(id)
    var doneTasks: [TaskItem]     // fetch: status == 1, sorted updatedAt desc

    // MARK: - Timeline grouping (see BucketHelper)
    func groupedOpenTasks() -> [(bucket: String, tasks: [TaskItem])]
        // group openTasks by createdAt bucket, sort within bucket ASC
    func groupedDoneTasks() -> [(bucket: String, tasks: [TaskItem])]
        // group doneTasks by updatedAt bucket, sort within bucket DESC

    // MARK: - Mutations
    func submitInput() async         // call AnthropicService, insert TaskItems, save
    func toggleStatus(_ task: TaskItem)   // flip 0↔1; justMarkedDone for 3s fade
    func editTask(_ task: TaskItem, newText: String)
    func changeCategory(_ task: TaskItem, to category: String)
    func toggleShowOriginal(_ task: TaskItem)
    func deleteTask(_ task: TaskItem)     // soft delete: status = -1

    // MARK: - Comments
    func addComment(to task: TaskItem, text: String)
    func editComment(_ comment: CommentItem, newText: String)
    func deleteComment(_ comment: CommentItem)   // hard delete

    // MARK: - Settings
    func saveAPIKey(_ key: String)   // save to Keychain, update self.apiKey
}
```

**Just-marked-done fade**: after `toggleStatus` sets status=1, add UUID to `justMarkedDone`; `Task.sleep(for: .seconds(3))`; remove from set. Tasks in `justMarkedDone` stay in the open list with `.opacity(0.2)` animated fade.

---

## 6. Timeline Bucketing

### `Utilities/BucketHelper.swift`

Port `getBucket()` from `frontend/src/components/TimelineView.jsx` lines 6–29 **exactly**. Weeks are Monday-based (JS `dayOfWeek === 0 ? 6 : dayOfWeek - 1`).

```swift
enum BucketHelper {
    static let orderedBuckets = [
        "Older", "Last Month", "Four Weeks Ago", "Three Weeks Ago",
        "Two Weeks Ago", "Last Week", "This Week", "Yesterday", "Today"
    ]

    static func bucket(for date: Date, relativeTo now: Date = Date()) -> String {
        let cal = Calendar(identifier: .gregorian)
        let todayStart = cal.startOfDay(for: now)
        let yesterdayStart = todayStart.addingTimeInterval(-86400)
        let weekday = cal.component(.weekday, from: now)  // 1=Sun
        let daysFromMonday = weekday == 1 ? 6 : weekday - 2
        let thisWeekStart = todayStart.addingTimeInterval(-Double(daysFromMonday) * 86400)
        let lastWeekStart = thisWeekStart.addingTimeInterval(-7 * 86400)
        let twoWeeksAgoStart = thisWeekStart.addingTimeInterval(-14 * 86400)
        let threeWeeksAgoStart = thisWeekStart.addingTimeInterval(-21 * 86400)
        let fourWeeksAgoStart = thisWeekStart.addingTimeInterval(-28 * 86400)
        var comps = cal.dateComponents([.year, .month], from: now)
        comps.month = (comps.month ?? 1) - 1
        let lastMonthStart = cal.date(from: comps) ?? .distantPast

        if date >= todayStart      { return "Today" }
        if date >= yesterdayStart  { return "Yesterday" }
        if date >= thisWeekStart   { return "This Week" }
        if date >= lastWeekStart   { return "Last Week" }
        if date >= twoWeeksAgoStart   { return "Two Weeks Ago" }
        if date >= threeWeeksAgoStart { return "Three Weeks Ago" }
        if date >= fourWeeksAgoStart  { return "Four Weeks Ago" }
        if date >= lastMonthStart  { return "Last Month" }
        return "Older"
    }
}
```

---

## 7. Color Tokens

### `Utilities/ColorTokens.swift`

```swift
extension Color {
    init(hex: String) { /* standard hex → r,g,b → Color(red:green:blue:) */ }

    static let appBackground        = Color(hex: "#f0eeeb")
    static let accentIndigo         = Color(hex: "#6366F1")
    static let categoryBlocker      = Color(hex: "#e53935")
    static let categoryIssue        = Color(hex: "#fb8c00")
    static let categoryPending      = Color(hex: "#1e88e5")
    static let categoryDelegated    = Color(hex: "#43a047")
    static let categoryIdea         = Color(hex: "#8e24aa")
}
```

Add `AppBackground` as an Asset Catalog color: light `#f0eeeb`, dark `#1c1c1e`.

---

## 8. View Hierarchy

### `Views/ContentView.swift`

```swift
struct ContentView: View {
    @EnvironmentObject var vm: AppViewModel
    var body: some View {
        VStack(spacing: 0) {
            HeaderView()
            Divider()
            TimelineView()
            if vm.selectedTab == .open {
                InputBarView()
            }
        }
        .background(Color.appBackground)
        #if os(macOS)
        .frame(minWidth: 560, minHeight: 400)
        #endif
    }
}
```

### `Views/HeaderView.swift`

- Left: 4×20pt indigo rectangle + "Briefing" (17pt semibold)
- Right: `Picker` segmented style with "Open" / "Done" bound to `vm.selectedTab`
- macOS: 3pt indigo top border overlay; iOS: `.navigationBarTitleDisplayMode(.inline)`

### `Views/TimelineView.swift`

```swift
ScrollView {
    LazyVStack(spacing: 0, pinnedViews: .sectionHeaders) {
        ForEach(groups, id: \.bucket) { group in
            Section {
                ForEach(group.tasks, id: \.id) { task in
                    TaskRowView(task: task)
                }
            } header: {
                BucketHeaderView(label: group.bucket)
            }
        }
    }
}
```

`BucketHeaderView`: sticky label, 11pt uppercase semibold gray, `.background(.regularMaterial)`.

On `selectedTab` change to `.open`: scroll to last task ID with `ScrollViewReader.scrollTo(_:anchor: .bottom)`.

Empty state: "No items" / "No done items" center-aligned text.

### `Views/TaskRowView.swift`

Structure (left → right):
1. `CategoryStripView` (3pt wide colored bar, tappable → category menu popover)
2. `CheckboxView` (18×18pt rounded rect, indigo when checked)
3. Task text area:
   - Non-editing: `LinkText` with strikethrough when done
   - Editing: `TextField` with onSubmit
   - Double-tap to enter edit mode (disabled when done)
   - Single-tap to toggle comment expansion
4. Trailing: comment badge (if count > 0), AI toggle button (robot SF Symbol), three-dot menu

**Fading animation**: `.opacity(vm.justMarkedDone.contains(task.id) ? 0.2 : 1.0)` with `.animation(.easeIn(duration: 1.5).delay(1.5), value: ...)`.

**iOS extras**: `.swipeActions(edge: .trailing)` for delete; `.swipeActions(edge: .leading)` for mark done.

**Category colors** used for the 3pt strip:
| Category | Color |
|---|---|
| BLOCKER | `#e53935` (red) |
| ISSUE | `#fb8c00` (orange) |
| PENDING | `#1e88e5` (blue) |
| DELEGATED | `#43a047` (green) |
| IDEA | `#8e24aa` (purple) |
| _(empty)_ | clear |

### `Views/CheckboxView.swift`

Rounded rect, 18×18pt, 1.5pt stroke — gray when unchecked, indigo fill + white checkmark when checked.

### `Views/CategoryStripView.swift`

3pt wide `Rectangle` filled with category color. Tap opens a popover (`CategoryMenuContent`) with 6 options: `—`, `Blocker`, `Issue`, `Pending`, `Delegated`, `Idea`. On iOS use `.confirmationDialog` instead of `.popover`.

### `Views/InputBarView.swift`

```swift
VStack {
    TextEditor(text: $vm.inputText)
        .frame(minHeight: 60, maxHeight: 120)
        // macOS: Return submits; Shift+Return inserts newline
        // iOS: toolbar submit button

    HStack {
        Text(vm.submitError ?? "⇧ Return for new line")
            .font(.system(size: 11))
            .foregroundColor(vm.submitError != nil ? .red : Color(.systemGray2))
        Spacer()
        // Submit button: indigo circle arrow.up icon
        // Shows ProgressView when isProcessing
    }
}
.padding(...)
.background(Color.white)
.clipShape(RoundedRectangle(cornerRadius: 16))
.overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(...))
.shadow(...)
```

**macOS Return key**: use `.onKeyPress(keys: [.return], phases: .down) { keyPress in keyPress.modifiers.contains(.shift) ? .ignored : .handled }` on the `TextEditor`. When handled, call `Task { await vm.submitInput() }`.

### `Views/CommentSectionView.swift`

- `ForEach` over `task.comments.sorted(by: { $0.createdAt < $1.createdAt })`
- `TextField("Add a comment…")` at bottom, `onSubmit` adds comment and clears field
- Indented 38pt from the task row left edge

### `Views/CommentRowView.swift`

- Comment text (double-tap to edit → `TextField`)
- `RelativeTimeText` in small gray
- Delete button (xmark icon)

### `Views/SettingsView.swift`

`Form` with `SecureField` for API key + Save button. On macOS: wired to `Settings { }` scene, `frame(width: 400, height: 150)`. On iOS: `.sheet` triggered by gear toolbar button in `HeaderView`. Show immediately on first launch if `vm.apiKey.isEmpty`.

### `Views/Shared/LinkText.swift`

Parses text for URLs (`https?://\S+`) and `@mentions` (`@\w+`). Returns `AttributedString` where:
- URLs: `.link` attribute, display text truncated to 50 chars (`hostname + /…`)
- @mentions: `.foregroundColor` = indigo (`#6366F1`), bold
- Plain text: as-is

### `Views/Shared/RelativeTimeText.swift`

Manual diff calculation matching web app behavior:
- < 60s → "just now"
- < 3600s → "Xm ago"
- < 86400s → "Xh ago"
- else → "MMM d" (e.g. "Jan 5")

---

## 9. Exact Behaviors to Preserve

| Web behavior | Swift implementation |
|---|---|
| Open tab scrolls to bottom on load and tab switch | `ScrollViewReader.scrollTo(lastID, anchor: .bottom)` in `.onAppear` + `.onChange(of: selectedTab)` |
| Just-marked-done tasks stay in Open for 3s, fade out | `justMarkedDone` Set + `Task.sleep(for: .seconds(3))` + `.opacity` animation |
| Done tab buckets by `updatedAt`; Open tab by `createdAt` | `groupedDoneTasks()` → `updatedAt`; `groupedOpenTasks()` → `createdAt` |
| Soft delete only | `deleteTask()` sets `status = -1`; all fetch descriptors filter `status != -1` |
| Comments sorted ASC by `createdAt` | `.sorted(by: { $0.createdAt < $1.createdAt })` |
| `show_original` persists per task | SwiftData stored property `showOriginal: Bool` |
| Category stored as empty string for uncategorized | `""` is valid; display as `—` in menus |
| `original_input` stored even if user edits AI text | `originalInput` is set once at insert time, never overwritten on edit |
| Comment count is derived | `task.commentCount` = `task.comments.count` (no stored counter) |

---

## 10. Complete File List (20 files)

```
Briefing/
  BriefingApp.swift
  Models/
    TaskItem.swift
    CommentItem.swift
  Services/
    AnthropicService.swift
    KeychainService.swift
  ViewModels/
    AppViewModel.swift
  Views/
    ContentView.swift
    HeaderView.swift
    TimelineView.swift
    BucketHeaderView.swift
    TaskRowView.swift
    CategoryStripView.swift
    CheckboxView.swift
    CommentSectionView.swift
    CommentRowView.swift
    InputBarView.swift
    SettingsView.swift
    Shared/
      LinkText.swift
      RelativeTimeText.swift
  Utilities/
    BucketHelper.swift
    ColorTokens.swift
```

---

## 11. Implementation Order

### Phase 1 — Data layer
1. Create Xcode multiplatform project with SwiftData
2. `TaskItem.swift` + `CommentItem.swift` — verify insert/fetch works
3. `BucketHelper.swift` — unit test all bucket boundaries
4. `ColorTokens.swift`

### Phase 2 — Services
5. `KeychainService.swift` — save/load/delete
6. `AnthropicService.swift` — full implementation including Codable types, system prompt, tool definition
7. Manual test: call `extractTasks` from a preview with a hardcoded API key

### Phase 3 — ViewModel
8. `AppViewModel.swift` — all state, all mutations, grouping logic

### Phase 4 — Core UI (iOS first)
9. `ContentView.swift` + `HeaderView.swift` (structural shell)
10. `InputBarView.swift` — verify `vm.submitInput()` fires
11. `BucketHeaderView.swift`
12. `TimelineView.swift` — LazyVStack sections
13. `TaskRowView.swift` — checkbox, text display, fade animation
14. `CategoryStripView.swift` — color strip + popover/dialog
15. `CommentSectionView.swift` + `CommentRowView.swift`
16. `LinkText.swift` + `RelativeTimeText.swift`

### Phase 5 — Interactions
17. Double-tap to edit task text and comments
18. AI toggle button (use `sparkles` or `wand.and.stars` SF Symbol)
19. Three-dot action menu (Rename / Delete)
20. Category popover/dialog and selection
21. Fading animation for just-marked-done tasks

### Phase 6 — Settings
22. `SettingsView.swift` — macOS Settings scene + iOS sheet
23. First-launch detection: show settings when API key is empty

### Phase 7 — macOS Polish
24. Window minimum size constraints
25. Return/Shift+Return keyboard handling with `.onKeyPress`
26. `.onHover` reveal for category strip label
27. Verify sticky section headers on macOS scroll

### Phase 8 — iOS Polish
28. `.swipeActions` for quick complete/delete
29. `.contextMenu` for task rows
30. Keyboard avoidance testing on iPhone/iPad

### Phase 9 — QA
31. Run on iOS Simulator (iPhone 15 Pro + iPad Pro 12.9")
32. Run on macOS
33. Verify all CRUD operations persist across restarts
34. Verify timeline grouping matches web app
35. Verify full AI pipeline: input → API call → tasks created

---

## 12. Source Files to Reference During Implementation

| File | Purpose |
|---|---|
| `backend/app/llm/claude.py` | **Exact** system prompt and tool JSON schema — copy verbatim into `AnthropicService.swift` |
| `frontend/src/components/TimelineView.jsx` | **Exact** `getBucket()` logic (lines 6–29) and `BUCKET_ORDER` array — port into `BucketHelper.swift` |
| `frontend/src/components/TaskItem.jsx` | All task row interactions (edit, category, action menu, robot toggle, comment expand) |
| `frontend/src/App.tsx` | Complete state management: toggle, edit, category, show-original, delete, comment CRUD |
| `frontend/src/index.css` | All color values, spacing, typography |
| `frontend/src/utils/renderLinks.jsx` | URL and @mention parsing logic for `LinkText.swift` |
| `frontend/src/components/CommentSection.jsx` | Comment list + add flow |

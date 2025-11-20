// ---------- DATA MODELS ----------

// Demo assignments with prompt histories
const initialAssignments = [
  {
    id: "a1",
    title: "Assignment 1 – History essay",
    shortLabel: "Assignment 1",
    description:
      "Write a short essay explaining two different viewpoints on a historical event and evaluate their strengths and weaknesses.",
    studyMinutes: 135,
    promptsUsed: [
      {
        id: "a1p1",
        text:
          "Give me two different viewpoints on this event and explain the strengths and weaknesses of each. Then ask me one question that will help me decide which view I find more convincing.",
        feature: "Compare",
        reflection: "",
        rating: null,
        pushedToCommunity: false
      },
      {
        id: "a1p2",
        text:
          "Can you explain this concept in a simpler way so that I could teach it to a younger student in our class?",
        feature: "Explain",
        reflection: "",
        rating: null,
        pushedToCommunity: false
      },
      {
        id: "a1p3",
        text:
          "Ask me three questions that will test whether I truly understand the causes and consequences of this event.",
        feature: "Reflect",
        reflection: "",
        rating: null,
        pushedToCommunity: false
      }
    ]
  },
  {
    id: "a2",
    title: "Assignment 2 – Science report",
    shortLabel: "Assignment 2",
    description:
      "Prepare a short report about a scientific concept, including a visual explanation and one real-world application.",
    studyMinutes: 90,
    promptsUsed: [
      {
        id: "a2p1",
        text:
          "Show me a real-world example where this science concept could be applied and explain it step by step.",
        feature: "Explain",
        reflection: "",
        rating: null,
        pushedToCommunity: false
      },
      {
        id: "a2p2",
        text:
          "Help me brainstorm three different ways to visualize this idea for a middle school audience.",
        feature: "Brainstorm",
        reflection: "",
        rating: null,
        pushedToCommunity: false
      }
    ]
  }
];

// Initial community prompt bank (seed prompts from earlier prototype)
const initialCommunityPrompts = [
  {
    id: "c1",
    title: "Teach-back check for understanding",
    role: "Teacher",
    subject: "Cross-disciplinary",
    func: "Explain",
    scenario: "Classwork",
    promptText:
      "Can you explain this concept in a simpler way so that you could teach it to a younger student in our class?",
    rationale:
      "Invites students to move from receiving information to reorganizing it in their own words, which supports deeper understanding.",
    tags: ["student voice", "critical thinking"],
    helpfulCount: 3,
    source: "Seed prompt",
    comments: [
      { text: "Works well as an exit ticket for Grade 8.", userCreated: false }
    ],
    userCreated: false
  },
  {
    id: "c2",
    title: "Two perspectives and a critique",
    role: "Teacher",
    subject: "History",
    func: "Compare",
    scenario: "Homework",
    promptText:
      "Give me two different viewpoints on this issue and explain the strengths and weaknesses of each. Then ask me one question that will help me decide which view I find more convincing.",
    rationale:
      "Moves students away from single-answer thinking toward evaluating arguments with their own criteria.",
    tags: ["multiple perspectives", "evaluation"],
    helpfulCount: 4,
    source: "Seed prompt",
    comments: [],
    userCreated: false
  },
  {
    id: "c3",
    title: "Writing: revision coach",
    role: "Student",
    subject: "Language",
    func: "Brainstorm",
    scenario: "Project",
    promptText:
      "Here is my paragraph. Ask me three questions that will make my argument stronger, and suggest one sentence I could revise to sound more precise without changing my meaning.",
    rationale:
      "Frames AI as a coach rather than a ghost-writer by focusing on questions and small revisions instead of full rewrites.",
    tags: ["writing", "feedback"],
    helpfulCount: 5,
    source: "Seed prompt",
    comments: [],
    userCreated: false
  },
  {
    id: "c4",
    title: "Meta-cognitive reflection after AI help",
    role: "Student",
    subject: "Cross-disciplinary",
    func: "Reflect",
    scenario: "Homework",
    promptText:
      "Did I just accept your answer, or did I question and reshape it? Help me write three short sentences about what I decided to keep, change, or reject and why.",
    rationale:
      "Helps students talk about their decisions after using AI, which is central to agency and self-regulation.",
    tags: ["reflection", "agency"],
    helpfulCount: 2,
    source: "Seed prompt",
    comments: [],
    userCreated: false
  }
];

const STORAGE_ASSIGNMENTS_KEY = "promptsAssignmentsV1";
const STORAGE_COMMUNITY_KEY = "promptsCommunityV1";
const STORAGE_TAGS_KEY = "promptsTagOptionsV1";

const defaultTagOptions = {
  subjects: ["Language / Writing", "Math", "Science", "History / Social Studies", "Cross-disciplinary"],
  functions: ["Explain", "Summarize", "Compare", "Brainstorm", "Reflect"],
  scenarios: ["Classwork", "Homework", "Project", "Exam prep"]
};

// ---------- GLOBAL STATE ----------

let assignments = [];
let communityPrompts = [];

let currentDashboardAssignmentId = null;
let currentAssignmentWorkId = null;

let currentModalContext = null;
let currentPushContext = null;

let chatMessages = [];
let tagOptions = {
  subjects: [...defaultTagOptions.subjects],
  functions: [...defaultTagOptions.functions],
  scenarios: [...defaultTagOptions.scenarios]
};

// ---------- UTILITIES ----------

function loadState() {
  // Assignments
  try {
    const storedA = localStorage.getItem(STORAGE_ASSIGNMENTS_KEY);
    assignments = storedA ? JSON.parse(storedA) : initialAssignments;
  } catch {
    assignments = initialAssignments;
  }

  // Community prompt bank
  try {
    const storedC = localStorage.getItem(STORAGE_COMMUNITY_KEY);
    communityPrompts = storedC ? JSON.parse(storedC) : initialCommunityPrompts;
  } catch {
    communityPrompts = initialCommunityPrompts;
  }
}

function saveAssignments() {
  try {
    localStorage.setItem(STORAGE_ASSIGNMENTS_KEY, JSON.stringify(assignments));
  } catch {
    // ignore
  }
}

function saveCommunity() {
  try {
    localStorage.setItem(STORAGE_COMMUNITY_KEY, JSON.stringify(communityPrompts));
  } catch {
    // ignore
  }
}

function loadTagOptions() {
  try {
    const stored = localStorage.getItem(STORAGE_TAGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      ["subjects", "functions", "scenarios"].forEach((key) => {
        tagOptions[key] = sanitizeTagList(parsed?.[key], defaultTagOptions[key]);
      });
      return;
    }
  } catch {
    // ignore and fall back to defaults
  }

  tagOptions = {
    subjects: [...defaultTagOptions.subjects],
    functions: [...defaultTagOptions.functions],
    scenarios: [...defaultTagOptions.scenarios]
  };
}

function saveTagOptions() {
  try {
    localStorage.setItem(STORAGE_TAGS_KEY, JSON.stringify(tagOptions));
  } catch {
    // ignore
  }
}

function sanitizeTagList(list, fallback) {
  const safeFallback = Array.isArray(fallback) ? fallback : [];
  if (!Array.isArray(list)) return safeFallback.slice();
  const cleaned = [];
  list.forEach((entry) => {
    const normalized = normalizeTagValue(entry);
    if (!normalized) return;
    if (!cleaned.some((value) => value.toLowerCase() === normalized.toLowerCase())) {
      cleaned.push(normalized);
    }
  });
  return cleaned.length > 0 ? cleaned : safeFallback.slice();
}

function normalizeTagValue(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}

function getDefaultTag(category) {
  const list = tagOptions[category];
  if (Array.isArray(list) && list.length > 0) return list[0];
  const fallback = defaultTagOptions[category];
  return Array.isArray(fallback) && fallback.length > 0 ? fallback[0] : "";
}

function addTagOption(category, value) {
  const normalizedCategory = ["subjects", "functions", "scenarios"].includes(category) ? category : null;
  const normalizedValue = normalizeTagValue(value);
  if (!normalizedCategory || !normalizedValue) {
    return { success: false, error: "Enter a tag name and choose a category." };
  }

  const list = tagOptions[normalizedCategory] || [];
  const exists = list.some((entry) => entry.toLowerCase() === normalizedValue.toLowerCase());
  if (exists) {
    return { success: false, error: "That tag already exists in this category." };
  }

  list.push(normalizedValue);
  list.sort((a, b) => a.localeCompare(b));
  tagOptions[normalizedCategory] = list;
  saveTagOptions();
  populateFilterOptions();
  populateModalTagOptions();

  return { success: true, category: normalizedCategory, value: normalizedValue };
}

function populateFilterOptions() {
  populateSelectOptions("community-filter-subject", tagOptions.subjects, {
    includeAll: true,
    allLabel: "All subjects"
  });
  populateSelectOptions("community-filter-function", tagOptions.functions, {
    includeAll: true,
    allLabel: "All functions"
  });
  populateSelectOptions("community-filter-scenario", tagOptions.scenarios, {
    includeAll: true,
    allLabel: "All scenarios"
  });
}

function populateModalTagOptions(selectedValues = {}) {
  populateSelectOptions("push-subject-select", tagOptions.subjects, {
    preferredValue: selectedValues.subject
  });
  populateSelectOptions("push-function-select", tagOptions.functions, {
    preferredValue: selectedValues.func
  });
  populateSelectOptions("push-scenario-select", tagOptions.scenarios, {
    preferredValue: selectedValues.scenario
  });
}

function populateSelectOptions(selectId, options, config = {}) {
  const select = document.getElementById(selectId);
  if (!select) return null;

  const currentValue = config.preferredValue ?? select.value;
  select.innerHTML = "";

  if (config.includeAll) {
    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = config.allLabel || "All";
    select.appendChild(allOption);
  }

  options.forEach((optionValue) => {
    const opt = document.createElement("option");
    opt.value = optionValue;
    opt.textContent = optionValue;
    select.appendChild(opt);
  });

  const availableValues = config.includeAll ? ["all", ...options] : options;
  if (currentValue && availableValues.includes(currentValue)) {
    select.value = currentValue;
  } else if (availableValues.length > 0) {
    select.value = availableValues[0];
  }

  return select;
}

function setSelectValue(select, value) {
  if (!select) return;
  const availableValues = Array.from(select.options).map((opt) => opt.value);
  if (value && availableValues.includes(value)) {
    select.value = value;
  } else if (availableValues.length > 0) {
    select.value = availableValues[0];
  }
}

function formatStudyMinutes(mins) {
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${rest} min`;
}

function findAssignmentById(id) {
  return assignments.find((a) => a.id === id) || null;
}

function findPromptInAssignment(assignmentId, promptId) {
  const a = findAssignmentById(assignmentId);
  if (!a) return null;
  return a.promptsUsed.find((p) => p.id === promptId) || null;
}

// ---------- NAVIGATION ----------

function setupNavigation() {
  const buttons = document.querySelectorAll(".nav-button");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;

      // update buttons
      buttons.forEach((b) => b.classList.toggle("active", b === btn));

      // switch views
      document.querySelectorAll(".view").forEach((el) => {
        el.classList.toggle("active", el.id === `view-${view}`);
      });

      if (view === "assignments") {
        openAssignmentPicker();
      } else {
        closeAssignmentPicker();
      }
    });
  });
}

// ---------- DASHBOARD RENDERING ----------

function renderDashboardAssignmentList() {
  const listEl = document.getElementById("dashboard-assignment-list");
  listEl.innerHTML = "";

  assignments.forEach((a) => {
    const li = document.createElement("li");
    li.className = "assignment-item";
    li.dataset.id = a.id;

    const titleSpan = document.createElement("span");
    titleSpan.textContent = a.shortLabel || a.title;
    li.appendChild(titleSpan);

    const timeSpan = document.createElement("span");
    timeSpan.className = "assignment-item-time";
    timeSpan.textContent = formatStudyMinutes(a.studyMinutes);
    li.appendChild(timeSpan);

    if (a.id === currentDashboardAssignmentId) {
      li.classList.add("active");
    }

    li.addEventListener("click", () => {
      currentDashboardAssignmentId = a.id;
      renderDashboardAssignmentList();
      renderDashboardDetail();
    });

    listEl.appendChild(li);
  });
}

function renderDashboardDetail() {
  const emptyEl = document.getElementById("dashboard-assignment-empty");
  const contentEl = document.getElementById("dashboard-assignment-content");

  const studyTimeEl = document.getElementById("dashboard-study-time");
  const assignNameEl = document.getElementById("dashboard-assignment-name");
  const historyListEl = document.getElementById("dashboard-prompt-history");
  const noPromptsEl = document.getElementById("dashboard-no-prompts");
  const summaryEl = document.getElementById("dashboard-recommend-summary");

  const assignment = findAssignmentById(currentDashboardAssignmentId);

  if (!assignment) {
    emptyEl.classList.remove("hidden");
    contentEl.classList.add("hidden");
    return;
  }

  emptyEl.classList.add("hidden");
  contentEl.classList.remove("hidden");

  studyTimeEl.textContent = formatStudyMinutes(assignment.studyMinutes);
  assignNameEl.textContent = assignment.title;

  historyListEl.innerHTML = "";

  if (!assignment.promptsUsed || assignment.promptsUsed.length === 0) {
    noPromptsEl.classList.remove("hidden");
  } else {
    noPromptsEl.classList.add("hidden");
  }

  let pushedCount = 0;

  assignment.promptsUsed.forEach((p) => {
    if (p.pushedToCommunity) pushedCount += 1;

    const row = document.createElement("div");
    row.className = "prompt-history-item";

    const textDiv = document.createElement("div");
    textDiv.className = "prompt-history-text";
    textDiv.textContent = p.text;

    row.appendChild(textDiv);

    const actionsDiv = document.createElement("div");
    actionsDiv.className = "prompt-history-actions";

    const reflectBtn = document.createElement("button");
    reflectBtn.className = "btn-small";
    reflectBtn.textContent = "Reflect";
    reflectBtn.addEventListener("click", () => openPromptModal(assignment.id, p.id));
    actionsDiv.appendChild(reflectBtn);

    const pushBtn = document.createElement("button");
    pushBtn.className = "btn-small-secondary";
    pushBtn.textContent = p.pushedToCommunity ? "In community" : "Push to community";
    pushBtn.disabled = !!p.pushedToCommunity;
    pushBtn.addEventListener("click", () => {
      openPushModal(assignment.id, p.id);
    });
    actionsDiv.appendChild(pushBtn);

    row.appendChild(actionsDiv);
    historyListEl.appendChild(row);
  });

  if (assignment.promptsUsed.length > 0) {
    summaryEl.textContent = `You have pushed ${pushedCount} of ${
      assignment.promptsUsed.length
    } prompts from this assignment to the community bank.`;
  } else {
    summaryEl.textContent = "";
  }

  renderPieChartForAssignment(assignment);
}

// ---------- PIE CHART ----------

const featureColors = {
  Explain: "#4f81bd",
  Summarize: "#c0504d",
  Compare: "#9bbb59",
  Brainstorm: "#8064a2",
  Reflect: "#f2b705",
  Other: "#7f7f7f"
};

function renderPieChartForAssignment(assignment) {
  const svg = document.getElementById("prompt-pie-chart");
  const legend = document.getElementById("prompt-pie-legend");
  svg.innerHTML = "";
  legend.innerHTML = "";

  if (!assignment || !assignment.promptsUsed || assignment.promptsUsed.length === 0) {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", "50%");
    text.setAttribute("y", "50%");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("fill", "#5b7384");
    text.setAttribute("font-size", "12");
    text.textContent = "No prompt data yet";
    svg.appendChild(text);
    return;
  }

  // Count features
  const counts = {};
  assignment.promptsUsed.forEach((p) => {
    const key = featureColors[p.feature] ? p.feature : "Other";
    counts[key] = (counts[key] || 0) + 1;
  });

  const entries = Object.entries(counts);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);

  const cx = 110;
  const cy = 110;
  const r = 80;

  let currentAngle = -Math.PI / 2;

  entries.forEach(([feature, value]) => {
    const fraction = value / total;
    const angle = fraction * Math.PI * 2;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;

    const pathData = [
      `M ${cx} ${cy}`,
      `L ${x1} ${y1}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
      "Z"
    ].join(" ");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    path.setAttribute("fill", featureColors[feature] || featureColors.Other);
    path.setAttribute("stroke", "#ffffff");
    path.setAttribute("stroke-width", "1");
    svg.appendChild(path);

    const li = document.createElement("li");
    li.className = "chart-legend-item";

    const swatch = document.createElement("span");
    swatch.className = "chart-color-swatch";
    swatch.style.background = featureColors[feature] || featureColors.Other;

    const label = document.createElement("span");
    const pct = Math.round((fraction * 100 * 10) / 10);
    label.textContent = `${feature} – ${pct}%`;

    li.appendChild(swatch);
    li.appendChild(label);
    legend.appendChild(li);
  });
}

// ---------- MODAL REFLECTION (Dashboard) ----------

function openPromptModal(assignmentId, promptId) {
  const assignment = findAssignmentById(assignmentId);
  const prompt = findPromptInAssignment(assignmentId, promptId);
  if (!assignment || !prompt) return;

  currentModalContext = { assignmentId, promptId };

  const modal = document.getElementById("prompt-modal");
  const textEl = document.getElementById("modal-prompt-text");
  const reflectionEl = document.getElementById("modal-reflection");

  textEl.textContent = prompt.text;
  reflectionEl.value = prompt.reflection || "";

  // set rating
  const ratingInputs = document.querySelectorAll('input[name="modal-rating"]');
  ratingInputs.forEach((input) => {
    input.checked = prompt.rating === Number(input.value);
  });

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closePromptModal() {
  const modal = document.getElementById("prompt-modal");
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  currentModalContext = null;
}

function setupModal() {
  const closeBtn = document.getElementById("modal-close");
  const saveBtn = document.getElementById("modal-save");
  const backdrop = document.querySelector("#prompt-modal .modal-backdrop");

  closeBtn.addEventListener("click", closePromptModal);
  backdrop.addEventListener("click", closePromptModal);

  saveBtn.addEventListener("click", () => {
    if (!currentModalContext) return;
    const { assignmentId, promptId } = currentModalContext;
    const assignment = findAssignmentById(assignmentId);
    const prompt = findPromptInAssignment(assignmentId, promptId);
    if (!assignment || !prompt) return;

    const reflectionValue = document.getElementById("modal-reflection").value.trim();
    const ratingInputs = document.querySelectorAll('input[name="modal-rating"]');
    let ratingValue = null;
    ratingInputs.forEach((input) => {
      if (input.checked) ratingValue = Number(input.value);
    });

    prompt.reflection = reflectionValue;
    prompt.rating = ratingValue;

    saveAssignments();
    renderDashboardDetail();
    closePromptModal();
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePromptModal();
  });
}

// ---------- PUSH PROMPT TO COMMUNITY ----------

function pushPromptToCommunity(assignmentId, promptId, details = {}) {
  const assignment = findAssignmentById(assignmentId);
  const prompt = findPromptInAssignment(assignmentId, promptId);
  if (!assignment || !prompt) return;

  if (prompt.pushedToCommunity) return;

  const feature = prompt.feature || "Other";
  const funcMapping = {
    Explain: "Explain",
    Summarize: "Summarize",
    Compare: "Compare",
    Brainstorm: "Brainstorm",
    Reflect: "Reflect",
    Other: "Explain"
  };

  const defaultTitle = `${assignment.shortLabel || assignment.title} - student prompt`;
  const title = (details.title || defaultTitle).trim();
  const rationale =
    (details.rationale || "").trim() ||
    "Pushed from a real assignment. Use this as an example and adapt it rather than copying it directly.";
  const subjectValue = details.subject || getDefaultTag("subjects");
  const funcValue = details.func || funcMapping[feature] || getDefaultTag("functions");
  const scenarioValue = details.scenario || getDefaultTag("scenarios");
  const extraTags = Array.isArray(details.extraTags) ? details.extraTags : [];
  const tagSet = new Set([
    "community",
    feature.toLowerCase(),
    subjectValue.toLowerCase(),
    funcValue.toLowerCase(),
    scenarioValue.toLowerCase(),
    ...extraTags.map((tag) => tag.toLowerCase())
  ]);

  const newCommunityPrompt = {
    id: `a-${assignmentId}-${promptId}`,
    title,
    role: "Student",
    subject: subjectValue,
    func: funcValue,
    scenario: scenarioValue,
    promptText: prompt.text,
    rationale,
    tags: Array.from(tagSet),
    helpfulCount: prompt.rating || 0,
    source: `From ${assignment.shortLabel || assignment.title}`,
    comments: prompt.reflection ? [{ text: prompt.reflection, userCreated: true }] : [],
    userCreated: true,
    ownerAssignmentId: assignmentId,
    ownerPromptId: promptId
  };

  communityPrompts.push(newCommunityPrompt);
  prompt.pushedToCommunity = true;

  saveAssignments();
  saveCommunity();
  renderDashboardDetail();
  renderCommunity();
}

function hasDuplicateCommunityPrompt(title, promptText) {
  const titleKey = (title || "").trim().toLowerCase();
  const textKey = (promptText || "").trim().toLowerCase();
  if (!titleKey && !textKey) return false;

  return communityPrompts.some((p) => {
    const existingTitle = (p.title || "").trim().toLowerCase();
    const existingText = (p.promptText || "").trim().toLowerCase();
    return (titleKey && existingTitle === titleKey) || (textKey && existingText === textKey);
  });
}

function openPushModal(assignmentId, promptId) {
  const assignment = findAssignmentById(assignmentId);
  const prompt = findPromptInAssignment(assignmentId, promptId);
  const modal = document.getElementById("push-modal");
  if (!assignment || !prompt || !modal || prompt.pushedToCommunity) return;

  currentPushContext = { assignmentId, promptId };

  const textEl = document.getElementById("push-modal-text");
  const titleInput = document.getElementById("push-modal-title");
  const rationaleInput = document.getElementById("push-modal-rationale");
  const errorEl = document.getElementById("push-modal-error");
  const subjectSelect = document.getElementById("push-subject-select");
  const functionSelect = document.getElementById("push-function-select");
  const scenarioSelect = document.getElementById("push-scenario-select");

  if (textEl) textEl.textContent = prompt.text;
  if (titleInput) {
    const defaultTitle = `${assignment.shortLabel || assignment.title} - ${prompt.feature || "Prompt"}`;
    titleInput.value = defaultTitle;
    titleInput.focus();
  }
  if (rationaleInput) {
    rationaleInput.value = prompt.reflection || "";
  }

  if (subjectSelect) {
    const preferredSubject =
      tagOptions.subjects.find((subject) => subject === "Cross-disciplinary") || getDefaultTag("subjects");
    setSelectValue(subjectSelect, preferredSubject);
  }

  if (functionSelect) {
    const preferredFunction =
      tagOptions.functions.find((func) => func === prompt.feature) || getDefaultTag("functions");
    setSelectValue(functionSelect, preferredFunction);
  }

  if (scenarioSelect) {
    const preferredScenario =
      tagOptions.scenarios.find((scenario) => scenario === "Homework") || getDefaultTag("scenarios");
    setSelectValue(scenarioSelect, preferredScenario);
  }

  if (errorEl) {
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
  }

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closePushModal() {
  const modal = document.getElementById("push-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  currentPushContext = null;
  resetPushTagForm();
}

function resetPushTagForm() {
  const addTagForm = document.getElementById("push-add-tag-form");
  const addTagBtn = document.getElementById("push-add-tag");
  const addTagInput = document.getElementById("push-new-tag-name");
  const addTagCategory = document.getElementById("push-new-tag-category");
  const addTagError = document.getElementById("push-add-tag-error");
  if (addTagForm) addTagForm.classList.add("hidden");
  if (addTagBtn) addTagBtn.disabled = false;
  if (addTagInput) addTagInput.value = "";
  if (addTagCategory) addTagCategory.value = "";
  if (addTagError) addTagError.classList.add("hidden");
}

function setupPushModal() {
  const modal = document.getElementById("push-modal");
  if (!modal) return;

  populateModalTagOptions();

  const closeBtn = document.getElementById("push-modal-close");
  const cancelBtn = document.getElementById("push-modal-cancel");
  const submitBtn = document.getElementById("push-modal-submit");
  const backdrop = document.querySelector("#push-modal .modal-backdrop");
  const titleInput = document.getElementById("push-modal-title");
  const rationaleInput = document.getElementById("push-modal-rationale");
  const errorEl = document.getElementById("push-modal-error");
  const subjectSelect = document.getElementById("push-subject-select");
  const functionSelect = document.getElementById("push-function-select");
  const scenarioSelect = document.getElementById("push-scenario-select");
  const addTagBtn = document.getElementById("push-add-tag");
  const addTagForm = document.getElementById("push-add-tag-form");
  const addTagInput = document.getElementById("push-new-tag-name");
  const addTagCategory = document.getElementById("push-new-tag-category");
  const addTagSave = document.getElementById("push-add-tag-save");
  const addTagCancel = document.getElementById("push-add-tag-cancel");
  const addTagError = document.getElementById("push-add-tag-error");

  const hideError = () => {
    if (errorEl) errorEl.classList.add("hidden");
  };

  [closeBtn, cancelBtn, backdrop].forEach((el) => {
    if (el) el.addEventListener("click", closePushModal);
  });

  [titleInput, rationaleInput].forEach((el) => {
    if (el) el.addEventListener("input", hideError);
  });

  const showAddTagForm = () => {
    if (!addTagForm || !addTagBtn) return;
    addTagForm.classList.remove("hidden");
    addTagBtn.disabled = true;
    if (addTagError) addTagError.classList.add("hidden");
    if (addTagInput) {
      addTagInput.value = "";
      addTagInput.focus();
    }
    if (addTagCategory) addTagCategory.value = "";
  };

  const hideAddTagForm = () => {
    resetPushTagForm();
  };

  const setAddTagError = (message) => {
    if (!addTagError) return;
    if (message) {
      addTagError.textContent = message;
      addTagError.classList.remove("hidden");
    } else {
      addTagError.textContent = "";
      addTagError.classList.add("hidden");
    }
  };

  if (addTagBtn) {
    addTagBtn.addEventListener("click", showAddTagForm);
  }

  if (addTagCancel) {
    addTagCancel.addEventListener("click", hideAddTagForm);
  }

  if (addTagSave) {
    addTagSave.addEventListener("click", () => {
      if (!addTagInput || !addTagCategory) return;
      const rawValue = addTagInput.value;
      const categoryValue = addTagCategory.value;
      if (!rawValue || !categoryValue) {
        setAddTagError("Enter a tag name and choose a category.");
        return;
      }
      const result = addTagOption(categoryValue, rawValue);
      if (!result.success) {
        setAddTagError(result.error || "Could not add tag.");
        return;
      }
      setAddTagError("");
      hideAddTagForm();
      if (result.category === "subjects") {
        setSelectValue(subjectSelect, result.value);
      } else if (result.category === "functions") {
        setSelectValue(functionSelect, result.value);
      } else if (result.category === "scenarios") {
        setSelectValue(scenarioSelect, result.value);
      }
    });
  }

  if (addTagInput) {
    addTagInput.addEventListener("input", () => setAddTagError(""));
  }

  if (addTagCategory) {
    addTagCategory.addEventListener("change", () => setAddTagError(""));
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", () => {
      if (!currentPushContext) return;
      const { assignmentId, promptId } = currentPushContext;
      const assignment = findAssignmentById(assignmentId);
      const prompt = findPromptInAssignment(assignmentId, promptId);
      if (!assignment || !prompt) return;

      const titleValue = titleInput ? titleInput.value.trim() : "";
      const rationaleValue = rationaleInput ? rationaleInput.value.trim() : "";
      const subjectValue = subjectSelect ? subjectSelect.value : getDefaultTag("subjects");
      const functionValue = functionSelect ? functionSelect.value : getDefaultTag("functions");
      const scenarioValue = scenarioSelect ? scenarioSelect.value : getDefaultTag("scenarios");

      if (!titleValue) {
        if (errorEl) {
          errorEl.textContent = "Please give this prompt a title before pushing it.";
          errorEl.classList.remove("hidden");
        }
        return;
      }

      if (!rationaleValue) {
        if (errorEl) {
          errorEl.textContent = "Let the community know why this prompt is helpful.";
          errorEl.classList.remove("hidden");
        }
        return;
      }

      if (hasDuplicateCommunityPrompt(titleValue, prompt.text)) {
        if (errorEl) {
          errorEl.textContent = "A prompt with the same title or wording already exists in the bank.";
          errorEl.classList.remove("hidden");
        }
        return;
      }

      pushPromptToCommunity(assignmentId, promptId, {
        title: titleValue,
        rationale: rationaleValue,
        subject: subjectValue,
        func: functionValue,
        scenario: scenarioValue
      });
      closePushModal();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      closePushModal();
    }
  });
}

function deleteCommunityPrompt(promptId) {
  const index = communityPrompts.findIndex((p) => p.id === promptId);
  if (index === -1) return;

  const [removed] = communityPrompts.splice(index, 1);
  saveCommunity();

  const ownership = getPromptOwnership(removed);
  if (removed && ownership) {
    const prompt = findPromptInAssignment(ownership.assignmentId, ownership.promptId);
    if (prompt) {
      prompt.pushedToCommunity = false;
      saveAssignments();
      renderDashboardDetail();
    }
  }

  renderCommunity();
}

function getPromptOwnership(prompt) {
  if (!prompt) return null;
  if (prompt.ownerAssignmentId && prompt.ownerPromptId) {
    return { assignmentId: prompt.ownerAssignmentId, promptId: prompt.ownerPromptId };
  }

  if (typeof prompt.id === "string" && prompt.id.startsWith("a-")) {
    const parts = prompt.id.split("-");
    if (parts.length >= 3) {
      return { assignmentId: parts[1], promptId: parts.slice(2).join("-") };
    }
  }

  return null;
}

function canDeleteCommunityPrompt(prompt) {
  if (!prompt) return false;
  if (prompt.userCreated) return true;
  return typeof prompt.id === "string" && prompt.id.startsWith("a-");
}

function addPromptFromChat(text) {
  if (!text) return;
  const assignmentId = currentAssignmentWorkId || currentDashboardAssignmentId;
  const assignment = findAssignmentById(assignmentId);
  if (!assignment) return;
  if (!Array.isArray(assignment.promptsUsed)) assignment.promptsUsed = [];

  const newPrompt = {
    id: `chat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    text,
    feature: "Other",
    reflection: "",
    rating: null,
    pushedToCommunity: false,
    userAdded: true
  };

  assignment.promptsUsed.push(newPrompt);
  saveAssignments();

  if (currentDashboardAssignmentId === assignment.id) {
    renderDashboardDetail();
  }
}

// ---------- ASSIGNMENTS VIEW (content + picker + chat) ----------

function renderAssignmentWorkPanel() {
  const titleEl = document.getElementById("assignment-current-title");
  const descEl = document.getElementById("assignment-current-desc");
  const notesEl = document.getElementById("assignment-notes");

  const assignment = findAssignmentById(currentAssignmentWorkId);

  if (!assignment) {
    titleEl.textContent = "Select an assignment to get started";
    descEl.textContent =
      "When you pick an assignment, you will see the task description here and can jot down notes or draft answers.";
    notesEl.value = "";
    return;
  }

  titleEl.textContent = assignment.title;
  descEl.textContent = assignment.description;
  // Notes are not persisted in this demo
}

function resetChat() {
  chatMessages = [];
  const logEl = document.getElementById("assignment-chat-log");
  if (logEl) {
    logEl.innerHTML = "";
  }
}

function appendChatMessage(role, text) {
  const logEl = document.getElementById("assignment-chat-log");
  const messageEl = document.createElement("div");
  messageEl.className = `chat-message ${role}`;
  messageEl.textContent = text;
  logEl.appendChild(messageEl);
  logEl.scrollTop = logEl.scrollHeight;
}

function generateAiResponse(userText) {
  const base =
    "Thanks for sharing this prompt. I will answer briefly, then suggest how you might revise the prompt to keep you in control of the thinking.\n\n";

  const tips = [
    "You could add: “Ask me questions first, then give suggestions.”",
    "Try asking the AI to explain its reasoning step by step so you can compare it with your own.",
    "You might finish with: “Before answering, summarize what you think I am trying to do.”",
    "Consider asking the AI to give two options and ask which one you prefer and why.",
    "You can invite the AI to highlight what you could change rather than rewriting everything."
  ];

  const tip = tips[Math.floor(Math.random() * tips.length)];
  return `${base}${tip}`;
}

function setupChat() {
  const input = document.getElementById("chat-prompt-input");
  const sendBtn = document.getElementById("chat-send");
  const clearBtn = document.getElementById("chat-clear");
  const suggestionsEl = document.getElementById("prompt-suggestions");

  function buildSuggestionsSkeleton() {
    suggestionsEl.innerHTML =
      '<div id="prompt-suggestions-list" class="prompt-suggestions-list"></div>' +
      '<div id="suggestion-preview" class="suggestion-preview hidden"></div>';
    return {
      list: document.getElementById("prompt-suggestions-list"),
      preview: document.getElementById("suggestion-preview")
    };
  }

  function updateSuggestions() {
    const query = input.value.trim().toLowerCase();
    if (query.length < 3) {
      suggestionsEl.classList.add("hidden");
      suggestionsEl.innerHTML = "";
      return;
    }

    const matches = communityPrompts
      .filter(
        (p) =>
          p.promptText.toLowerCase().includes(query) ||
          (p.title && p.title.toLowerCase().includes(query))
      )
      .slice(0, 5);

    if (matches.length === 0) {
      suggestionsEl.classList.add("hidden");
      suggestionsEl.innerHTML = "";
      return;
    }

    const { list, preview } = buildSuggestionsSkeleton();

    matches.forEach((p) => {
      const item = document.createElement("div");
      item.className = "suggestion-item";

      const textSpan = document.createElement("div");
      textSpan.className = "suggestion-text";
      textSpan.textContent = p.title || p.promptText;
      item.appendChild(textSpan);

      const ratingSpan = document.createElement("div");
      ratingSpan.className = "suggestion-rating";
      ratingSpan.textContent = `⭐ ${p.helpfulCount || 0}`;
      item.appendChild(ratingSpan);

      item.addEventListener("click", () => {
        input.value = p.promptText;
        suggestionsEl.classList.add("hidden");
        suggestionsEl.innerHTML = "";
        input.focus();
      });

      item.addEventListener("mouseenter", () => {
        preview.textContent = p.promptText;
        preview.classList.remove("hidden");
      });

      list.appendChild(item);
    });

    suggestionsEl.classList.remove("hidden");
  }

  input.addEventListener("input", updateSuggestions);

  suggestionsEl.addEventListener("mouseleave", () => {
    const preview = document.getElementById("suggestion-preview");
    if (preview) preview.classList.add("hidden");
  });

  function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    suggestionsEl.classList.add("hidden");
    suggestionsEl.innerHTML = "";

    appendChatMessage("user", text);
    input.value = "";
    addPromptFromChat(text);

    const reply = generateAiResponse(text);
    appendChatMessage("ai", reply);
  }

  sendBtn.addEventListener("click", sendMessage);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      resetChat();
      input.value = "";
      suggestionsEl.classList.add("hidden");
      suggestionsEl.innerHTML = "";
    });
  }
}

// ---------- ASSIGNMENT PICKER SIDE DRAWER ----------

function renderAssignmentPickerList() {
  const listEl = document.getElementById("assignment-picker-list");
  listEl.innerHTML = "";

  assignments.forEach((a) => {
    const li = document.createElement("li");
    li.className = "assignment-item";
    li.dataset.id = a.id;

    const titleSpan = document.createElement("span");
    titleSpan.textContent = a.shortLabel || a.title;
    li.appendChild(titleSpan);

    const timeSpan = document.createElement("span");
    timeSpan.className = "assignment-item-time";
    timeSpan.textContent = formatStudyMinutes(a.studyMinutes);
    li.appendChild(timeSpan);

    if (a.id === currentAssignmentWorkId) li.classList.add("active");

    li.addEventListener("click", () => {
      currentAssignmentWorkId = a.id;
      renderAssignmentWorkPanel();
      resetChat();
      closeAssignmentPicker();
    });

    listEl.appendChild(li);
  });
}

function openAssignmentPicker() {
  const drawer = document.getElementById("assignment-picker");
  if (!drawer) return;
  renderAssignmentPickerList();
  drawer.classList.remove("hidden");
}

function closeAssignmentPicker() {
  const drawer = document.getElementById("assignment-picker");
  if (!drawer) return;
  drawer.classList.add("hidden");
}

function setupAssignmentPicker() {
  const closeBtn = document.getElementById("assignment-picker-close");
  const backdrop = document.getElementById("assignment-picker-backdrop");
  const openBtn = document.getElementById("open-assignment-picker");

  if (closeBtn) closeBtn.addEventListener("click", closeAssignmentPicker);
  if (backdrop) backdrop.addEventListener("click", closeAssignmentPicker);
  if (openBtn) openBtn.addEventListener("click", openAssignmentPicker);
}

// ---------- COMMUNITY VIEW RENDERING + COMMENTS ----------

function createCommentSection(prompt) {
  const box = document.createElement("div");
  box.className = "comment-box";

  const label = document.createElement("div");
  label.className = "comment-label";
  label.textContent = "Quick classroom note:";
  box.appendChild(label);

  const textarea = document.createElement("textarea");
  textarea.placeholder =
    "For example: Used in Grade 8 history debate – worked well for small groups.";
  box.appendChild(textarea);

  const actions = document.createElement("div");
  actions.className = "comment-actions";

  const saveBtn = document.createElement("button");
  saveBtn.className = "btn-small-secondary";
  saveBtn.textContent = "Save note";
  actions.appendChild(saveBtn);
  box.appendChild(actions);

  saveBtn.addEventListener("click", () => {
    const value = textarea.value.trim();
    if (!value) return;
    if (!Array.isArray(prompt.comments)) prompt.comments = [];
    prompt.comments.push({ text: value, userCreated: true });
    textarea.value = "";
    saveCommunity();
    renderCommunity();
  });

  if (Array.isArray(prompt.comments) && prompt.comments.length > 0) {
    const list = document.createElement("div");
    list.className = "comment-list";

    prompt.comments.forEach((c, idx) => {
      const commentObj =
        typeof c === "string"
          ? { text: c, userCreated: false }
          : c && typeof c === "object"
          ? c
          : { text: "", userCreated: false };
      if (!commentObj.text) return;

      const row = document.createElement("div");
      row.className = "comment";

      const textSpan = document.createElement("span");
      textSpan.className = "comment-text";
      textSpan.textContent = commentObj.text;
      row.appendChild(textSpan);

      if (commentObj.userCreated) {
        const delBtn = document.createElement("button");
        delBtn.className = "comment-delete";
        delBtn.textContent = "Delete";
        delBtn.addEventListener("click", () => {
          prompt.comments.splice(idx, 1);
          saveCommunity();
          renderCommunity();
        });
        row.appendChild(delBtn);
      }

      list.appendChild(row);
    });

    box.appendChild(list);
  }

  return box;
}

function renderCommunity() {
  const listEl = document.getElementById("community-prompt-list");
  const emptyEl = document.getElementById("community-empty");
  const subjectFilter = document.getElementById("community-filter-subject").value;
  const funcFilter = document.getElementById("community-filter-function").value;
  const scenarioFilter = document.getElementById("community-filter-scenario").value;
  const sourceFilter = document.getElementById("community-filter-source").value;

  listEl.innerHTML = "";

  let prompts = [...communityPrompts];

  // sort by helpful count descending
  prompts.sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0));

  prompts = prompts.filter((p) => {
    const subjectMatch = subjectFilter === "all" || p.subject === subjectFilter;
    const funcMatch = funcFilter === "all" || p.func === funcFilter;
    const scenarioMatch = scenarioFilter === "all" || p.scenario === scenarioFilter;

    let sourceMatch = true;
    if (sourceFilter === "seed") {
      sourceMatch = p.source === "Seed prompt";
    } else if (sourceFilter === "assignment") {
      sourceMatch = p.source && p.source.startsWith("From ");
    }

    return subjectMatch && funcMatch && scenarioMatch && sourceMatch;
  });

  if (prompts.length === 0) {
    emptyEl.classList.remove("hidden");
    return;
  }

  emptyEl.classList.add("hidden");

  prompts.forEach((p) => {
    const card = document.createElement("article");
    card.className = "prompt-card";

    const main = document.createElement("div");
    main.className = "prompt-main";

    const title = document.createElement("h3");
    title.textContent = p.title;
    main.appendChild(title);

    const metaRow = document.createElement("div");
    metaRow.className = "prompt-meta-row";

    const rolePill = document.createElement("span");
    rolePill.className = "pill pill-strong";
    rolePill.textContent = p.role === "Teacher" ? "Teacher prompt" : "Student prompt";
    metaRow.appendChild(rolePill);

    const subjectPill = document.createElement("span");
    subjectPill.className = "pill";
    subjectPill.textContent = p.subject;
    metaRow.appendChild(subjectPill);

    const funcPill = document.createElement("span");
    funcPill.className = "pill";
    funcPill.textContent = p.func;
    metaRow.appendChild(funcPill);

    if (Array.isArray(p.tags)) {
      p.tags.forEach((tag) => {
        const tagPill = document.createElement("span");
        tagPill.className = "pill pill-tag";
        tagPill.textContent = tag;
        metaRow.appendChild(tagPill);
      });
    }

    main.appendChild(metaRow);

    const text = document.createElement("p");
    text.className = "prompt-text";
    text.textContent = p.promptText;
    main.appendChild(text);

    if (p.rationale) {
      const rationale = document.createElement("p");
      rationale.className = "prompt-rationale";
      rationale.textContent = `Why this prompt: ${p.rationale}`;
      main.appendChild(rationale);
    }

    const actionsRow = document.createElement("div");
    actionsRow.className = "prompt-actions";
    actionsRow.innerHTML = `<span>⭐ ${p.helpfulCount || 0} helpful votes</span><span>${
      p.source || ""
    }</span>`;
    main.appendChild(actionsRow);

    card.appendChild(main);

    if (canDeleteCommunityPrompt(p)) {
      const userActions = document.createElement("div");
      userActions.className = "prompt-user-actions";
      const helper = document.createElement("span");
      helper.textContent = "You added this prompt.";
      userActions.appendChild(helper);

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "prompt-delete-btn";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => {
        const confirmDelete = window.confirm("Delete this prompt from the community bank?");
        if (confirmDelete) deleteCommunityPrompt(p.id);
      });
      userActions.appendChild(deleteBtn);

      card.appendChild(userActions);
    }

    const aside = document.createElement("aside");
    aside.className = "prompt-aside";
    aside.innerHTML =
      "Share with students why this prompt is recommended and what kind of thinking it is meant to support. Encourage them to adapt the wording instead of copying it.";
    card.appendChild(aside);

    card.appendChild(createCommentSection(p));

    listEl.appendChild(card);
  });
}

function setupCommunityFilters() {
  const subjectFilter = document.getElementById("community-filter-subject");
  const funcFilter = document.getElementById("community-filter-function");
  const scenarioFilter = document.getElementById("community-filter-scenario");
  const sourceFilter = document.getElementById("community-filter-source");

  [subjectFilter, funcFilter, scenarioFilter, sourceFilter].forEach((el) => {
    el.addEventListener("change", renderCommunity);
  });
}

// ---------- INITIALIZATION ----------

document.addEventListener("DOMContentLoaded", () => {
  loadState();
  loadTagOptions();
  populateFilterOptions();

  setupNavigation();
  setupModal();
  setupPushModal();
  setupChat();
  setupAssignmentPicker();
  setupCommunityFilters();

  // Dashboard
  currentDashboardAssignmentId = assignments[0]?.id || null;
  renderDashboardAssignmentList();
  renderDashboardDetail();

  // Assignment work + chat
  currentAssignmentWorkId = assignments[0]?.id || null;
  renderAssignmentWorkPanel();

  // Community
  renderCommunity();
});

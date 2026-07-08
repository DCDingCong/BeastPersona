"use client";

/* eslint-disable @next/next/no-img-element */

import {
  ArrowLeft,
  ChevronRight,
  Clipboard,
  Download,
  Flame,
  Moon,
  PawPrint,
  RefreshCw,
  Settings,
  Shield,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { quickQuestions } from "@/data/quickQuestions";
import { deepQuestionBank } from "@/data/deepQuestionBank";
import type { Answer, Question } from "@/data/questionTypes";
import {
  buildCharacterGenerationPreview,
  type CharacterSpec,
  type DeepConfig,
  type GenerateRequest,
  type LineageMode,
} from "@/lib/fursona";
import {
  applyCharacterSpecDraft,
  type CharacterSpecDraftPatch,
} from "@/lib/characterSpecEditing";
import {
  canUseClientGeneration,
  generateClientImage,
  generateClientResult,
} from "@/lib/clientGeneration";
import type { OpenAIRequestSettings } from "@/lib/openaiSettings";
import { selectDeepQuestions, type DeepFlowDepth } from "@/lib/questionFlow";
import {
  getPreviousQuickQuestionIndex,
  getSelectedOptionId,
  popPreviousDeepQuestion,
  pushDeepQuestion,
  upsertAnswer,
} from "@/lib/questionnaireNavigation";
import { scoreAnswers, type ScoreSnapshot } from "@/lib/scoring";

type Step = "home" | "settings" | "quiz" | "deep" | "review" | "lineage" | "loading" | "result";

type GenerateResponse = {
  characterSpec?: CharacterSpec;
  completeSceneImage?: string | null;
  referenceSheetImage?: string | null;
  settingDescription?: string;
  error?: string;
  imageErrors?: {
    completeSceneImage: string | null;
    referenceSheetImage: string | null;
  };
};

const questions = quickQuestions;
const aiSettingsStorageKey = "fursona-atelier.aiSettings.v1";

const lineageOptions: Array<{
  value: LineageMode;
  title: string;
  desc: string;
}> = [
  { value: "ai", title: "自动推荐", desc: "根据问卷自动判断" },
  { value: "pure", title: "纯血", desc: "物种识别更清晰" },
  { value: "hybrid", title: "混血", desc: "更幻想、更 OC" },
];

const depthOptions: Array<{
  value: DeepFlowDepth;
  title: string;
  desc: string;
}> = [
  { value: "light", title: "轻深度", desc: "约 18-20 题" },
  { value: "standard", title: "标准", desc: "约 24-28 题" },
  { value: "professional", title: "专业", desc: "最多 36 题" },
];

const loadingSteps = [
  "正在解析题库标签",
  "正在匹配物种血统",
  "正在检查设定冲突",
  "正在绘制完整形象",
  "正在整理设定图和说明",
];

const defaultDeepConfig: DeepConfig = {
  primarySpeciesPreference: "",
  secondarySpeciesPreference: "",
  worldStyle: "",
  role: "",
  mission: "",
  bodyType: "",
  humanTraitLevel: "中",
  animalTraitLevel: "高",
  palette: "",
  mustKeep: "",
  avoid: "",
};

function readStoredAiSettings(): OpenAIRequestSettings {
  if (typeof window === "undefined") return {};

  try {
    const saved = window.localStorage.getItem(aiSettingsStorageKey);
    return saved ? (JSON.parse(saved) as OpenAIRequestSettings) : {};
  } catch {
    return {};
  }
}

export default function Home() {
  const [step, setStep] = useState<Step>("home");
  const [mode, setMode] = useState<"quick" | "deep">("quick");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [deepAnswers, setDeepAnswers] = useState<Answer[]>([]);
  const [deepQuestionStack, setDeepQuestionStack] = useState<string[]>([]);
  const [currentDeepQuestionId, setCurrentDeepQuestionId] = useState<string | null>(null);
  const [deepDepth, setDeepDepth] = useState<DeepFlowDepth>("standard");
  const [lineageMode, setLineageMode] = useState<LineageMode>("ai");
  const [deepConfig, setDeepConfig] = useState<DeepConfig>(defaultDeepConfig);
  const [scoreSnapshot, setScoreSnapshot] = useState<ScoreSnapshot | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [specDraft, setSpecDraft] = useState<CharacterSpecDraftPatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [aiSettings, setAiSettings] = useState<OpenAIRequestSettings>(readStoredAiSettings);

  const activeSpec = result?.characterSpec;
  const completeImage = result?.completeSceneImage || null;
  const referenceImage = result?.referenceSheetImage || null;
  const generationPreview = useMemo(() => {
    const activeAnswers = mode === "quick" ? answers : deepAnswers;
    const snapshot = scoreSnapshot || scoreAnswers(activeAnswers);

    return buildCharacterGenerationPreview({
      mode,
      lineageMode,
      answers: activeAnswers,
      deepConfig: mode === "deep" ? deepConfig : undefined,
      scoreSnapshot: snapshot,
    });
  }, [answers, deepAnswers, deepConfig, lineageMode, mode, scoreSnapshot]);
  const reviewSpec = useMemo(
    () => applyCharacterSpecDraft(generationPreview.characterSpec, specDraft || {}),
    [generationPreview.characterSpec, specDraft],
  );
  const remainingDeepQuestions = useMemo(
    () => selectDeepQuestions(deepAnswers, deepDepth),
    [deepAnswers, deepDepth],
  );
  const activeDeepQuestion =
    (currentDeepQuestionId
      ? deepQuestionBank.find((question) => question.id === currentDeepQuestionId)
      : undefined) || remainingDeepQuestions[0];

  function startQuick() {
    setMode("quick");
    setQuestionIndex(0);
    setAnswers([]);
    setScoreSnapshot(null);
    setSpecDraft(null);
    setError(null);
    setStep("quiz");
  }

  function startDeep() {
    setMode("deep");
    setDeepAnswers([]);
    setDeepQuestionStack([]);
    setCurrentDeepQuestionId(null);
    setScoreSnapshot(null);
    setSpecDraft(null);
    setError(null);
    setStep("deep");
  }

  function chooseAnswer(optionId: string) {
    const question = questions[questionIndex];
    const nextAnswers = upsertAnswer(answers, question, optionId);
    setAnswers(nextAnswers);

    if (questionIndex < questions.length - 1) {
      setQuestionIndex((current) => current + 1);
      return;
    }

    buildReview(nextAnswers);
  }

  function chooseDeepAnswer(optionId: string) {
    if (!activeDeepQuestion) return;

    const nextAnswers = upsertAnswer(deepAnswers, activeDeepQuestion, optionId);
    const nextStack = pushDeepQuestion(deepQuestionStack, activeDeepQuestion.id);
    const nextQuestions = selectDeepQuestions(nextAnswers, deepDepth);
    setDeepAnswers(nextAnswers);
    setDeepQuestionStack(nextStack);
    setCurrentDeepQuestionId(null);

    if (nextQuestions.length > 0) {
      return;
    }

    buildReview(nextAnswers);
  }

  function buildReview(nextAnswers: Answer[]) {
    const snapshot = scoreAnswers(nextAnswers);
    setScoreSnapshot(snapshot);
    setSpecDraft(null);
    setStep("review");
  }

  function backFromQuickQuestion() {
    const previousIndex = getPreviousQuickQuestionIndex(questionIndex);
    if (previousIndex === null) {
      setStep("home");
      return;
    }

    setQuestionIndex(previousIndex);
  }

  function backFromDeepQuestion() {
    const { previousQuestionId, nextStack } = popPreviousDeepQuestion(deepQuestionStack);
    if (!previousQuestionId) {
      setStep("home");
      return;
    }

    setDeepQuestionStack(nextStack);
    setCurrentDeepQuestionId(previousQuestionId);
  }

  function backFromReview() {
    if (mode === "quick") {
      setStep("quiz");
      return;
    }

    const { previousQuestionId, nextStack } = popPreviousDeepQuestion(deepQuestionStack);
    if (!previousQuestionId) {
      setStep("home");
      return;
    }

    setDeepQuestionStack(nextStack);
    setCurrentDeepQuestionId(previousQuestionId);
    setStep("deep");
  }

  async function generate() {
    setError(null);
    setResult(null);
    setLoadingIndex(0);
    setStep("loading");
    const timer = window.setInterval(() => {
      setLoadingIndex((current) => Math.min(current + 1, loadingSteps.length - 1));
    }, 900);

    const activeAnswers = mode === "quick" ? answers : deepAnswers;
    const snapshot = generationPreview.scoreSnapshot || scoreAnswers(activeAnswers);
    const confirmedSpec = step === "review" ? reviewSpec : generationPreview.characterSpec;
    const payload: GenerateRequest = {
      mode,
      lineageMode,
      answers: activeAnswers,
      deepConfig: mode === "deep" ? deepConfig : undefined,
      scoreSnapshot: snapshot,
      confirmedSpec,
      aiSettings: getActiveAiSettings(),
    };

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as GenerateResponse;

      if (!response.ok) {
        const directData = await tryClientGenerate(payload, response.status);
        if (directData) {
          setResult(directData);
        } else {
          setError(data.error || "生成失败。");
          setResult(null);
        }
      } else {
        if (data.error) {
          setError(data.error);
        }
        setResult(data);
      }
    } catch {
      const directData = await tryClientGenerate(payload);
      if (directData) {
        setResult(directData);
      } else {
        setError("网络请求失败，请检查本地服务或稍后重试。");
        setResult(null);
      }
    } finally {
      window.clearInterval(timer);
      setStep("result");
    }
  }

  async function retryImage(kind: "complete" | "reference") {
    if (!activeSpec) return;

    const prompt =
      kind === "complete"
        ? activeSpec.prompts.complete_scene
        : activeSpec.prompts.reference_sheet;

    const settings = getActiveAiSettings();
    let image: string | undefined;

    try {
      const response = await fetch("/api/regenerate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, aiSettings: settings }),
      });
      const data = (await response.json()) as { image?: string; error?: string };

      if (response.ok && data.image) {
        image = data.image;
      } else if (!canUseClientGeneration(settings)) {
        setError(data.error || "图片重新生成失败。");
        return;
      }
    } catch {
      if (!canUseClientGeneration(settings)) {
        setError("图片重新生成失败。");
        return;
      }
    }

    if (!image && settings && canUseClientGeneration(settings)) {
      try {
        image = await generateClientImage(prompt, settings);
      } catch {
        setError("图片重新生成失败。");
        return;
      }
    }

    if (!image) {
      setError("图片重新生成失败。");
      return;
    }

    setResult((current) => ({
      ...(current || {}),
      characterSpec: activeSpec,
      completeSceneImage: kind === "complete" ? image : current?.completeSceneImage,
      referenceSheetImage: kind === "reference" ? image : current?.referenceSheetImage,
    }));
  }

  function downloadImage(src: string, filename: string) {
    const link = document.createElement("a");
    link.href = src;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function copySetting() {
    if (!activeSpec) return;

    const text = formatSetting(activeSpec);
    await navigator.clipboard.writeText(text);
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
  }

  function updateSpecDraft(patch: CharacterSpecDraftPatch) {
    setSpecDraft((current) => ({
      ...(current || {}),
      ...patch,
      features: patch.features
        ? {
            ...(current?.features || {}),
            ...patch.features,
          }
        : current?.features,
      prompts: patch.prompts
        ? {
            ...(current?.prompts || {}),
            ...patch.prompts,
          }
        : current?.prompts,
    }));
  }

  async function tryClientGenerate(payload: GenerateRequest, status?: number) {
    const settings = payload.aiSettings;
    if (!settings || !canUseClientGeneration(settings)) return null;
    if (status && status !== 404 && status !== 405 && status < 500) return null;

    return generateClientResult(payload, settings);
  }

  function getActiveAiSettings() {
    const entries = Object.entries(aiSettings)
      .map(([key, value]) => [key, typeof value === "string" ? value.trim() : ""])
      .filter(([, value]) => value);

    return entries.length > 0
      ? (Object.fromEntries(entries) as OpenAIRequestSettings)
      : undefined;
  }

  function persistAiSettings() {
    const settings = getActiveAiSettings();

    if (settings) {
      window.localStorage.setItem(aiSettingsStorageKey, JSON.stringify(settings));
    } else {
      window.localStorage.removeItem(aiSettingsStorageKey);
    }

    setStep("home");
  }

  return (
    <main className="app-stage">
      <div className="phone-shell">
        {step === "home" && (
          <>
            <div className="hero-bg" />
            <section className="screen">
              <div className="topbar">
                <Sparkles size={22} color="var(--cyan)" />
                <span className="hint">兽格造像馆</span>
                <button className="icon-button" onClick={() => setStep("settings")} aria-label="模型设置">
                  <Settings size={18} />
                </button>
              </div>
              <h1 className="brand-title">兽格<br />造像馆</h1>
              <p className="brand-subtitle">
                输入你的性格、审美和幻想偏好，生成完整形象图、多维度设定图和设定说明。
              </p>
              <div className="action-stack">
                <button className="primary-action" onClick={startQuick}>
                  <strong>30秒算兽设</strong>
                  <ChevronRight size={20} />
                </button>
                <button className="secondary-action" onClick={startDeep}>
                  <strong>深度定制</strong>
                  <ChevronRight size={20} />
                </button>
              </div>
            </section>
          </>
        )}

        {step === "settings" && (
          <section className="screen screen-scroll">
            <Header onBack={() => setStep("home")} label="模型设置" />
            <h2 className="question-title review-title">自定义生成模型</h2>
            <p className="hint">
              设置会保存在本机浏览器或 APK 内，用于当前设备上的生成请求；留空则继续使用服务端环境变量。
            </p>
            <div className="preview-panel">
              <div className="form-grid">
                <Field label="模型 URL">
                  <input
                    placeholder="https://api.openai.com/v1"
                    value={aiSettings.baseURL || ""}
                    onChange={(event) =>
                      setAiSettings((current) => ({ ...current, baseURL: event.target.value }))
                    }
                  />
                </Field>
                <Field label="API Key">
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={aiSettings.apiKey || ""}
                    onChange={(event) =>
                      setAiSettings((current) => ({ ...current, apiKey: event.target.value }))
                    }
                  />
                </Field>
                <Field label="文本模型名称">
                  <input
                    placeholder="gpt-4.1-mini"
                    value={aiSettings.textModel || ""}
                    onChange={(event) =>
                      setAiSettings((current) => ({ ...current, textModel: event.target.value }))
                    }
                  />
                </Field>
                <Field label="图片模型名称">
                  <input
                    placeholder="gpt-image-2"
                    value={aiSettings.imageModel || ""}
                    onChange={(event) =>
                      setAiSettings((current) => ({ ...current, imageModel: event.target.value }))
                    }
                  />
                </Field>
              </div>
            </div>
            <div className="action-stack">
              <button className="primary-action" onClick={persistAiSettings}>
                <strong>保存并从选择开始</strong>
                <ChevronRight size={20} />
              </button>
              <button
                className="ghost-action"
                onClick={() => {
                  setAiSettings({});
                  window.localStorage.removeItem(aiSettingsStorageKey);
                }}
              >
                <span>清空本机设置</span>
                <RefreshCw size={18} />
              </button>
            </div>
          </section>
        )}

        {step === "quiz" && (
          <QuestionScreen
            label={`${questionIndex + 1} / ${questions.length}`}
            question={questions[questionIndex]}
            progress={((questionIndex + 1) / questions.length) * 100}
            hint=""
            selectedOptionId={getSelectedOptionId(answers, questions[questionIndex]?.id)}
            onBack={backFromQuickQuestion}
            onChoose={chooseAnswer}
          />
        )}

        {step === "deep" && activeDeepQuestion && (
          <section className="screen screen-scroll">
            <Header onBack={backFromDeepQuestion} label={`深度 ${deepAnswers.length + 1}`} />
            <div className="lineage-grid compact-grid">
              {depthOptions.map((item) => (
                <button
                  key={item.value}
                  className={`lineage-pill ${deepDepth === item.value ? "selected" : ""}`}
                  onClick={() => {
                    if (deepAnswers.length === 0) setDeepDepth(item.value);
                  }}
                  disabled={deepAnswers.length > 0}
                >
                  <strong>{item.title}</strong>
                  <small>{item.desc}</small>
                </button>
              ))}
            </div>
            <div className="progress">
              <span
                style={{
                  width: `${Math.min(
                    100,
                    ((deepAnswers.length + 1) /
                      (deepAnswers.length + remainingDeepQuestions.length)) *
                      100,
                  )}%`,
                }}
              />
            </div>
            <h2 className="question-title">{activeDeepQuestion.title}</h2>
            <p className="hint">
              当前分支：{branchLabel(activeDeepQuestion.branch)}。系统会根据前序答案继续抽取本地题库。
            </p>
            <div className="option-list">
              {activeDeepQuestion.options.map((option) => (
                <button
                  className={`option-button ${
                    getSelectedOptionId(deepAnswers, activeDeepQuestion.id) === option.id
                      ? "selected"
                      : ""
                  }`}
                  key={option.id}
                  aria-pressed={getSelectedOptionId(deepAnswers, activeDeepQuestion.id) === option.id}
                  onClick={() => chooseDeepAnswer(option.id)}
                >
                  <span>{option.label}</span>
                  <ChevronRight size={18} />
                </button>
              ))}
            </div>
            <details className="supplement-panel">
              <summary>补充项</summary>
              <div className="form-grid">
                <Field label="主物种偏好">
                  <input value={deepConfig.primarySpeciesPreference || ""} onChange={(event) => setDeepConfig({ ...deepConfig, primarySpeciesPreference: event.target.value })} />
                </Field>
                <Field label="副物种偏好">
                  <input value={deepConfig.secondarySpeciesPreference || ""} onChange={(event) => setDeepConfig({ ...deepConfig, secondarySpeciesPreference: event.target.value })} />
                </Field>
              </div>
            </details>
          </section>
        )}

        {step === "review" && (
          <section className="screen screen-scroll">
            <Header onBack={backFromReview} label="生成确认" />
            <h2 className="question-title review-title">确认提示词与标签</h2>
            <p className="hint">以下内容会作为本次生成的中文设定依据；确认后将直接使用这些提示词生成完整形象图和多维度设定图。</p>

            <div className="preview-panel">
              <div className="section-title">
                <span>血统模式</span>
                <small>{generationPreview.scoreSnapshot.lineageRecommendation === "pure" ? "系统建议：纯血" : "系统建议：混血"}</small>
              </div>
              <div className="lineage-grid compact-grid">
                {lineageOptions.map((item) => (
                  <button
                    key={item.value}
                    className={`lineage-pill ${lineageMode === item.value ? "selected" : ""}`}
                    onClick={() => {
                      setLineageMode(item.value);
                      setSpecDraft(null);
                    }}
                  >
                    <strong>{item.title}</strong>
                    <small>{item.desc}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="summary-card preview-summary">
              <div className="stat-grid">
                <Stat label="主物种" value={reviewSpec.primary_species} />
                <Stat label="血统" value={reviewSpec.lineage_mode === "pure" ? "纯血" : "混血"} />
                <Stat label="体型" value={reviewSpec.body} />
                <Stat label="身高" value={reviewSpec.height} />
              </div>
              <p>{reviewSpec.setting_description}</p>
            </div>

            <EditableCharacterSpecPanel
              baseSpec={generationPreview.characterSpec}
              draft={specDraft}
              onChange={updateSpecDraft}
              onReset={() => setSpecDraft(null)}
            />

            <div className="preview-panel">
              <div className="section-title">
                <span>物种排序</span>
              </div>
              <div className="tag-row">
                {generationPreview.scoreSnapshot.speciesCandidates
                  .filter((item) => item.score > 0)
                  .slice(0, 8)
                  .map((item) => (
                    <span className="tag" key={item.key}>
                      {item.species} {item.score}
                    </span>
                  ))}
              </div>
            </div>

            <div className="preview-panel">
              <div className="section-title">
                <span>标签内容</span>
              </div>
              <div className="tag-group-list">
                {generationPreview.tagGroups.map((group) => (
                  <div className="tag-group" key={group.category}>
                    <div className="tag-group-title">{group.categoryLabel}</div>
                    <div className="score-tag-grid">
                      {group.tags.map((tag) => (
                        <span className="score-tag" key={tag.key}>
                          <strong>{tag.label}</strong>
                          <em>{tag.score}</em>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="preview-panel">
              <div className="section-title">
                <span>具体提示词</span>
                <button
                  className="icon-button"
                  aria-label="复制全部提示词"
                  onClick={() => copyText(formatPrompts(reviewSpec))}
                >
                  <Clipboard size={17} />
                </button>
              </div>
              <PromptBlock title="完整形象图提示词" value={reviewSpec.prompts.complete_scene} />
              <PromptBlock title="多维度设定图提示词" value={reviewSpec.prompts.reference_sheet} />
              <PromptBlock title="头像提示词" value={reviewSpec.prompts.avatar} />
            </div>

            <div className="action-stack">
              <button className="primary-action" onClick={generate}>
                <strong>确认并开始生成</strong>
                <Sparkles size={20} />
              </button>
            </div>
          </section>
        )}

        {step === "lineage" && (
          <section className="screen">
            <Header onBack={() => setStep("review")} label="血统模式" />
            <h2 className="question-title">选择你的血统推演方式</h2>
            <p className="hint">系统建议：{scoreSnapshot?.lineageRecommendation === "pure" ? "纯血" : "混血"}。你也可以手动覆盖。</p>
            <div className="lineage-grid">
              {lineageOptions.map((item) => (
                <button
                  key={item.value}
                  className={`lineage-pill ${lineageMode === item.value ? "selected" : ""}`}
                  onClick={() => {
                    setLineageMode(item.value);
                    setSpecDraft(null);
                  }}
                >
                  <strong>{item.title}</strong>
                  <small>{item.desc}</small>
                </button>
              ))}
            </div>
            <div className="action-stack">
              <button className="primary-action" onClick={generate}>
                <strong>开始推演</strong>
                <Sparkles size={20} />
              </button>
            </div>
          </section>
        )}

        {step === "loading" && (
          <section className="screen">
            <div className="loading-panel">
              <Sparkles size={30} color="var(--cyan)" />
              <h2 className="question-title" style={{ marginTop: 18 }}>正在推演你的兽设</h2>
              <p className="hint">系统会一次性生成完整形象图、多维度设定图和设定说明。</p>
              <div className="loading-list">
                {loadingSteps.map((item, index) => (
                  <div className="loading-row" key={item}>
                    <span className="loading-dot" style={{ opacity: index <= loadingIndex ? 1 : 0.25 }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {step === "result" && (
          <section className="screen screen-scroll">
            <Header onBack={() => setStep("home")} label="推演结果" />
            {error && <div className="error-box">{error}</div>}
            {activeSpec ? (
              <>
                <div className="result-profile">
                  <div>
                    <p className="result-kicker">角色档案</p>
                    <h2>{activeSpec.positioning || activeSpec.primary_species}</h2>
                    <p>{activeSpec.catchphrase || activeSpec.setting_description}</p>
                  </div>
                  <span>{activeSpec.lineage_mode === "pure" ? "纯血" : "混血"}</span>
                </div>

                {completeImage && (
                  <div className="result-hero result-section">
                    <img src={completeImage} alt="完整形象图" />
                  </div>
                )}
                <div className="section-title">
                  <span>完整形象图</span>
                  <button className="icon-button" onClick={() => retryImage("complete")}>
                    <RefreshCw size={17} />
                  </button>
                </div>

                <div className="result-section">
                  <div className="section-title">
                    <span>多维度设定图</span>
                    <div className="button-row">
                      <button className="icon-button" onClick={() => retryImage("reference")}>
                        <RefreshCw size={17} />
                      </button>
                      {referenceImage && (
                        <button className="icon-button" onClick={() => downloadImage(referenceImage, "fursona-reference.png")}>
                          <Download size={17} />
                        </button>
                      )}
                    </div>
                  </div>
                  {referenceImage && (
                    <div className="result-card">
                      <img src={referenceImage} alt="多维度设定图" />
                    </div>
                  )}
                  <div className="dimension-panel">
                    <div className="dimension-heading">
                      <span>三维设定速览</span>
                      <small>外形 / 性格 / 世界</small>
                    </div>
                    <DimensionBlock
                      title="外形识别"
                      value={`${activeSpec.body}，${activeSpec.features.ears}，${activeSpec.features.tail}`}
                    />
                    <DimensionBlock
                      title="性格动势"
                      value={activeSpec.personality_keywords.slice(0, 4).join(" / ")}
                    />
                    <DimensionBlock
                      title="世界锚点"
                      value={`${activeSpec.mission}，${activeSpec.signature_item}`}
                    />
                  </div>
                  {result?.imageErrors?.referenceSheetImage && (
                    <div className="error-box">{result.imageErrors.referenceSheetImage}</div>
                  )}
                </div>

                <div className="result-section">
                  <div className="section-title">
                    <span>设定说明</span>
                    <button className="icon-button" onClick={copySetting}>
                      <Clipboard size={17} />
                    </button>
                  </div>
                  <div className="summary-card">
                    <div className="stat-grid">
                      <Stat label="种族" value={activeSpec.primary_species} />
                      <Stat label="属性" value={activeSpec.colors.accent || activeSpec.colors.primary} />
                      <Stat label="身高" value={activeSpec.height} />
                      <Stat label="性格" value={activeSpec.personality_keywords.slice(0, 2).join(" / ")} />
                      <Stat label="特长" value={activeSpec.signature_item} />
                      <Stat label="象征" value={activeSpec.visual_keywords.slice(0, 2).join(" / ")} />
                    </div>
                    <div className="keyword-strip">
                      设定关键词：{activeSpec.visual_keywords.slice(0, 4).join(" / ")}
                    </div>
                    <p>{activeSpec.setting_description}</p>
                  </div>
                </div>

                <div className="action-stack">
                  {completeImage && (
                    <button className="primary-action" onClick={() => downloadImage(completeImage, "fursona-complete-scene.png")}>
                      <strong>保存完整形象图</strong>
                      <Download size={19} />
                    </button>
                  )}
                  <button className="ghost-action" onClick={generate}>
                    <span>重新生成</span>
                    <RefreshCw size={18} />
                  </button>
                  <button className="ghost-action" onClick={() => setStep("home")}>
                    <span>从选择开始</span>
                    <ChevronRight size={18} />
                  </button>
                </div>
              </>
            ) : (
              <div className="action-stack">
                <button className="primary-action" onClick={() => setStep("review")}>
                  <strong>返回重新生成</strong>
                  <RefreshCw size={18} />
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function QuestionScreen({
  label,
  question,
  progress,
  hint,
  selectedOptionId,
  onBack,
  onChoose,
}: {
  label: string;
  question: Question;
  progress: number;
  hint: string;
  selectedOptionId: string | null;
  onBack: () => void;
  onChoose: (optionId: string) => void;
}) {
  return (
    <section className="screen">
      <Header onBack={onBack} label={label} />
      <div className="progress">
        <span style={{ width: `${progress}%` }} />
      </div>
      <h2 className="question-title">{question.title}</h2>
      <p className="hint">{hint}</p>
      <div className="option-list">
        {question.options.map((option, index) => {
          const Icon = index === 0 ? PawPrint : index === 1 ? Shield : index === 2 ? Moon : UserRound;
          return (
            <button
              className={`option-button ${selectedOptionId === option.id ? "selected" : ""}`}
              key={option.id}
              aria-pressed={selectedOptionId === option.id}
              onClick={() => onChoose(option.id)}
            >
              <span>{option.label}</span>
              <Icon size={22} color="var(--cyan)" />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Header({ onBack, label }: { onBack: () => void; label: string }) {
  return (
    <div className="topbar">
      <button className="icon-button" onClick={onBack} aria-label="返回">
        <ArrowLeft size={19} />
      </button>
      <span className="hint">{label}</span>
      <Flame size={20} color="var(--orange)" />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function EditableCharacterSpecPanel({
  baseSpec,
  draft,
  onChange,
  onReset,
}: {
  baseSpec: CharacterSpec;
  draft: CharacterSpecDraftPatch | null;
  onChange: (patch: CharacterSpecDraftPatch) => void;
  onReset: () => void;
}) {
  const value = (key: keyof CharacterSpecDraftPatch, fallback: string) => {
    const draftValue = draft?.[key];
    return typeof draftValue === "string" ? draftValue : fallback;
  };
  const featureValue = (key: keyof CharacterSpec["features"]) =>
    draft?.features?.[key] ?? baseSpec.features[key];
  const promptValue = (key: keyof CharacterSpec["prompts"]) =>
    draft?.prompts?.[key] ?? baseSpec.prompts[key];

  return (
    <div className="preview-panel edit-panel">
      <div className="section-title">
        <span>手动编辑设定</span>
        <button className="text-button" onClick={onReset}>
          恢复系统草案
        </button>
      </div>
      <p className="hint">这里的修改会直接用于本次生成；适合补充角色姓名以外的设定、外观细节和画面要求。</p>

      <div className="form-grid edit-grid">
        <Field label="角色定位">
          <input
            data-testid="review-positioning"
            value={value("positioning", baseSpec.positioning)}
            onChange={(event) => onChange({ positioning: event.target.value })}
          />
        </Field>
        <Field label="身高">
          <input
            data-testid="review-height"
            value={value("height", baseSpec.height)}
            onChange={(event) => onChange({ height: event.target.value })}
          />
        </Field>
        <Field label="体型">
          <input
            data-testid="review-body"
            value={value("body", baseSpec.body)}
            onChange={(event) => onChange({ body: event.target.value })}
          />
        </Field>
        <Field label="标志物">
          <input
            data-testid="review-signature-item"
            value={value("signature_item", baseSpec.signature_item)}
            onChange={(event) => onChange({ signature_item: event.target.value })}
          />
        </Field>
        <Field label="任务">
          <input
            data-testid="review-mission"
            value={value("mission", baseSpec.mission)}
            onChange={(event) => onChange({ mission: event.target.value })}
          />
        </Field>
        <Field label="口头禅">
          <input
            data-testid="review-catchphrase"
            value={value("catchphrase", baseSpec.catchphrase)}
            onChange={(event) => onChange({ catchphrase: event.target.value })}
          />
        </Field>
      </div>

      <div className="form-grid">
        <Field label="设定说明">
          <textarea
            data-testid="review-setting-description"
            value={value("setting_description", baseSpec.setting_description)}
            onChange={(event) => onChange({ setting_description: event.target.value })}
          />
        </Field>
        <Field label="性格关键词">
          <textarea
            data-testid="review-personality-keywords"
            value={draft?.personality_keywords ?? baseSpec.personality_keywords.join("\n")}
            onChange={(event) => onChange({ personality_keywords: event.target.value })}
          />
        </Field>
        <Field label="视觉关键词">
          <textarea
            data-testid="review-visual-keywords"
            value={draft?.visual_keywords ?? baseSpec.visual_keywords.join("\n")}
            onChange={(event) => onChange({ visual_keywords: event.target.value })}
          />
        </Field>
      </div>

      <details className="supplement-panel edit-details">
        <summary>编辑外观细节</summary>
        <div className="form-grid edit-grid">
          <Field label="耳朵">
            <input
              data-testid="review-feature-ears"
              value={featureValue("ears")}
              onChange={(event) => onChange({ features: { ears: event.target.value } })}
            />
          </Field>
          <Field label="尾巴">
            <input
              data-testid="review-feature-tail"
              value={featureValue("tail")}
              onChange={(event) => onChange({ features: { tail: event.target.value } })}
            />
          </Field>
          <Field label="眼睛">
            <input
              data-testid="review-feature-eyes"
              value={featureValue("eyes")}
              onChange={(event) => onChange({ features: { eyes: event.target.value } })}
            />
          </Field>
          <Field label="毛色">
            <input
              data-testid="review-feature-fur"
              value={featureValue("fur")}
              onChange={(event) => onChange({ features: { fur: event.target.value } })}
            />
          </Field>
          <Field label="特殊标记">
            <input
              data-testid="review-feature-special-marks"
              value={featureValue("special_marks")}
              onChange={(event) => onChange({ features: { special_marks: event.target.value } })}
            />
          </Field>
          <Field label="服装">
            <input
              data-testid="review-outfit"
              value={value("outfit", baseSpec.outfit)}
              onChange={(event) => onChange({ outfit: event.target.value })}
            />
          </Field>
        </div>
      </details>

      <details className="supplement-panel edit-details">
        <summary>高级：编辑图片提示词</summary>
        <div className="form-grid">
          <Field label="完整形象图提示词">
            <textarea
              data-testid="review-complete-prompt"
              className="prompt-editor"
              value={promptValue("complete_scene")}
              onChange={(event) => onChange({ prompts: { complete_scene: event.target.value } })}
            />
          </Field>
          <Field label="多维度设定图提示词">
            <textarea
              data-testid="review-reference-prompt"
              className="prompt-editor"
              value={promptValue("reference_sheet")}
              onChange={(event) => onChange({ prompts: { reference_sheet: event.target.value } })}
            />
          </Field>
        </div>
      </details>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DimensionBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="dimension-block">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PromptBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="prompt-block">
      <div className="prompt-title">{title}</div>
      <pre>{value}</pre>
    </div>
  );
}

function branchLabel(branch: Question["branch"]) {
  const labels: Record<Question["branch"], string> = {
    quick: "快速",
    base: "基础判断",
    lineage: "血统细化",
    mammal: "哺乳类细化",
    mythic: "神话鳞片",
    special: "特殊材质",
    visual: "视觉设定",
    world: "世界任务",
    constraints: "约稿约束",
  };
  return labels[branch];
}

function formatSetting(spec: CharacterSpec) {
  return [
    `血统：${spec.lineage_mode === "pure" ? "纯血" : "混血"}`,
    `物种：${spec.primary_species}`,
    `身高：${spec.height}`,
    `比例：${Object.entries(spec.species_ratio).map(([key, value]) => `${key} ${value}%`).join(" / ")}`,
    `性格：${spec.personality_keywords.join("、")}`,
    `外观：${spec.visual_keywords.join("、")}`,
    `背景：${spec.background_story}`,
  ].join("\n");
}

function formatPrompts(spec: CharacterSpec) {
  return [
    `完整形象图提示词：\n${spec.prompts.complete_scene}`,
    `多维度设定图提示词：\n${spec.prompts.reference_sheet}`,
    `头像提示词：\n${spec.prompts.avatar}`,
  ].join("\n\n");
}

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
  Shield,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { quickQuestions } from "@/data/quickQuestions";
import { deepQuestionBank } from "@/data/deepQuestionBank";
import type { Answer, Question } from "@/data/questionTypes";
import {
  type CharacterSpec,
  type DeepConfig,
  type GenerateRequest,
  type LineageMode,
} from "@/lib/fursona";
import { selectDeepQuestions, type DeepFlowDepth } from "@/lib/questionFlow";
import {
  getPreviousQuickQuestionIndex,
  getSelectedOptionId,
  popPreviousDeepQuestion,
  pushDeepQuestion,
  upsertAnswer,
} from "@/lib/questionnaireNavigation";
import { scoreAnswers, type ScoreSnapshot } from "@/lib/scoring";

type Step = "home" | "quiz" | "deep" | "review" | "lineage" | "loading" | "result";

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
  const [error, setError] = useState<string | null>(null);
  const [loadingIndex, setLoadingIndex] = useState(0);

  const activeSpec = result?.characterSpec;
  const completeImage = result?.completeSceneImage || null;
  const referenceImage = result?.referenceSheetImage || null;
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
    setError(null);
    setStep("quiz");
  }

  function startDeep() {
    setMode("deep");
    setDeepAnswers([]);
    setDeepQuestionStack([]);
    setCurrentDeepQuestionId(null);
    setScoreSnapshot(null);
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
    const payload: GenerateRequest = {
      mode,
      lineageMode,
      answers: activeAnswers,
      deepConfig: mode === "deep" ? deepConfig : undefined,
      scoreSnapshot: scoreSnapshot || scoreAnswers(activeAnswers),
    };

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as GenerateResponse;

      if (!response.ok) {
        setError(data.error || "生成失败。");
        setResult(null);
      } else {
        if (data.error) {
          setError(data.error);
        }
        setResult(data);
      }
    } catch {
      setError("网络请求失败，请检查本地服务或稍后重试。");
      setResult(null);
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

    const response = await fetch("/api/regenerate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = (await response.json()) as { image?: string; error?: string };

    if (!response.ok || !data.image) {
      setError(data.error || "图片重新生成失败。");
      return;
    }

    setResult((current) => ({
      ...(current || {}),
      characterSpec: activeSpec,
      completeSceneImage: kind === "complete" ? data.image : current?.completeSceneImage,
      referenceSheetImage: kind === "reference" ? data.image : current?.referenceSheetImage,
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

  return (
    <main className="app-stage">
      <div className="phone-shell">
        {step === "home" && (
          <>
            <div className="hero-bg" />
            <section className="screen">
              <div className="topbar">
                <Sparkles size={22} color="var(--cyan)" />
                <span className="hint">兽格推算所</span>
              </div>
              <h1 className="brand-title">兽格<br />推算所</h1>
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
            <Header onBack={backFromReview} label="生成前确认" />
            <h2 className="question-title">准备生成兽设</h2>
            <p className="hint">确认后会整理设定说明，并生成完整形象图和多维度设定图。</p>
            <div className="action-stack">
              <button className="primary-action" onClick={generate}>
                <strong>确认生成</strong>
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
                  onClick={() => setLineageMode(item.value)}
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
                      <Stat label="物种" value={activeSpec.primary_species} />
                      <Stat label="身高" value={activeSpec.height} />
                      <Stat label="血统" value={activeSpec.lineage_mode === "pure" ? "纯血" : "混血"} />
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
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

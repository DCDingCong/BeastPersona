"use client";

/* eslint-disable @next/next/no-img-element */

import {
  ArrowLeft,
  ChevronRight,
  Clipboard,
  Download,
  Flame,
  ImageIcon,
  Layers3,
  LockKeyhole,
  Mail,
  Moon,
  PawPrint,
  RefreshCw,
  Shield,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

type StartJobResponse = {
  jobId?: string;
  status?: "queued" | "running" | "succeeded" | "failed";
  queuePosition?: number | null;
  credits?: number;
  error?: string;
};

type JobStatusResponse<T> = {
  status?: "queued" | "running" | "succeeded" | "failed";
  resultId?: string;
  queuePosition?: number | null;
  result?: T;
  error?: string;
};

type ImageJobResult = {
  image?: string;
};

type AccountSummary = {
  id: string;
  email?: string | null;
  credits: number;
  anonymous: boolean;
};

type UserJobSummary = {
  id: string;
  kind?: "generate" | "regenerate-image";
  status: "queued" | "running" | "succeeded" | "failed";
  cost?: number;
  createdAt?: string;
  updatedAt?: string;
  queuePosition?: number | null;
  error?: string;
};

type UserResultSummary = {
  id: string;
  jobId: string;
  title: string;
  createdAt: string;
  assets?: {
    completeSceneUrl?: string;
    referenceSheetUrl?: string;
  };
};

type MeResponse = {
  user?: {
    id: string;
    email?: string | null;
    anonymous?: boolean;
  };
  mode?: "anonymous" | "multi-user";
  credits?: number;
  jobs?: UserJobSummary[];
  results?: UserResultSummary[];
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

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function readJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
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
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [accountJobs, setAccountJobs] = useState<UserJobSummary[]>([]);
  const [accountResults, setAccountResults] = useState<UserResultSummary[]>([]);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [accountLoaded, setAccountLoaded] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [currentResultId, setCurrentResultId] = useState<string | null>(null);

  const activeSpec = result?.characterSpec;
  const isAnonymousMode = account?.anonymous === true;
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

  useEffect(() => {
    void refreshAccount();
  }, []);

  async function refreshAccount() {
    try {
      const response = await fetch("/api/me", { cache: "no-store" });
      const data = await readJson<MeResponse>(response);

      if (response.ok) {
        setAccount(
          data.user
            ? {
                id: data.user.id,
                email: data.user.email,
                credits: data.credits || 0,
                anonymous: data.user.anonymous === true,
              }
            : null,
        );
        setAccountJobs(data.jobs || []);
        setAccountResults(data.results || []);
      } else if (response.status === 401) {
        setAccount(null);
        setAccountJobs([]);
        setAccountResults([]);
      }
    } catch {
      setAccount(null);
    } finally {
      setAccountLoaded(true);
    }
  }

  async function submitAuth() {
    setAuthLoading(true);
    setAuthMessage(null);

    try {
      const response = await fetch(`/api/auth/${authMode === "login" ? "login" : "signup"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail.trim(), password: authPassword }),
      });
      const data = await readJson<{ error?: string }>(response);
      if (!response.ok) {
        setAuthMessage(data.error || "账户服务暂时不可用，请稍后再试。");
        return;
      }

      setAuthMessage(null);
      await refreshAccount();
    } catch {
      setAuthMessage("服务暂时不可用，请稍后再试。");
    } finally {
      setAuthLoading(false);
    }
  }

  async function signOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setAccount(null);
      setAccountJobs([]);
      setAccountResults([]);
      setAuthPassword("");
      setAuthMode("login");
      setAuthMessage(null);
      setCurrentResultId(null);
      setStep("home");
    }
  }

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

  async function generateWithJob() {
    setError(null);
    setResult(null);
    setLoadingIndex(0);
    setQueuePosition(null);
    setCurrentResultId(null);
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
    };

    try {
      const data = await startAndPollJob<GenerateResponse>(
        "/api/generate/jobs",
        "/api/generate/jobs",
        payload,
      );
      if (data.error) {
        setError(data.error);
      }
      setResult(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "网络请求失败，请检查本地服务或稍后重试。",
      );
      setResult(null);
    } finally {
      window.clearInterval(timer);
      await refreshAccount();
      setStep("result");
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  async function retryImageWithJob(kind: "complete" | "reference") {
    if (!activeSpec || !currentResultId) return;

    let image: string | undefined;
    setError(null);

    try {
      const result = await startAndPollJob<ImageJobResult>(
        "/api/regenerate-image/jobs",
        "/api/regenerate-image/jobs",
        {
          resultId: currentResultId,
          imageKind: kind === "complete" ? "complete_scene" : "reference_sheet",
        },
      );
      image = result.image;
      await refreshAccount();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "图片重新生成失败。");
      return;
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

  async function openGenerationJob(jobId: string) {
    setError(null);
    setQueuePosition(null);
    setStep("loading");

    try {
      const data = await pollExistingJob<GenerateResponse>("/api/generate/jobs", jobId);
      if (data.error) {
        setError(data.error);
      }
      setResult(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "生成任务查询失败。",
      );
    } finally {
      await refreshAccount();
      setStep("result");
    }
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

  async function startAndPollJob<T>(
    startUrl: string,
    statusBaseUrl: string,
    body: unknown,
  ): Promise<T> {
    const startResponse = await fetch(startUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const startData = await readJson<StartJobResponse>(startResponse);

    if (!startResponse.ok || !startData.jobId) {
      throw new Error(startData.error || `生成任务启动失败：${startResponse.status}`);
    }

    if (typeof startData.credits === "number") {
      setAccount((current) =>
        current ? { ...current, credits: startData.credits || 0 } : current,
      );
    }
    setQueuePosition(startData.queuePosition ?? null);

    return pollExistingJob<T>(statusBaseUrl, startData.jobId);
  }

  async function pollExistingJob<T>(statusBaseUrl: string, jobId: string): Promise<T> {
    for (let attempt = 0; attempt < 240; attempt += 1) {
      await delay(attempt === 0 ? 800 : 2000);

      const statusResponse = await fetch(
        `${statusBaseUrl}/${encodeURIComponent(jobId)}`,
        { cache: "no-store" },
      );
      const statusData = await readJson<JobStatusResponse<T>>(statusResponse);

      if (!statusResponse.ok) {
        throw new Error(statusData.error || `生成任务查询失败：${statusResponse.status}`);
      }

      setQueuePosition(statusData.queuePosition ?? null);
      if (statusData.resultId) {
        setCurrentResultId(statusData.resultId);
      }

      if (statusData.status === "succeeded" && statusData.result) {
        return statusData.result;
      }

      if (statusData.status === "failed") {
        throw new Error(statusData.error || "生成任务失败。");
      }
    }

    throw new Error("生成仍在进行中，请稍后重试。");
  }

  return (
    <main className="app-stage">
      <div className="phone-shell">
        {!accountLoaded && (
          <section className="screen loading-screen">
            <div className="loading-panel">
              <Sparkles size={30} color="var(--cyan)" />
              <h2 className="question-title" style={{ marginTop: 18 }}>正在读取账户</h2>
              <p className="hint">请稍候。</p>
            </div>
          </section>
        )}

        {accountLoaded && !account && (
          <AuthScreen
            email={authEmail}
            password={authPassword}
            mode={authMode}
            loading={authLoading}
            message={authMessage}
            onEmailChange={setAuthEmail}
            onPasswordChange={setAuthPassword}
            onModeChange={setAuthMode}
            onSubmit={submitAuth}
          />
        )}

        {account && step === "home" && (
          <>
            <div className="hero-bg" />
            <section className="screen screen-scroll home-screen">
              <div className="topbar">
                <div className="home-brand-mark">
                  <span className="home-brand-icon"><Sparkles size={18} /></span>
                  <span>兽格造像馆</span>
                </div>
                <div className="topbar-actions">
                  {!isAnonymousMode && (
                    <>
                      <AccountPill account={account} onRefresh={refreshAccount} />
                      <button className="text-button" onClick={signOut}>退出</button>
                    </>
                  )}
                </div>
              </div>
              <div className="home-hero">
                <div className="home-hero-copy">
                  <h1 className="brand-title">兽格<br />造像馆</h1>
                  <div className="home-hero-divider" aria-hidden="true" />
                  <p className="brand-subtitle">
                    输入你的性格、审美和幻想偏好，生成完整形象图、多维度设定图和设定说明。
                  </p>
                </div>
              </div>
              <div className="action-stack">
                <button className="primary-action" onClick={startQuick}>
                  <span className="action-main">
                    <span className="action-icon"><PawPrint size={23} /></span>
                    <strong>30秒算兽设</strong>
                  </span>
                  <ChevronRight className="action-chevron" size={21} />
                </button>
                <button className="secondary-action" onClick={startDeep}>
                  <span className="action-main">
                    <span className="action-icon"><Layers3 size={22} /></span>
                    <strong>深度定制</strong>
                  </span>
                  <ChevronRight className="action-chevron" size={21} />
                </button>
              </div>
              <GenerationHistoryList
                jobs={accountJobs}
                results={accountResults}
                onOpenGenerationJob={openGenerationJob}
              />
            </section>
          </>
        )}

        {account && step === "quiz" && (
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

        {account && step === "deep" && activeDeepQuestion && (
          <section className="screen screen-scroll flow-screen">
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

        {account && step === "review" && (
          <section className="screen screen-scroll review-screen">
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
              <button className="primary-action" onClick={generateWithJob}>
                <strong>确认并开始生成</strong>
                {!isAnonymousMode && <span>消耗 1 积分</span>}
                <Sparkles size={20} />
              </button>
            </div>
          </section>
        )}

        {account && step === "lineage" && (
          <section className="screen flow-screen">
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
              <button className="primary-action" onClick={generateWithJob}>
                <strong>开始推演</strong>
                {!isAnonymousMode && <span>消耗 1 积分</span>}
                <Sparkles size={20} />
              </button>
            </div>
          </section>
        )}

        {account && step === "loading" && (
          <section className="screen loading-screen">
            <div className="loading-panel">
              <Sparkles size={30} color="var(--cyan)" />
              <h2 className="question-title" style={{ marginTop: 18 }}>正在推演你的兽设</h2>
              <p className="hint">
                {queuePosition
                  ? `当前排队第 ${queuePosition} 位，完成后会自动进入结果页。`
                  : "系统会一次性生成完整形象图、多维度设定图和设定说明。"}
              </p>
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

        {account && step === "result" && (
          <section className="screen screen-scroll result-screen">
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

                <div className="result-section">
                  <div className="section-title">
                    <span>完整形象图</span>
                    <button
                      className="icon-button"
                      aria-label="重新生成完整形象图"
                      title="重新生成"
                      onClick={() => retryImageWithJob("complete")}
                    >
                      <RefreshCw size={17} />
                    </button>
                  </div>
                  {completeImage && (
                    <div className="result-hero">
                      <img src={completeImage} alt="完整形象图" />
                    </div>
                  )}
                </div>

                <div className="result-section">
                  <div className="section-title">
                    <span>多维度设定图</span>
                    <div className="button-row">
                      <button className="icon-button" onClick={() => retryImageWithJob("reference")}>
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
                  <button className="ghost-action" onClick={generateWithJob}>
                    <span>{isAnonymousMode ? "重新生成" : "重新生成 · 消耗 1 积分"}</span>
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
    <section className="screen quiz-screen">
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

function AuthScreen({
  email,
  password,
  mode,
  loading,
  message,
  onEmailChange,
  onPasswordChange,
  onModeChange,
  onSubmit,
}: {
  email: string;
  password: string;
  mode: "login" | "signup";
  loading: boolean;
  message: string | null;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onModeChange: (mode: "login" | "signup") => void;
  onSubmit: () => void;
}) {
  return (
    <>
      <div className="hero-bg auth-hero-bg">
        <img src="/auth-atelier-bg.png" alt="" />
      </div>
      <section className="screen screen-scroll auth-screen">
        <div className="auth-topbar">
          <div className="auth-brand-mark">
            <Sparkles size={28} />
            <span>兽格造像馆</span>
          </div>
          <div className="auth-account-pill">
            <UserRound size={18} />
            <span>账户</span>
          </div>
        </div>
        <h1 className="brand-title auth-title">兽格造像馆</h1>
        <div className="auth-divider" aria-hidden="true" />
        <p className="brand-subtitle">
          输入你的性格、审美和幻想偏好，生成完整形象图、多维度设定图和设定说明。登录后作品会保存到你的个人历史中。
        </p>
        <div className="auth-feature-grid" aria-label="平台能力">
          <div className="auth-feature-card">
            <span className="auth-feature-icon"><ImageIcon size={17} /></span>
            <strong>完整形象图</strong>
          </div>
          <div className="auth-feature-card">
            <span className="auth-feature-icon"><Layers3 size={17} /></span>
            <strong>多维设定图</strong>
          </div>
          <div className="auth-feature-card">
            <span className="auth-feature-icon auth-feature-icon-warm"><Clipboard size={17} /></span>
            <strong>历史作品保存</strong>
          </div>
        </div>
        <div className="auth-panel">
          <div className="auth-panel-heading">
            <span className="auth-heading-icon"><LockKeyhole size={19} /></span>
            <strong>{mode === "login" ? "登录账户" : "创建账户"}</strong>
          </div>
          <div className="auth-form-grid">
            <label className="auth-field">
              <span><Mail size={18} /></span>
              <input
                aria-label="邮箱"
                autoComplete="email"
                inputMode="email"
                placeholder="邮箱地址"
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
              />
            </label>
            <label className="auth-field">
              <span><LockKeyhole size={18} /></span>
              <input
                aria-label="密码"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder={mode === "signup" ? "密码（至少 8 位）" : "密码"}
                type="password"
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
              />
            </label>
          </div>
          {message && <div className="error-box">{message}</div>}
          <button
            className="primary-action auth-submit"
            disabled={loading || !email.trim() || password.length < 8}
            onClick={onSubmit}
            type="button"
          >
            <strong>{mode === "login" ? "登录" : "创建账户"}</strong>
            <ChevronRight size={20} />
          </button>
          <div className="auth-switch">
            <span>{mode === "login" ? "还没有账户？" : "已有账户？"}</span>
            <button
              onClick={() => onModeChange(mode === "login" ? "signup" : "login")}
              type="button"
            >
              {mode === "login" ? "注册" : "登录"}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

function AccountPill({
  account,
  onRefresh,
}: {
  account: AccountSummary | null;
  onRefresh: () => void;
}) {
  return (
    <button className="credit-pill" onClick={onRefresh} aria-label="刷新积分">
      <Sparkles size={14} />
      <span>{account ? `${account.credits} 积分` : "积分"}</span>
    </button>
  );
}

function GenerationHistoryList({
  jobs,
  results,
  onOpenGenerationJob,
}: {
  jobs: UserJobSummary[];
  results: UserResultSummary[];
  onOpenGenerationJob: (jobId: string) => void;
}) {
  const resultsByJobId = new Map(results.map((result) => [result.jobId, result]));
  const knownJobIds = new Set(jobs.map((job) => job.id));
  const historyItems = [
    ...jobs.map((job) => ({
      id: job.id,
      jobId: job.id,
      title: resultsByJobId.get(job.id)?.title || (job.kind === "regenerate-image" ? "图片重绘" : "完整生成"),
      createdAt: job.createdAt || job.updatedAt || "",
      job,
    })),
    ...results
      .filter((result) => !knownJobIds.has(result.jobId))
      .map((result) => ({
        id: result.id,
        jobId: result.jobId,
        title: result.title,
        createdAt: result.createdAt,
        job: null,
      })),
  ]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 6);

  if (historyItems.length === 0) return null;

  return (
    <div className="history-panel">
      <div className="section-title">
        <span>我的任务</span>
      </div>
      <div className="history-list">
        {historyItems.map((item) => {
          const canOpen = !item.job || (item.job.kind !== "regenerate-image" && item.job.status === "succeeded");

          return (
            <button
              className="history-row"
              data-status={item.job?.status || "succeeded"}
              disabled={!canOpen}
              key={item.id}
              onClick={() => onOpenGenerationJob(item.jobId)}
            >
              <span className="history-row-main">
                <span className="history-row-icon"><Layers3 size={16} /></span>
                <span>{item.title}</span>
              </span>
              <span className="history-row-meta">
                <strong>{item.job ? formatJobStatus(item.job) : "查看结果"}</strong>
                {canOpen && <ChevronRight size={17} aria-hidden="true" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatJobStatus(job: UserJobSummary) {
  if (job.status === "queued") {
    return job.queuePosition ? `排队第 ${job.queuePosition} 位` : "排队中";
  }

  if (job.status === "running") return "生成中";
  if (job.status === "succeeded") return job.kind === "generate" ? "查看结果" : "已完成";
  return job.error || "失败";
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

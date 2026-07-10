import {
  claimNextGenerationJob,
  type GenerationJobRecord,
  type ImageKind,
} from "./asyncJobs";
import {
  completeGenerationJob,
  createGenerationAsset,
  createGenerationResult,
  failGenerationJob,
  getResultForWorker,
} from "./generationRepository";
import { deleteStoredAsset, uploadJobImage } from "./generationStorage";
import {
  generateFursonaResult,
  regenerateImage,
  type GenerateResponse,
} from "./serverGeneration";
import { withChineseReferenceSheetRules } from "./fursona";

let workerRunning = false;

export function kickGenerationWorker() {
  if (workerRunning) return;

  workerRunning = true;
  void drainGenerationQueue().finally(() => {
    workerRunning = false;
  });
}

async function drainGenerationQueue() {
  for (;;) {
    const job = claimNextGenerationJob();
    if (!job) return;
    await processGenerationJob(job);
  }
}

async function processGenerationJob(job: GenerationJobRecord) {
  try {
    if (job.kind === "generate") {
      const result = await generateFursonaResult(job.input as Parameters<typeof generateFursonaResult>[0]);
      const resultId = await persistGeneratedResult(job, result);
      completeGenerationJob(job.id, resultId);
      return;
    }

    const resultId = await persistRegeneratedImage(job);
    completeGenerationJob(job.id, resultId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成任务失败。";
    failGenerationJob(job.id, message);
  }
}

async function persistGeneratedResult(
  job: GenerationJobRecord,
  result: GenerateResponse,
) {
  const resultId = createGenerationResult({
    userId: job.userId,
    jobId: job.id,
    result,
  });

  await uploadAndRecordAsset({
    userId: job.userId,
    jobId: job.id,
    resultId,
    kind: "complete_scene",
    image: result.completeSceneImage,
  });
  await uploadAndRecordAsset({
    userId: job.userId,
    jobId: job.id,
    resultId,
    kind: "reference_sheet",
    image: result.referenceSheetImage,
  });

  return resultId;
}

async function persistRegeneratedImage(
  job: GenerationJobRecord,
) {
  if (!job.sourceResultId || !job.imageKind) {
    throw new Error("重绘任务参数不完整。");
  }

  const source = getResultForWorker(job.userId, job.sourceResultId);
  const prompt = getPromptForImageKind(source.prompts, job.imageKind);
  const image = await regenerateImage(prompt, (job.input as { aiSettings?: unknown }).aiSettings as never);

  await uploadAndRecordAsset({
    userId: job.userId,
    jobId: job.id,
    resultId: source.id,
    kind: job.imageKind,
    image,
  });

  return source.id;
}

async function uploadAndRecordAsset(
  {
    userId,
    jobId,
    resultId,
    kind,
    image,
  }: {
    userId: string;
    jobId: string;
    resultId: string;
    kind: ImageKind;
    image: string | null | undefined;
  },
) {
  if (!image) return;

  const uploaded = await uploadJobImage({
    userId,
    jobId,
    kind,
    image,
  });

  try {
    createGenerationAsset({
      userId,
      resultId,
      jobId,
      kind,
      storagePath: uploaded.storagePath,
      mimeType: uploaded.mimeType,
    });
  } catch (error) {
    await deleteStoredAsset(uploaded.storagePath);
    throw error;
  }
}

function getPromptForImageKind(prompts: GenerateResponse["prompts"], imageKind: ImageKind) {
  return imageKind === "complete_scene"
    ? prompts.complete_scene
    : withChineseReferenceSheetRules(prompts.reference_sheet);
}

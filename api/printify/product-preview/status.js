import {
  getHostedProductPreviewStatus,
  hostedPreviewError,
} from "../../../server/printify-preview-api.mjs";

export const maxDuration = 60;

export async function GET(request) {
  try {
    const taskId = new URL(request.url).searchParams.get("task_id");
    return Response.json(await getHostedProductPreviewStatus(taskId));
  } catch (error) {
    const { status, payload } = hostedPreviewError(error);
    return Response.json(payload, { status });
  }
}

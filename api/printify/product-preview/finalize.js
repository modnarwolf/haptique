import {
  finalizeHostedProductPreview,
  hostedPreviewError,
} from "../../../server/printify-preview-api.mjs";

export const maxDuration = 60;

export async function POST(request) {
  try {
    const body = await request.json();
    return Response.json(await finalizeHostedProductPreview(body?.taskId));
  } catch (error) {
    const { status, payload } = hostedPreviewError(error);
    return Response.json(payload, { status });
  }
}

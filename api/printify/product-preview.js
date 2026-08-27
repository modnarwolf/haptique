import {
  hostedPreviewError,
  startHostedProductPreview,
} from "../../server/printify-preview-api.mjs";

export const maxDuration = 60;

export async function POST(request) {
  try {
    const artwork = Buffer.from(await request.arrayBuffer());
    const preview = await startHostedProductPreview({ headers: request.headers, artwork });
    return Response.json(preview, { status: 202 });
  } catch (error) {
    const { status, payload } = hostedPreviewError(error);
    return Response.json(payload, { status });
  }
}

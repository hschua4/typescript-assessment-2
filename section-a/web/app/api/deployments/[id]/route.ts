import { type NextRequest, NextResponse } from "next/server";

// Mock data store - in production, this would be your database
const mockDeployments = new Map(
  Array.from({ length: 100 }, (_, i) => {
    const deployment = {
      id: `deploy-${i + 1}`,
      name: `${
        ["8JfpicWAW", "BCotKPg4n", "1i3VpKTef", "3meKh6Dve", "EdKwQTYgv"][i % 5]
      }`,
      status: ["ready", "building", "error"][Math.floor(Math.random() * 3)] as
        | "ready"
        | "building"
        | "error",
      branch: ["main", "develop", "feature/new-ui", "fix/bug-123"][i % 4],
      environment: ["production", "preview", "development"][i % 3] as
        | "production"
        | "preview"
        | "development",
      commit: Math.random().toString(36).substring(2, 9),
      createdAt: new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
      author: ["MaxLeiter", "aryamankha", "IdoPesok"][i % 3],
    };
    return [deployment.id, deployment];
  })
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Get the deployment from mock store
    const deployment = mockDeployments.get(id);

    if (!deployment) {
      return NextResponse.json(
        { error: "Deployment not found" },
        { status: 404 }
      );
    }

    // Update the deployment
    const updatedDeployment = {
      ...deployment,
      ...body,
    };

    mockDeployments.set(id, updatedDeployment);

    return NextResponse.json(updatedDeployment);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update deployment" },
      { status: 500 }
    );
  }
}

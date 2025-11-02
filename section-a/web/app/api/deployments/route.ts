import { type NextRequest, NextResponse } from "next/server";

// Mock data - replace with your actual database query
const mockDeployments = Array.from({ length: 100 }, (_, i) => ({
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
}));

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Parse query parameters
  const page = Number.parseInt(searchParams.get("page") || "0");
  const pageSize = Number.parseInt(searchParams.get("pageSize") || "10");
  const search = searchParams.get("search") || "";
  const sortBy = searchParams.get("sortBy") || "";
  const sortOrder = searchParams.get("sortOrder") || "asc";

  // Parse filters
  const statusFilter = searchParams.get("filter_status");
  const environmentFilter = searchParams.get("filter_environment");

  // Filter data
  let filteredData = [...mockDeployments];

  // Apply search
  if (search) {
    filteredData = filteredData.filter((item) =>
      Object.values(item).some((value) =>
        String(value).toLowerCase().includes(search.toLowerCase())
      )
    );
  }

  // Apply column filters
  if (statusFilter) {
    filteredData = filteredData.filter((item) => item.status === statusFilter);
  }
  if (environmentFilter) {
    filteredData = filteredData.filter(
      (item) => item.environment === environmentFilter
    );
  }

  // Apply sorting
  if (sortBy) {
    filteredData.sort((a, b) => {
      const aValue = a[sortBy as keyof typeof a];
      const bValue = b[sortBy as keyof typeof b];

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }

  // Calculate pagination
  const totalCount = filteredData.length;
  const pageCount = Math.ceil(totalCount / pageSize);
  const startIndex = page * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  return NextResponse.json({
    data: paginatedData,
    pageCount,
    totalCount,
  });
}

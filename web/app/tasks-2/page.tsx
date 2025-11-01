import { DataTable } from "./components/data-table";
import { NewTaskDialog } from "./components/new-task-dialog";

export default function Home() {
  return (
    <main className="min-h-screen bg-background p-6 md:p-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-semibold text-foreground mb-2">
              Tasks
            </h1>
            <p className="text-sm text-muted-foreground">
              Click on each of the table cell to update
            </p>
          </div>
          <NewTaskDialog />
        </div>

        <DataTable />
      </div>
    </main>
  );
}

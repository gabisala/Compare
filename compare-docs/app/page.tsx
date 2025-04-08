import { ThemeToggle } from "@/components/atoms/theme-toggle";
import { FileUploadContainer } from "@/components/organisms/file-upload-container";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b bg-background flex items-center justify-between p-4">
        <h1 className="text-2xl font-semibold">Compare Docs</h1>
        <div className="flex items-center gap-4">
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-grow flex flex-col p-6 items-center justify-center">
        <div className="w-full mx-auto space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold">Document Comparison Tool</h2>
            <p className="text-lg text-muted-foreground mt-2">
              Upload two documents to compare their differences side by side
            </p>
          </div>
          
          <FileUploadContainer />
        </div>
      </div>

      <footer className="border-t p-4 text-center text-sm text-muted-foreground">
        Document Comparison Tool &copy; {new Date().getFullYear()}
      </footer>
    </main>
  );
}

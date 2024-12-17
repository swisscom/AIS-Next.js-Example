"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type ProcessStatus = "idle" | "loading" | "success" | "error";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processStatus, setProcessStatus] = useState<ProcessStatus>("idle");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setSignedUrl(null);
    setError(null);
    setProcessStatus("idle");
  };

  const handleSignDocument = async () => {
    if (!selectedFile) {
      setError("No file selected.");
      return;
    }

    try {
      setProcessStatus("loading");
      setError(null);

      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/sign", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }

      const { url } = await response.json();
      setSignedUrl(url);
      setProcessStatus("success");
    } catch (err: unknown) {
      console.error("Error during signing:", err);
      const message = err instanceof Error ? err.message : "Unknown error occurred.";
      setError(message);
      setProcessStatus("error");
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">PDF Signer</CardTitle>
          <CardDescription>Upload and sign your PDF documents effortlessly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="fileInput">Choose a PDF to sign:</Label>
            <Input
              id="fileInput"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
            />
          </div>

          {selectedFile && (
            <div className="space-y-4">
              <div className="rounded border border-muted p-2">
                <ScrollArea className="h-96">
                  <Document file={selectedFile}>
                    <Page pageNumber={1} />
                  </Document>
                </ScrollArea>
              </div>
              <Button onClick={handleSignDocument} disabled={processStatus === "loading"}>
                {processStatus === "loading" ? "Signing..." : "Sign Document"}
              </Button>
            </div>
          )}

          {processStatus === "success" && signedUrl && (
            <Alert variant="default">
              <AlertTitle className="font-bold">Success!</AlertTitle>
              <AlertDescription>
                Your document has been successfully signed.{" "}
                <a
                  href={signedUrl}
                  download
                  className="underline text-blue-600 hover:text-blue-800"
                >
                  Download the Signed PDF
                </a>.
              </AlertDescription>
            </Alert>
          )}

          {processStatus === "error" && error && (
            <Alert variant="destructive">
              <AlertTitle className="font-bold">Error</AlertTitle>
              <AlertDescription>
                {error}
                <div className="mt-3">
                  <Button variant="outline" onClick={() => setProcessStatus("idle")}>
                    Retry
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

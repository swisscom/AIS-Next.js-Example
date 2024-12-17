"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
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
      const message =
        err instanceof Error ? err.message : "Unknown error occurred.";
      setError(message);
      setProcessStatus("error");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="fileInput">Choose a PDF to sign:</Label>
          <Input
            id="fileInput"
            type="file"
            onChange={handleFileChange}
            accept="application/pdf"
          />
        </div>

        {selectedFile && (
          <div className="space-y-4">
            <Document file={selectedFile}>
              <Page pageNumber={1} />
            </Document>
            <Button
              onClick={handleSignDocument}
              disabled={processStatus === "loading"}
            >
              {processStatus === "loading" ? "Signing..." : "Sign Document"}
            </Button>
          </div>
        )}

        {processStatus === "success" && signedUrl && (
          <div className="space-y-2">
            <p>Document signed successfully:</p>
            <a
              href={signedUrl}
              download
              className="text-blue-600 underline hover:text-blue-800"
            >
              Download Signed PDF
            </a>
          </div>
        )}

        {processStatus === "error" && error && (
          <div className="space-y-2 text-red-600">
            <p>Error: {error}</p>
            <Button variant="outline" onClick={() => setProcessStatus("idle")}>
              Retry
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

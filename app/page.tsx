"use client";

import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processStatus, setProcessStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setSignedUrl(null); // Reset signed URL when a new file is selected
    }
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
    } catch (error: any) {
      console.error("Error during signing:", error);
      setError(error.message || "Unknown error occurred.");
      setProcessStatus("error");
    }
  };

  return (
    <div className="container mx-auto mt-8">
      <input type="file" onChange={handleFileChange} />
      {selectedFile && (
        <div>
          <Document file={selectedFile}>
            <Page pageNumber={1} />
          </Document>
          <button
            onClick={handleSignDocument}
            disabled={processStatus === "loading"}
          >
            {processStatus === "loading" ? "Signing..." : "Sign Document"}
          </button>
        </div>
      )}
      {processStatus === "success" && signedUrl && (
        <div>
          <a href={signedUrl} download>
            Download Signed PDF
          </a>
        </div>
      )}
      {processStatus === "error" && error && (
        <div>
          <p>Error: {error}</p>
          <button onClick={() => setProcessStatus("idle")}>Retry</button>
        </div>
      )}
    </div>
  );
}

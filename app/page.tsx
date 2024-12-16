"use client";

import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const generateDigest = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);
  const hashBuffer = await crypto.subtle.digest("SHA-512", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return btoa(String.fromCharCode(...hashArray));
};

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [digest, setDigest] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processStatus, setProcessStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    try {
      setProcessStatus("loading");
      const generatedDigest = await generateDigest(file);
      setDigest(generatedDigest);
      setProcessStatus("idle");
    } catch (err) {
      console.error("Digest generation failed", err);
      setError("Failed to generate document digest.");
      setProcessStatus("error");
    }
  };

  const handleSignDocument = async () => {
  if (!digest) {
    setError("No digest available for signing.");
    return;
  }

  try {
    setProcessStatus("loading");
    setError(null);

    const response = await fetch("/api/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ digest }),
    });

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const { signature } = await response.json();
    setSignedUrl(`data:application/pkcs7-signature;base64,${signature}`);
    setProcessStatus("success");
  } catch (error: any) {
    console.error("Error during signing:", error);
    setError(error.message || "Unknown error occurred.");
    setProcessStatus("error");
  }
};


  if (processStatus === "loading") {
    return <div>Processing...</div>;
  }

  if (processStatus === "error") {
    return (
      <div>
        <p>Error: {error}</p>
        <button onClick={() => setProcessStatus("idle")}>Retry</button>
      </div>
    );
  }

  if (processStatus === "success" && signedUrl) {
    return (
      <div>
        <a href={signedUrl} download={`${selectedFile?.name}.p7s`}>
          Download Signed Document
        </a>
      </div>
    );
  }

  return (
    <div className="container mx-auto mt-8">
      <input type="file" onChange={handleFileChange} />
      {selectedFile && (
        <div>
          <Document file={selectedFile}>
            <Page pageNumber={1} />
          </Document>
          <button onClick={handleSignDocument} disabled={!digest}>
            Sign Document
          </button>
        </div>
      )}
    </div>
  );
};

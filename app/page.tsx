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
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    try {
      setStatus("loading");
      const generatedDigest = await generateDigest(file);
      setDigest(generatedDigest);
      setStatus("idle");
    } catch (err) {
      console.error("Digest generation failed", err);
      setError("Failed to generate document digest.");
      setStatus("error");
    }
  };

  const handleSignDocument = async () => {
    if (!digest || !selectedFile) {
      setError("No file or digest available for signing.");
      setStatus("error");
      return;
    }

    try {
      setStatus("loading");
      setError(null);

      const response = await fetch("https://ais.swisscom.com/AIS-Server/rs/v1.0/sign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          SignRequest: {
            "@Profile": "http://ais.swisscom.ch/1.1",
            OptionalInputs: {
              SignatureType: "urn:ietf:rfc:3369",
              ClaimedIdentity: { Name: "static-saphir4-ch" },
              DocumentHash: {
                "@Algorithm": "http://www.w3.org/2001/04/xmlenc#sha512",
                DigestValue: digest,
              },
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Sign API responded with status ${response.status}`);
      }

      const result = await response.json();
      const signatureData = result?.SignResponse?.SignatureObject?.Base64Signature;

      if (signatureData) {
        setSignedUrl(`data:application/pkcs7-signature;base64,${signatureData}`);
        setStatus("success");
      } else {
        throw new Error("No signature received in the response.");
      }
    } catch (err) {
      console.error("Signing failed", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred.");
      setStatus("error");
    }
  };

  if (status === "loading") {
    return <div>Processing...</div>;
  }

  if (status === "error") {
    return (
      <div>
        <p>Error: {error}</p>
        <button onClick={() => setStatus("idle")}>Retry</button>
      </div>
    );
  }

  if (status === "success" && signedUrl) {
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
}

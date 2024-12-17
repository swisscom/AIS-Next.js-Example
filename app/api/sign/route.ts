import axios from "axios";
import { randomUUID } from "crypto";
import fs from "fs";
import https from "https";
import { NextResponse } from "next/server";
import path from "path";
import {
  addSignaturePlaceholderToPdf,
  CertificationLevels,
  HashAlgorithms,
  pdfDigest,
  signPdf,
} from "pdf-signatures";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const originalFileName = file.name;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const tempPdfPath = path.join("/tmp", originalFileName);
    fs.writeFileSync(tempPdfPath, fileBuffer);

    const pdfWithPlaceholder = path.join(
      "/tmp",
      `placeholder_${originalFileName}`,
    );
    const placeholderOptions = {
      file: tempPdfPath,
      out: pdfWithPlaceholder,
      estimatedsize: 30000,
      certlevel: CertificationLevels.CertifiedNoChangesAllowed,
      reason: "Document approval",
      location: "Bern, Switzerland",
      contact: "contact@example.com",
      date: new Date().toISOString(),
    };
    await addSignaturePlaceholderToPdf(placeholderOptions);

    // const hashBuffer = await crypto.subtle.digest(
    //   "SHA-512",
    //   fs.readFileSync(pdfWithPlaceholder),
    // );
    // const digest = Buffer.from(hashBuffer).toString("base64");

    const tempFilePath = path.join("/tmp", originalFileName);
    fs.writeFileSync(tempFilePath, fileBuffer);

    const digest = await pdfDigest({
      file: tempFilePath,
      algorithm: HashAlgorithms.Sha512,
    });

    const agent = new https.Agent({
      key: fs.readFileSync(
        "/Users/taarujo6/Downloads/trade-signing-ssl/key.pem",
      ),
      cert: fs.readFileSync(
        "/Users/taarujo6/Downloads/trade-signing-ssl/cert.pem",
      ),
      rejectUnauthorized: false,
    });

    const signResponse = await axios.post(
      "https://ais.swisscom.com/AIS-Server/rs/v1.0/sign",
      {
        SignRequest: {
          "@Profile": "http://ais.swisscom.ch/1.1",
          "@RequestID": randomUUID(),
          InputDocuments: {
            DocumentHash: {
              "@ID": randomUUID(),
              "dsig.DigestMethod": {
                "@Algorithm": "http://www.w3.org/2001/04/xmlenc#sha512",
              },
              "dsig.DigestValue": digest,
            },
          },
          OptionalInputs: {
            AddTimestamp: {
              "@Type": "urn:ietf:rfc:3161",
            },
            AdditionalProfile: [
              "urn:oasis:names:tc:dss:1.0:profiles:timestamping",
            ],
            ClaimedIdentity: {
              Name: "ais-90days-trial:static-saphir4-1-eu",
            },
            SignatureType: "urn:ietf:rfc:3369",
            "sc.AddRevocationInformation": {
              "@Type": "BOTH",
            },
          },
        },
      },
      {
        httpsAgent: agent,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );

    const signature =
      signResponse.data?.SignResponse?.SignatureObject?.Base64Signature?.["$"];
    if (!signature) throw new Error("No signature received from AIS.");

    const signedFileName = `signed-${originalFileName}`;
    const signedDir = path.join(process.cwd(), "public", "signed");
    if (!fs.existsSync(signedDir)) {
      fs.mkdirSync(signedDir, { recursive: true });
    }
    const signedFilePath = path.join(signedDir, signedFileName);

    const signOptions = {
      file: pdfWithPlaceholder,
      out: signedFilePath,
      signature: signature,
    };
    await signPdf(signOptions);

    return NextResponse.json(
      { url: `/signed/${signedFileName}` },
      { status: 200 },
    );
  } catch (error) {
    console.error("Signing error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  }
}

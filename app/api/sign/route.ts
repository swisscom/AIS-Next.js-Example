import axios from "axios";
import { randomUUID } from "crypto";
import fs from "fs";
import https from "https";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { digest } = req.body;

  if (!digest) {
    return res.status(400).json({ error: "Digest is required." });
  }

  try {
    const agent = new https.Agent({
      key: fs.readFileSync("/path/to/key.pem"),
      cert: fs.readFileSync("/path/to/cert.pem"),
      rejectUnauthorized: false,
      keepAlive: true,
    });

    const response = await axios.post(
      "https://ais.swisscom.com/AIS-Server/rs/v1.0/sign",
      {
        "SignRequest": {
          "@Profile": "http://ais.swisscom.ch/1.1",
          "@RequestID": randomUUID,
          "InputDocuments": {
            "DocumentHash": {
              "@ID": randomUUID,
              "dsig.DigestMethod": {
                "@Algorithm": "http://www.w3.org/2001/04/xmlenc#sha512",
              },
              "dsig.DigestValue": digest,
            },
          },
          "OptionalInputs": {
            "AddTimestamp": {
              "@Type": "urn:ietf:rfc:3161"
            },
            "AdditionalProfile": [
              "http://ais.swisscom.ch/1.0/profiles/batchprocessing",
              "urn:oasis:names:tc:dss:1.0:profiles:timestamping"
            ],
            "ClaimedIdentity": {
              "Name": "ais-90days-trial:static-saphir4-1-eu"
            },
            "SignatureType": "urn:ietf:rfc:3369",
            "sc.AddRevocationInformation": {
              "@Type": "BOTH"
            }
          },
        },
      },
      {
        httpsAgent: agent,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    const result = response.data;
    const signature = result?.SignResponse?.SignatureObject?.Base64Signature;

    if (signature) {
      res.status(200).json({ signature });
    } else {
      throw new Error("No signature received from AIS.");
    }
  } catch (error: any) {
    console.error("Signing error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}

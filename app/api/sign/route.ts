import axios from "axios";
import { randomUUID } from "crypto";
import fs from "fs";
import https from "https";

export async function POST(request: Request) {
  const { digest } = await request.json();

  if (!digest) {
    return new Response(JSON.stringify({ error: "Digest is required." }), { status: 400 });
  }

  try {
    const agent = new https.Agent({
      key: fs.readFileSync("/Users/taarujo6/Downloads/trade-signing-ssl/key.pem"),
      cert: fs.readFileSync("/Users/taarujo6/Downloads/trade-signing-ssl/cert.pem"),
      rejectUnauthorized: false,
      keepAlive: true,
    });

    const response = await axios.post(
      "https://ais.swisscom.com/AIS-Server/rs/v1.0/sign",
      {
        "SignRequest": {
          "@Profile": "http://ais.swisscom.ch/1.1",
          "@RequestID": randomUUID(),
          "InputDocuments": {
            "DocumentHash": {
              "@ID": randomUUID(),
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


    const signature = response.data?.SignResponse?.SignatureObject?.Base64Signature["$"];

    if (signature) {
      return new Response(JSON.stringify({ signature }), { status: 200 });
    } else {
      throw new Error("No signature received from AIS.");
    }
  } catch (error) {
    console.error("Signing error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}
